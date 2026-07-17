import type { PlannedNotification } from './notification-planner';

export interface ScheduleDiff {
  /** Keys scheduled with the OS that are no longer desired — cancel these. */
  toCancel: string[];
  /** Desired notifications the OS doesn't have yet — schedule these. */
  toSchedule: PlannedNotification[];
}

/**
 * PURE set diff on notification keys. Matching keys are left alone — their
 * content is immutable per key (deadline keys embed the deadline timestamp,
 * challenge keys the fire date), so "same key" means "already correct".
 */
export function diffScheduled(
  desired: PlannedNotification[],
  existingKeys: string[],
): ScheduleDiff {
  const desiredKeys = new Set(desired.map((planned) => planned.key));
  const existing = new Set(existingKeys);
  return {
    toCancel: existingKeys.filter((key) => !desiredKeys.has(key)),
    toSchedule: desired.filter((planned) => !existing.has(planned.key)),
  };
}
