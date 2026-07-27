import { eq } from 'drizzle-orm';

import type { TaskData } from '@one-down/shared';
import { tasks } from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';
import { removeCompletionAward, removeCutLooseAward } from '@/services/star-awards';
import { setTaskStatus, type TasksDb } from '@/services/tasks-repository';

/**
 * The status check must read the DB, not the caller's task object: the
 * toast-undo path closes over a task snapshot taken BEFORE the terminal
 * write landed, so its `status` is stale by the time Undo is tapped.
 */
async function freshStatus(db: TasksDb, taskId: string): Promise<string | undefined> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId));
  return rows[0]?.status;
}

/**
 * Undo a completion — from the Done list (2026-07-27) or the reward toast's
 * Undo button (same day): the task returns to `pending` and the completion's
 * award is REMOVED from the ledger (owner decision: an undone completion
 * leaves no trace in the history list, rather than an award + negative
 * pair). Awaited like the task-archive orchestrations — the toast needs the
 * removed amount. Removal runs FIRST: its sum-based "outstanding credit"
 * makes a retry after a failed status write safe (nothing left to remove),
 * whereas status-first + failed removal would let re-completing
 * double-award.
 */
export async function undoTaskCompletion(
  db: TasksDb,
  task: Pick<TaskData, 'id' | 'title'>,
): Promise<{ starsRemoved: number }> {
  if ((await freshStatus(db, task.id)) !== 'completed') return { starsRemoved: 0 };
  const starsRemoved = await removeCompletionAward(db, task);
  await setTaskStatus(db, task.id, 'pending');
  track('task_completion_undone', { stars_removed: starsRemoved });
  return { starsRemoved };
}

/**
 * Undo a cut loose from its reward toast (2026-07-27): the task returns to
 * `pending` and the release's award row is removed — the same no-trace
 * semantics and removal-first ordering as undoTaskCompletion.
 */
export async function undoTaskCutLoose(
  db: TasksDb,
  task: Pick<TaskData, 'id' | 'title'>,
): Promise<{ starsRemoved: number }> {
  if ((await freshStatus(db, task.id)) !== 'cut_loose') return { starsRemoved: 0 };
  const starsRemoved = await removeCutLooseAward(db, task);
  await setTaskStatus(db, task.id, 'pending');
  track('task_cut_loose_undone', { stars_removed: starsRemoved });
  return { starsRemoved };
}
