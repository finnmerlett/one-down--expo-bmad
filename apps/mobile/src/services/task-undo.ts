import type { TaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { removeCompletionAward } from '@/services/star-awards';
import { setTaskStatus, type TasksDb } from '@/services/tasks-repository';

/**
 * Undo a completion from the Done list (2026-07-27): the task returns to
 * `pending` and the completion's award is REMOVED from the ledger (owner
 * decision: an undone completion leaves no trace in the history list, rather
 * than an award + negative pair). Awaited like the task-archive
 * orchestrations — the toast needs the removed amount. Removal runs FIRST:
 * its sum-based "outstanding credit" makes a retry after a failed status
 * write safe (nothing left to remove), whereas status-first + failed removal
 * would let re-completing double-award.
 */
export async function undoTaskCompletion(
  db: TasksDb,
  task: TaskData,
): Promise<{ starsRemoved: number }> {
  if (task.status !== 'completed') return { starsRemoved: 0 };
  const starsRemoved = await removeCompletionAward(db, task);
  await setTaskStatus(db, task.id, 'pending');
  track('task_completion_undone', { stars_removed: starsRemoved });
  return { starsRemoved };
}
