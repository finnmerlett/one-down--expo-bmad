import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { updateTask, type UpdateTaskPatch } from '@/services/tasks-repository';

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
