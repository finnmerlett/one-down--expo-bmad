import {
  AVOIDED_SKIP_THRESHOLD,
  AVOIDED_WINDOW_DAYS,
  STALE_AFTER_DAYS,
  type TaskData,
} from '@one-down/shared';

/** Health flags a pending task can carry (Story 7.2, FR32/33). */
export type TaskHealthFlag = 'avoided' | 'stale';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure task-health evaluation (Story 7.2) — injected clock, no I/O.
 *
 * Only `pending` tasks are flaggable: `in_progress` means the user IS
 * engaging, and completed/cut_loose/archived tasks are out of play. Avoided
 * takes precedence over stale when both apply (the more specific signal):
 * avoided = threshold skips inside a live window (AC2); stale = no
 * meaningful action for STALE_AFTER_DAYS, clocked off `lastEngagedAt`
 * (initialized to creation — AC1).
 */
export function evaluateTaskHealth(task: TaskData, now: Date): TaskHealthFlag | null {
  if (task.status !== 'pending') return null;
  if (
    task.skipCount >= AVOIDED_SKIP_THRESHOLD &&
    task.skipWindowStartedAt !== null &&
    now.getTime() - task.skipWindowStartedAt.getTime() <= AVOIDED_WINDOW_DAYS * MS_PER_DAY
  ) {
    return 'avoided';
  }
  if (now.getTime() - task.lastEngagedAt.getTime() >= STALE_AFTER_DAYS * MS_PER_DAY) {
    return 'stale';
  }
  return null;
}
