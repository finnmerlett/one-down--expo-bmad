import type { TaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { retractCompletionStars } from '@/services/star-awards';
import { setTaskStatus, type TasksDb } from '@/services/tasks-repository';

/**
 * Undo a completion from the Done list (2026-07-27): the task returns to
 * `pending` and the completion's outstanding star credit is retracted as one
 * negative `completion_undone` ledger row (append-only, same shape as the
 * archive retraction). Awaited like the task-archive orchestrations — the
 * toast needs the removed amount. Retraction runs FIRST: its sum-based
 * "outstanding credit" makes a retry after a failed status write safe (it
 * finds nothing left to retract), whereas status-first + failed retraction
 * would let re-completing double-award.
 */
export async function undoTaskCompletion(
  db: TasksDb,
  task: TaskData,
): Promise<{ starsRemoved: number }> {
  if (task.status !== 'completed') return { starsRemoved: 0 };
  const starsRemoved = await retractCompletionStars(db, task);
  await setTaskStatus(db, task.id, 'pending');
  track('task_completion_undone', { stars_removed: starsRemoved });
  return { starsRemoved };
}
