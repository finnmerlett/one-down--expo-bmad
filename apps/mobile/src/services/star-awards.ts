import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { STAR_WEIGHTS, type StarAction, type TaskData } from '@one-down/shared';
import { starActivityLog, taskOffers, tasks } from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';
import { assignBadges } from '@/services/curation';
import {
  calculateCompletionStars,
  type StarBadge,
  type StarBreakdown,
} from '@/services/star-calculator';
import type { TasksDb } from '@/services/tasks-repository';

/**
 * Star award persistence — writes signed transactions to the local
 * `star_activity_log` ledger. Banked stars are COSMETIC (2026-08-11 item 7):
 * step ticks write nothing here — the banked indicator derives live from
 * completed-step counts (useBankedStars/bankedForCount) — and the pot pays
 * in full (value + live badge) only when a task completes. LEGACY
 * subtask rows from the earlier bank-as-you-go economy still convert at
 * completion (value + badge − banked, floored 0), so no device is ever
 * double-credited.
 *
 * db injected like tasks-repository so integration tests run the real
 * schema. Persistence failures never block the task action (4.1 AC7): warn,
 * still return the amount for the toast.
 */

function zeroBreakdown(total: number): StarBreakdown {
  return { value: total, bonus: 0, banked: 0, total };
}

async function insertAward(
  db: TasksDb,
  entry: { taskId: string; taskTitle: string; action: StarAction },
  breakdown: StarBreakdown,
  now: Date,
): Promise<void> {
  await db.insert(starActivityLog).values({
    // expo-crypto, NOT global crypto.randomUUID() (unreliable under Hermes)
    id: randomUUID(),
    taskId: entry.taskId,
    taskTitle: entry.taskTitle,
    action: entry.action,
    amount: breakdown.total,
    createdAt: now,
  });
  // After a successful write only — amounts and action, never task text (NFR-S3).
  track('stars_awarded', {
    action: entry.action,
    amount: breakdown.total,
    value: breakdown.value,
    bonus: breakdown.bonus,
    banked_converted: breakdown.banked,
  });
}

/** Net stars already banked on a task's steps — the signed sum of its
 *  subtask ledger rows. Ledger-based (not recomputed from current subtasks)
 *  so the conversion repays exactly what was actually paid out, whatever
 *  economy or caps were live when the rows were written. */
export async function bankedNetForTask(db: TasksDb, taskId: string): Promise<number> {
  const rows = await db
    .select({ net: sql<number>`coalesce(sum(${starActivityLog.amount}), 0)` })
    .from(starActivityLog)
    .where(
      and(
        eq(starActivityLog.taskId, taskId),
        inArray(starActivityLog.action, ['subtask_completed', 'subtask_deleted']),
      ),
    );
  return rows[0]?.net ?? 0;
}

/**
 * Award stars for completing a task — the v1.5 conversion: value + live
 * badge − already-banked, floored at 0. Reads the banked net and any live
 * offer itself, persists the transaction, clears the consumed offer, and
 * returns the breakdown for the completion toast.
 */
export async function awardCompletionStars(
  db: TasksDb,
  task: TaskData,
  now = new Date(),
): Promise<StarBreakdown> {
  let banked = 0;
  let badge: StarBadge | null = null;
  try {
    banked = await bankedNetForTask(db, task.id);
    // 9-5 item 16: the payout follows the GLOBAL badge assignment — a card
    // that lost the urgency race displayed no badge, so it pays none. The
    // completing task rides in as its pre-completion snapshot (the status
    // write may already have landed, which would drop it from eligibility).
    const allTasks = await db.select().from(tasks).where(isNull(tasks.deletedAt));
    const offerRows = await db.select().from(taskOffers);
    const offersMap = new Map(offerRows.map((row) => [row.taskId, row.amount]));
    const snapshot = [...allTasks.filter((row) => row.id !== task.id), task];
    badge = assignBadges(snapshot, offersMap, now).get(task.id) ?? null;
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award context read failed', error);
  }
  const breakdown = calculateCompletionStars(task, { bankedStars: banked, badge, now });
  try {
    await insertAward(
      db,
      { taskId: task.id, taskTitle: task.title, action: 'task_completed' },
      breakdown,
      now,
    );
    // A consumed offer never lingers (it would block new offers globally).
    await db.delete(taskOffers).where(eq(taskOffers.taskId, task.id));
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award insert failed', error);
  }
  return breakdown;
}

/**
 * v1.5 triage pay (Row E): confirming cards pays nothing per card —
 * emptying the queue pays `triageQueueCleared`, at most once per local day.
 * Callers invoke this after any confirm; it self-gates on (a) the queue
 * actually being empty and (b) no queue-clear award yet today. Returns the
 * amount awarded (0 = gated).
 */
export async function maybeAwardTriageQueueCleared(db: TasksDb, now = new Date()): Promise<number> {
  try {
    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.hasCheckNeeded, true),
          inArray(tasks.status, ['pending', 'in_progress']),
          isNull(tasks.deletedAt),
        ),
      );
    if ((pending?.count ?? 0) > 0) return 0;

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const todays = await db
      .select({ id: starActivityLog.id, createdAt: starActivityLog.createdAt })
      .from(starActivityLog)
      .where(eq(starActivityLog.action, 'triage_confirmed'));
    if (todays.some((row) => row.createdAt.getTime() >= dayStart.getTime())) return 0;

    const amount = STAR_WEIGHTS.triageQueueCleared;
    await insertAward(
      db,
      // Queue-level award — no single task owns it; title is display copy.
      { taskId: '', taskTitle: 'Cleared the queue', action: 'triage_confirmed' },
      zeroBreakdown(amount),
      now,
    );
    return amount;
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award insert failed', error);
    return 0;
  }
}

