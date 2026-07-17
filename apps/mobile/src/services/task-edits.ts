import type { TaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { setTaskStatus, updateTask, type UpdateTaskPatch } from '@/services/tasks-repository';

/**
 * Inline auto-save shared by the card-back surfaces (home overlay, list
 * detail): fire-and-forget against local SQLite (instantaneous, no network —
 * AC), tracking `task_edited` per changed field after a successful write.
 */
export function applyTaskPatch(taskId: string, patch: UpdateTaskPatch): void {
  void updateTask(db, taskId, patch)
    .then(() => {
      for (const field of Object.keys(patch) as (keyof UpdateTaskPatch)[]) {
        track('task_edited', { field });
      }
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Inline task update failed', error));
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
    .then(() => {
      track('task_started', { via });
    })
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Task start failed', error));
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
  via: 'card_back_overlay' | 'list_detail' | 'task_running',
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
