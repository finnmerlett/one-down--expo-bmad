import { eq } from 'drizzle-orm';

import type { SubtaskData, TaskData } from '@one-down/shared';
import { tasks } from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { awardSubtaskStars } from '@/services/star-awards';
import {
  createSubtasks,
  deleteSubtask,
  renameSubtask,
  reorderSubtasks,
  restoreSubtask,
  setSubtaskCompleted,
} from '@/services/subtasks-repository';

// Fire-and-forget subtask actions (Story 6.3), mirroring task-edits.ts:
// module-scoped db writes survive screen unmounts; stars/analytics only after
// the write actually changed something.

// Banking needs the parent task's size (v1.5: 1★/step quick win, 2★ big
// time, capped) — read it fresh so a size edit mid-session banks correctly.
async function parentTask(taskId: string): Promise<Pick<TaskData, 'id' | 'size'> | null> {
  const [row] = await db
    .select({ id: tasks.id, size: tasks.size })
    .from(tasks)
    .where(eq(tasks.id, taskId));
  return row ?? null;
}

/**
 * Tick/untick a subtask (AC4/AC5). The repository's changed-guard makes the
 * banking delta exactly-once per real state change — a stale double tap
 * banks nothing.
 */
export function toggleSubtask(subtask: SubtaskData): void {
  const next = !subtask.completed;
  void setSubtaskCompleted(db, subtask.id, next)
    .then(async (changed) => {
      if (!changed) return;
      const task = await parentTask(subtask.taskId);
      if (task) {
        await awardSubtaskStars(db, task, subtask, 'subtask_completed', next ? 1 : -1);
      }
      track('subtask_completed', { source: subtask.source, reversed: !next });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Subtask toggle failed', error));
}

/**
 * Delete a subtask (AC4/AC5): a COMPLETED one un-banks its stars via the
 * delta accounting; an incomplete one banks/reverses nothing.
 */
export function removeSubtask(subtask: SubtaskData): void {
  void deleteSubtask(db, subtask.id)
    .then(async (deleted) => {
      if (!deleted) return;
      if (deleted.completed) {
        const task = await parentTask(subtask.taskId);
        if (task) {
          await awardSubtaskStars(db, task, subtask, 'subtask_deleted', -1);
        }
      }
      track('subtask_deleted', { was_completed: deleted.completed });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Subtask delete failed', error));
}

/** Restore a deleted step from the undo toast (D4): the row comes back
 *  verbatim; a completed one re-banks its stars via the delta accounting. */
export function restoreStep(subtask: SubtaskData): void {
  void restoreSubtask(db, subtask)
    .then(async () => {
      if (subtask.completed) {
        const task = await parentTask(subtask.taskId);
        if (task) {
          await awardSubtaskStars(db, task, subtask, 'subtask_completed', 1);
        }
      }
      track('subtask_delete_undone', { was_completed: subtask.completed });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Subtask restore failed', error));
}

/** Rewrite a step in place (D4 edit mode). Blank/identical text is a no-op. */
export function renameStep(subtask: SubtaskData, title: string): void {
  void renameSubtask(db, subtask.id, title)
    .then((changed) => {
      if (changed) track('subtask_renamed', {});
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Subtask rename failed', error));
}

/** Add a hand-typed step at the end of the list (D4 edit mode). */
export function addStep(taskId: string, title: string): void {
  void createSubtasks(db, taskId, [title], 'manual')
    .then((created) => {
      if (created.length > 0) track('subtask_added', { source: 'manual' });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Subtask add failed', error));
}

/** Persist a drag-to-reorder (D4 edit mode). */
export function reorderSteps(taskId: string, orderedIds: string[], from: number, to: number): void {
  void reorderSubtasks(db, taskId, orderedIds)
    .then(() => {
      track('subtask_reordered', { from, to });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Subtask reorder failed', error));
}
