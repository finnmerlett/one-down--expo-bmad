import type { TaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { netStarsByTask, retractTaskStars } from '@/services/star-awards';
import {
  archiveTasks,
  deleteTasksPermanently,
  restoreTask,
  type TasksDb,
} from '@/services/tasks-repository';

/**
 * Bulk archive / permanent delete orchestration (Story 7.1). db injected like
 * tasks-repository so integration tests run the real schema; screens await
 * these for toast copy (count + stars removed), unlike the fire-and-forget
 * task-edits wrappers.
 */

/**
 * AC2/AC3 (pure): archiving warns when any selected task was started or
 * completed, OR carries net positive stars (defensive: covers subtask stars
 * on tasks whose status is still `pending`).
 */
export function needsArchiveWarning(tasks: TaskData[], netStars: Map<string, number>): boolean {
  return tasks.some(
    (task) =>
      task.status === 'in_progress' ||
      task.status === 'completed' ||
      (netStars.get(task.id) ?? 0) > 0,
  );
}

/**
 * Archive the selection (Story 7.1, AC2/AC3): per task with net positive
 * stars, insert ONE negative `archive_retraction` ledger row for the full
 * net, then flip every task to `archived`. Returns the totals for the
 * confirmation toast. `warned` is analytics context only (whether the star
 * warning dialog was shown and confirmed).
 */
export async function archiveSelection(
  db: TasksDb,
  tasks: TaskData[],
  { warned }: { warned: boolean },
): Promise<{ count: number; starsRemoved: number }> {
  const net = await netStarsByTask(
    db,
    tasks.map((task) => task.id),
  );
  let starsRemoved = 0;
  for (const task of tasks) {
    const amount = net.get(task.id) ?? 0;
    if (amount > 0) {
      await retractTaskStars(db, task, amount);
      starsRemoved += amount;
    }
  }
  await archiveTasks(
    db,
    tasks.map((task) => task.id),
  );
  track('tasks_archived', { count: tasks.length, stars_removed: starsRemoved, warned });
  return { count: tasks.length, starsRemoved };
}

/**
 * Restore one task from the recycle bin (AC6): back to `pending`; previously
 * removed stars stay removed (no reverse tracking — kept simple by design).
 */
export async function restoreFromBin(db: TasksDb, task: TaskData): Promise<void> {
  await restoreTask(db, task.id);
  track('task_restored', { from: 'recycle_bin' });
}

/** Permanently delete the selection from the bin (AC5). Returns the count for the toast. */
export async function deleteSelection(db: TasksDb, ids: string[]): Promise<number> {
  await deleteTasksPermanently(db, ids);
  track('tasks_deleted_permanently', { count: ids.length });
  return ids.length;
}
