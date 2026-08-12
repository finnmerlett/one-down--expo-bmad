import { and, eq, inArray, sql } from 'drizzle-orm';
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
    const allTasks = await db.select().from(tasks);
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
        and(eq(tasks.hasCheckNeeded, true), inArray(tasks.status, ['pending', 'in_progress'])),
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
 * Remove a completion's award when a Done task is flipped back to To do
 * (undo-complete, revised same-day by owner decision): DELETE the award
 * row(s) instead of writing a negative `completion_undone` row, so an undone
 * completion leaves no trace in the activity log. This is a deliberate,
 * owner-requested exception to the append-only ledger rule — scoped to
 * completion awards only. Banked step rows are untouched — undoing the
 * completion restores the banked state exactly (ambiguity #6).
 *
 * Mechanics: the outstanding completion credit is the signed sum of
 * `task_completed` + `completion_undone` rows (legacy negative rows from the
 * first undo iteration still count). Newest award rows are deleted first
 * until the credit is consumed; any residual mismatch (odd legacy states)
 * falls back to ONE negative row so totals stay exact no matter what.
 * Subtask/triage stars are untouched. Returns the amount removed for the
 * toast; failures are swallowed like every other ledger write (4.1 AC7).
 */
export async function removeCompletionAward(
  db: TasksDb,
  task: Pick<TaskData, 'id' | 'title'>,
): Promise<number> {
  const rows = await db
    .select()
    .from(starActivityLog)
    .where(
      and(
        eq(starActivityLog.taskId, task.id),
        inArray(starActivityLog.action, ['task_completed', 'completion_undone']),
      ),
    );
  const outstanding = rows.reduce((sum, row) => sum + row.amount, 0);
  if (outstanding <= 0) return 0;

  let remaining = outstanding;
  const toDelete: string[] = [];
  const completions = rows
    .filter((row) => row.action === 'task_completed')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const row of completions) {
    if (remaining === 0) break;
    if (row.amount > 0 && row.amount <= remaining) {
      toDelete.push(row.id);
      remaining -= row.amount;
    }
  }

  try {
    if (toDelete.length > 0) {
      await db.delete(starActivityLog).where(inArray(starActivityLog.id, toDelete));
    }
    if (remaining > 0) {
      await insertAward(
        db,
        { taskId: task.id, taskTitle: task.title, action: 'completion_undone' },
        zeroBreakdown(-remaining),
        new Date(),
      );
    }
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award removal failed', error);
  }
  return outstanding;
}

/**
 * Remove a cut-loose award when the release is undone from its toast
 * (2026-07-27): DELETE the newest positive `task_cut_loose` row — the same
 * owner-approved exception to the append-only ledger as
 * removeCompletionAward, scoped to accidental-action undo. Returns the
 * removed amount (0 when no award row exists); failures are swallowed like
 * every other ledger write (4.1 AC7).
 */
export async function removeCutLooseAward(
  db: TasksDb,
  task: Pick<TaskData, 'id'>,
): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(starActivityLog)
      .where(
        and(eq(starActivityLog.taskId, task.id), eq(starActivityLog.action, 'task_cut_loose')),
      );
    const newest = rows
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!newest) return 0;
    await db.delete(starActivityLog).where(eq(starActivityLog.id, newest.id));
    return newest.amount;
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award removal failed', error);
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
