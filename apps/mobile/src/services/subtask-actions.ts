import type { BreakdownMode, SubtaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { awardSubtaskStars } from '@/services/star-awards';
import { createSubtasks, deleteSubtask, setSubtaskCompleted } from '@/services/subtasks-repository';

// Fire-and-forget subtask actions (Story 6.3), mirroring task-edits.ts:
// module-scoped db writes survive screen unmounts; stars/analytics only after
// the write actually changed something.

/**
 * Tick/untick a subtask (AC4/AC5). The repository's changed-guard makes the
 * star award/reversal exactly-once per real state change — a stale double tap
 * awards nothing.
 */
export function toggleSubtask(subtask: SubtaskData): void {
  const next = !subtask.completed;
  void setSubtaskCompleted(db, subtask.id, next)
    .then(async (changed) => {
      if (!changed) return;
      await awardSubtaskStars(db, subtask, 'subtask_completed', next ? 1 : -1);
      track('subtask_completed', { source: subtask.source, reversed: !next });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Subtask toggle failed', error));
}

/**
 * Delete a subtask (AC4/AC5): a COMPLETED one reverses its earned star; an
 * incomplete one awards/reverses nothing.
 */
export function removeSubtask(subtask: SubtaskData): void {
  void deleteSubtask(db, subtask.id)
    .then(async (deleted) => {
      if (!deleted) return;
      if (deleted.completed) {
        await awardSubtaskStars(db, subtask, 'subtask_deleted', -1);
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
      track('breakdown_accepted', { step_count: created.length, mode });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Breakdown accept failed', error));
}
