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
