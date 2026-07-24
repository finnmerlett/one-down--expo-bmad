import type { ReviewItem, TaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { awardReviewConfirmStars } from '@/services/star-awards';
import {
  confirmReviewItem as repoConfirmReviewItem,
  markTaskEngaged,
  setTaskStatus,
  updateTask,
  type UpdateTaskPatch,
} from '@/services/tasks-repository';

/**
 * Append a refine distillation to the task's notes (Story 6.4, AC3). Pure —
 * exported for unit tests. Null distillation = nothing to append.
 */
export function appendDistillationToNotes(
  notes: string | null,
  distillation: string | null,
): string | null {
  if (!distillation) return notes;
  return notes ? `${notes}\n\n${distillation}` : distillation;
}

/** Analytics field name for a review item (snake_case in props — NFR-L1 taxonomy). */
function reviewItemField(item: ReviewItem): 'size' | 'contexts' | 'deadline' | 'missing_deadline' {
  return item === 'missingDeadline' ? 'missing_deadline' : item;
}

/**
 * Inline auto-save shared by the card-back surfaces (home overlay, list
 * detail): fire-and-forget against local SQLite (instantaneous, no network —
 * AC), tracking `task_edited` per changed field after a successful write.
 * From Story 6.2 an edit to a flagged field also auto-confirms its review
 * item: one small star per cleared flag (the repository clears each exactly
 * once, so awards can't double).
 */
export function applyTaskPatch(task: TaskData, patch: UpdateTaskPatch): void {
  void updateTask(db, task.id, patch)
    .then(async ({ confirmedItems, reviewCleared }) => {
      for (const field of Object.keys(patch) as (keyof UpdateTaskPatch)[]) {
        track('task_edited', { field });
      }
      for (const item of confirmedItems) {
        await awardReviewConfirmStars(db, task);
        track('review_item_confirmed', { field: reviewItemField(item), via: 'edit' });
      }
      if (reviewCleared) {
        track('review_completed', {});
      }
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Inline task update failed', error));
}

/**
 * Tick-confirm one review item (Story 6.2, AC4): clears the flag without
 * touching the value, then awards the confirmation star. Fire-and-forget like
 * startTask; a double tap reports `confirmed: false` and awards nothing.
 */
export function confirmReviewItem(task: TaskData, item: ReviewItem): void {
  void repoConfirmReviewItem(db, task.id, item)
    .then(async ({ confirmed, reviewCleared }) => {
      if (!confirmed) return;
      await awardReviewConfirmStars(db, task);
      track('review_item_confirmed', { field: reviewItemField(item), via: 'tick' });
      if (reviewCleared) {
        track('review_completed', {});
      }
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Review confirm failed', error));
}

/**
 * Notes autosave for the running screen (Story 2.2): fire-and-forget write
 * like applyTaskPatch, but `task_edited { field: 'notes' }` is emitted only
 * on the FIRST successful write per saver instance — the while-typing
 * debounce would otherwise spam an event on every pause. One instance per
 * screen session keeps the event honest ("user edited notes during
 * execution"). Never any note content in props (NFR-S3).
 */
export function createNotesAutosaver(taskId: string): (notes: string | null) => void {
  let tracked = false;
  return (notes) => {
    void updateTask(db, taskId, { notes })
      .then(() => {
        if (tracked) return;
        tracked = true;
        track('task_edited', { field: 'notes' });
      })
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Notes autosave failed', error));
  };
}

/**
 * Start (or resume) a task before opening the running screen. Only the first
 * pending → in_progress transition writes and emits `task_started` — tapping
 * Continue on an already-started task changes nothing (notes/progress are
 * simply re-opened, screen views are PostHog built-ins).
 */
export function startTask(task: TaskData, via: 'card_back_overlay' | 'list_detail'): void {
  if (task.status !== 'pending') return;
  void setTaskStatus(db, task.id, 'in_progress')
    .then(async () => {
      // Starting is THE meaningful action (Stories 6.4/7.2): the same
      // pending → in_progress transition that idempotency gates also resets
      // the skip window and refreshes the staleness clock, so Continue taps
      // never re-mark engagement either.
      await markTaskEngaged(db, task.id);
      track('task_started', { via });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Task start failed', error));
}

/**
 * "Keep it" on the task-health prompt (Story 7.2, AC5/AC7): registering
 * engagement clears the stale/avoided flag immediately — the indicator and
 * prompt disappear via the live query. Fire-and-forget like startTask; the
 * prompt-level analytics live with the prompt (CardBack), not here.
 */
export function keepTask(task: TaskData): void {
  void markTaskEngaged(db, task.id)
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Task keep failed', error));
}

/**
 * Mark a task completed (Story 2.3). Fire-and-forget like startTask — the
 * route pops immediately, the write lands via the module-scoped db.
 * `pending` is allowed: the startTask write may not have landed yet when the
 * user taps Done straight away (2.1 race).
 */
export function completeTask(task: TaskData): void {
  if (task.status === 'completed' || task.status === 'cut_loose') return;
  void setTaskStatus(db, task.id, 'completed')
    .then(() => {
      // Star awards live at the route seam (services/star-awards.ts) — the
      // toast needs the breakdown total, which this fire-and-forget can't return.
      track('task_completed', { size: task.size, had_notes: task.notes !== null });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Task complete failed', error));
}

/**
 * Archive a task guilt-free (Story 2.4). Fire-and-forget, mirrors
 * completeTask — cut-loose tasks keep their notes for the Epic 7 recycle
 * bin restore. `pending` is allowed for the same 2.1 startTask race.
 */
export function cutLooseTask(
  task: TaskData,
  via: 'card_back_overlay' | 'list_detail' | 'task_running' | 'triage',
): void {
  if (task.status === 'completed' || task.status === 'cut_loose') return;
  void setTaskStatus(db, task.id, 'cut_loose')
    .then(() => {
      // Star awards live at the route seam (services/star-awards.ts).
      track('task_cut_loose', { via, was_started: task.status === 'in_progress' });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Task cut loose failed', error));
}
