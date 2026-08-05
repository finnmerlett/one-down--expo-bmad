import { eq } from 'drizzle-orm';

import type { BreakdownMode, SubtaskData, TaskData } from '@one-down/shared';
import { tasks } from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { awardSubtaskStars } from '@/services/star-awards';
import {
  createSubtasks,
  deleteSubtask,
  replaceUncompletedSubtasks,
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

/** Accept a breakdown proposal (AC3): save the steps, then report the save. */
export function acceptBreakdown(taskId: string, steps: string[], mode: BreakdownMode): void {
  void createSubtasks(db, taskId, steps, 'ai')
    .then((created) => {
      track('breakdown_accepted', { step_count: created.length, mode, via: 'initial' });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Breakdown accept failed', error));
}

/**
 * Accept a REFINED proposal (Story 6.4, AC4): swap only the uncompleted
 * subtasks — completed ones are never modified (UX-DR7).
 */
export function acceptRefinedBreakdown(taskId: string, steps: string[], mode: BreakdownMode): void {
  void replaceUncompletedSubtasks(db, taskId, steps, 'ai')
    .then(({ insertedCount }) => {
      track('breakdown_accepted', { step_count: insertedCount, mode, via: 'refine' });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Refined breakdown accept failed', error));
}
