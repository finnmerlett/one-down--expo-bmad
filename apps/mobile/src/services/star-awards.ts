import { and, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { STAR_WEIGHTS, type StarAction, type SubtaskData, type TaskData } from '@one-down/shared';
import { starActivityLog, tasks } from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';
import { calculateCompletionStars, type StarBreakdown } from '@/services/star-calculator';
import type { TasksDb } from '@/services/tasks-repository';

/**
 * Star award persistence (Story 4.1) — writes signed transactions to the
 * local `star_activity_log` ledger. db injected like tasks-repository so
 * integration tests run the real schema. Persistence failures never block
 * the task action (AC7): warn, still return the amount for the toast.
 */

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
    base: breakdown.base,
    urgency_bonus: breakdown.urgencyBonus,
    size_bonus: breakdown.sizeBonus,
    early_bonus: breakdown.earlyBonus,
  });
}

/**
 * Award stars for completing a task (FR43–46): selects the active set itself
 * (relative urgency ranks against the user's whole backlog), runs the pure
 * calculator, persists the transaction, and returns the breakdown for the
 * completion toast.
 */
export async function awardCompletionStars(
  db: TasksDb,
  task: TaskData,
  now = new Date(),
): Promise<StarBreakdown> {
  // The calculator dedupes `task` by id, so it counts whether or not the
  // completion write has already landed when this select runs.
  const activeTasks = await db
    .select()
    .from(tasks)
    .where(inArray(tasks.status, ['pending', 'in_progress']))
    // oxlint-disable-next-line no-console
    .catch((error: unknown): TaskData[] => (console.warn('Star award select failed', error), []));
  const breakdown = calculateCompletionStars(task, activeTasks, now);
  try {
    await insertAward(
      db,
      { taskId: task.id, taskTitle: task.title, action: 'task_completed' },
      breakdown,
      now,
    );
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award insert failed', error);
  }
  return breakdown;
}

/**
 * Signed subtask transaction (Story 6.3, AC5). Completing earns the small
 * `subtaskCompleted` weight; unticking reverses it (negative
 * `subtask_completed` row); deleting a COMPLETED subtask reverses via a
 * negative `subtask_deleted` row. The ledger is append-only — reversals are
 * new signed rows, never edits. Title snapshot = the subtask's own title
 * (display only, never analytics — NFR-S3).
 */
export async function awardSubtaskStars(
  db: TasksDb,
  subtask: SubtaskData,
  action: 'subtask_completed' | 'subtask_deleted',
  direction: 1 | -1,
): Promise<number> {
  const amount = direction * STAR_WEIGHTS.subtaskCompleted;
  const breakdown: StarBreakdown = {
    base: amount,
    urgencyBonus: 0,
    sizeBonus: 0,
    earlyBonus: 0,
    total: amount,
  };
  try {
    await insertAward(
      db,
      { taskId: subtask.taskId, taskTitle: subtask.title, action },
      breakdown,
      new Date(),
    );
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award insert failed', error);
  }
  return amount;
}

/**
 * Award the flat review-confirmation amount (Story 6.2, AC7) — one small star
 * per confirmed item (tick or edit-confirm). One award per flag, ever: the
 * repository reports a cleared flag exactly once by construction.
 */
export async function awardReviewConfirmStars(db: TasksDb, task: TaskData): Promise<number> {
  const amount = STAR_WEIGHTS.triageConfirmed;
  const breakdown: StarBreakdown = {
    base: amount,
    urgencyBonus: 0,
    sizeBonus: 0,
    earlyBonus: 0,
    total: amount,
  };
  try {
    await insertAward(
      db,
      { taskId: task.id, taskTitle: task.title, action: 'triage_confirmed' },
      breakdown,
      new Date(),
    );
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award insert failed', error);
  }
  return amount;
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
  const breakdown: StarBreakdown = {
    base: -amount,
    urgencyBonus: 0,
    sizeBonus: 0,
    earlyBonus: 0,
    total: -amount,
  };
  try {
    await insertAward(
      db,
      { taskId: task.id, taskTitle: task.title, action: 'archive_retraction' },
      breakdown,
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
 * completion awards only.
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
      const breakdown: StarBreakdown = {
        base: -remaining,
        urgencyBonus: 0,
        sizeBonus: 0,
        earlyBonus: 0,
        total: -remaining,
      };
      await insertAward(
        db,
        { taskId: task.id, taskTitle: task.title, action: 'completion_undone' },
        breakdown,
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
 * Award the flat cut-loose amount (FR66) — releasing is rewarded too, just
 * less than completing. Returns the amount for the "Released" toast.
 */
export async function awardCutLooseStars(db: TasksDb, task: TaskData): Promise<number> {
  const amount = STAR_WEIGHTS.cutLoose;
  const breakdown: StarBreakdown = {
    base: amount,
    urgencyBonus: 0,
    sizeBonus: 0,
    earlyBonus: 0,
    total: amount,
  };
  try {
    await insertAward(
      db,
      { taskId: task.id, taskTitle: task.title, action: 'task_cut_loose' },
      breakdown,
      new Date(),
    );
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Star award insert failed', error);
  }
  return amount;
}