/**
 * Net star sum per task over the whole ledger (Story 7.1) — signed, so prior
 * retractions/reversals count. Tasks with no rows are simply absent from the
 * map (treat as 0).
 */
export async function netStarsByTask(db: TasksDb, taskIds: string[]): Promise<Map<string, number>> {
  if (taskIds.length === 0) return new Map();
  const rows = await db
    .select({
      taskId: starActivityLog.taskId,
      net: sql<number>`sum(${starActivityLog.amount})`,
    })
    .from(starActivityLog)
    .where(inArray(starActivityLog.taskId, taskIds))
    .groupBy(starActivityLog.taskId);
  const net = new Map<string, number>();
  for (const row of rows) {
    if (row.taskId !== null) net.set(row.taskId, row.net);
  }
  return net;
}

/**
 * Retract a task's earned stars at archive time (Story 7.1, AC2): one
 * negative `archive_retraction` transaction for the full net amount. The
 * ledger stays append-only — a retraction is a new signed row, never an
 * edit. Throws are swallowed like every other award write (persistence
 * failures never block the task action, 4.1 AC7).
 */
export async function retractTaskStars(
  db: TasksDb,
  task: Pick<TaskData, 'id' | 'title'>,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  try {
    await insertAward(
      db,
      { taskId: task.id, taskTitle: task.title, action: 'archive_retraction' },
      zeroBreakdown(-amount),
      new Date(),
    );
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star retraction insert failed', error);
  }
}

/**
 * Reverse a completion's award when a Done task is flipped back to To do
 * (undo-complete; 9.7 convention pass): write ONE negative
 * `completion_undone` compensating row for the full outstanding credit —
 * the ledger convention (append-only, corrections are new entries). The
 * "undo leaves no trace" UX lives in the DISPLAY layer now: the activity
 * feed collapses same-local-day do/undo pairs (star-ledger-display.ts);
 * cross-day undos stay visible as honest history (owner ruling 2026-08-15).
 * Banked step rows are untouched — undoing the completion restores the
 * banked state exactly (ambiguity #6).
 *
 * Outstanding credit = the signed sum of the task's completion-family rows,
 * so a retried undo (after a failed status write) finds 0 and no-ops —
 * totals stay exact no matter what. Subtask/triage stars are untouched.
 * Returns the amount reversed for the toast; failures are swallowed like
 * every other ledger write (4.1 AC7).
 */
export async function removeCompletionAward(
  db: TasksDb,
  task: Pick<TaskData, 'id' | 'title'>,
): Promise<number> {
  const rows = await db
    .select({ net: sql<number>`coalesce(sum(${starActivityLog.amount}), 0)` })
    .from(starActivityLog)
    .where(
      and(
        eq(starActivityLog.taskId, task.id),
        inArray(starActivityLog.action, ['task_completed', 'completion_undone']),
      ),
    );
  const outstanding = rows[0]?.net ?? 0;
  if (outstanding <= 0) return 0;

  try {
    await insertAward(
      db,
      { taskId: task.id, taskTitle: task.title, action: 'completion_undone' },
      zeroBreakdown(-outstanding),
      new Date(),
    );
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award reversal failed', error);
  }
  return outstanding;
}

/**
 * Reverse a cut-loose award when the release is undone from its toast —
 * same compensating-entry pattern as removeCompletionAward (9.7 convention
 * pass): one negative `cut_loose_undone` row for the outstanding release
 * credit, display-layer collapse hides same-day pairs. Returns the amount
 * reversed (0 when nothing is outstanding); failures are swallowed like
 * every other ledger write (4.1 AC7).
 */
export async function removeCutLooseAward(
  db: TasksDb,
  task: Pick<TaskData, 'id' | 'title'>,
): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(starActivityLog)
      .where(
        and(
          eq(starActivityLog.taskId, task.id),
          inArray(starActivityLog.action, ['task_cut_loose', 'cut_loose_undone']),
        ),
      );
    const outstanding = rows.reduce((sum, row) => sum + row.amount, 0);
    if (outstanding <= 0) return 0;
    // One release is undone at a time — reverse the NEWEST award's amount
    // (what was actually paid, whatever the weights were), capped by the
    // outstanding credit so weird legacy states can't overdraw.
    const newest = rows
      .filter((row) => row.action === 'task_cut_loose' && row.amount > 0)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!newest) return 0;
    const amount = Math.min(newest.amount, outstanding);
    await insertAward(
      db,
      { taskId: task.id, taskTitle: task.title, action: 'cut_loose_undone' },
      zeroBreakdown(-amount),
      new Date(),
    );
    return amount;
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award reversal failed', error);
    return 0;
  }
}

/**
 * Award the flat cut-loose amount (FR66) — releasing is rewarded too, just
 * less than completing. Returns the amount for the "Released" toast.
 */
export async function awardCutLooseStars(db: TasksDb, task: TaskData): Promise<number> {
  const amount = STAR_WEIGHTS.cutLoose;
  try {
    await insertAward(
      db,
      { taskId: task.id, taskTitle: task.title, action: 'task_cut_loose' },
      zeroBreakdown(amount),
      new Date(),
    );
    // A released card's offer dies with it.
    await db.delete(taskOffers).where(eq(taskOffers.taskId, task.id));
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award insert failed', error);
  }
  return amount;
}
