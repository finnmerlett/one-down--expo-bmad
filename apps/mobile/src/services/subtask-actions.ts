import type { SubtaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import {
  createSubtasks,
  deleteSubtask,
  renameSubtask,
  reorderSubtasks,
  restoreSubtask,
  setSubtaskCompleted,
} from '@/services/subtasks-repository';

// Fire-and-forget subtask actions (Story 6.3), mirroring task-edits.ts:
// module-scoped db writes survive screen unmounts; analytics only after the
// write actually changed something. Step ticks never touch the star ledger —
// banking is cosmetic (2026-08-11 item 7); the pot pays at completion.

/**
 * Tick/untick a subtask (AC4/AC5). Banked stars are COSMETIC (2026-08-11
 * item 7): ticking writes NOTHING to the star ledger — the banked indicator
 * is derived live from completed-step counts (useBankedStars/bankedForCount)
 * and the whole value pays out only at task completion.
 */
export function toggleSubtask(subtask: SubtaskData): void {
  const next = !subtask.completed;
  void setSubtaskCompleted(db, subtask.id, next)
    .then((changed) => {
      if (!changed) return;
      track('subtask_completed', { source: subtask.source, reversed: !next });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Subtask toggle failed', error));
}

/**
 * Delete a subtask (AC4/AC5). Nothing to un-bank — banking is cosmetic and
 * count-derived, so the indicator adjusts by itself.
 */
export function removeSubtask(subtask: SubtaskData): void {
  void deleteSubtask(db, subtask.id)
    .then((deleted) => {
      if (!deleted) return;
      track('subtask_deleted', { was_completed: deleted.completed });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Subtask delete failed', error));
}

/** Restore a deleted step from the undo toast (D4): the row comes back
 *  verbatim; the cosmetic banked indicator follows the count by itself. */
export function restoreStep(subtask: SubtaskData): void {
  void restoreSubtask(db, subtask)
    .then(() => {
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
