import type { TaskData } from '@one-down/shared';

import { CHALLENGE_COPY, deadlineSoonCopy, deadlineTomorrowCopy } from './notification-copy';
import type { NotificationPrefs } from './notification-prefs';

export type NotificationType = 'deadline_urgency' | 'challenge';

export interface PlannedNotification {
  /** Stable identity used to diff against what the OS already has scheduled. */
  key: string;
  title: string;
  body: string;
  fireAt: Date;
  type: NotificationType;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Deadline notices fire this far ahead of the deadline (AC1). */
export const DEADLINE_LEAD_MS = 24 * HOUR_MS;
/** Below this remaining time a late notice is pointless — schedule nothing. */
export const DEADLINE_MIN_REMAINING_MS = 2 * HOUR_MS;
/** Late-notice fallback delay when the 24h mark has already passed. */
export const DEADLINE_FALLBACK_DELAY_MS = 30 * MINUTE_MS;
/** Challenge invitations fire at this local hour (AC2). */
export const CHALLENGE_HOUR = 12;

/** Local yyyy-mm-dd of a date (challenge keys are per local calendar day). */
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Deterministic per-local-day integer (no stored "last sent" state): local
 * midnight rounded to whole days since epoch. `round` absorbs the timezone
 * offset (< ±14h), so consecutive local dates map to consecutive integers.
 */
function localDayNumber(date: Date): number {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return Math.round(midnight.getTime() / DAY_MS);
}

function noonOf(date: Date): Date {
  const noon = new Date(date);
  noon.setHours(CHALLENGE_HOUR, 0, 0, 0);
  return noon;
}

/**
 * Next cadence slot strictly after `now` (AC2): daily = next 12:00; every 3
 * days = next 12:00 on a day whose local day number is divisible by 3;
 * weekly = next Monday 12:00. Anchored to the calendar (not to a stored
 * last-fired time) so repeated resyncs keep producing the SAME slot — the
 * diff then leaves the scheduled notification untouched.
 */
export function nextChallengeSlot(cadence: 'daily' | 'every_3_days' | 'weekly', now: Date): Date {
  for (let offset = 0; offset < 8; offset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const slot = noonOf(day);
    if (slot <= now) continue;
    if (cadence === 'daily') return slot;
    if (cadence === 'every_3_days' && localDayNumber(slot) % 3 === 0) return slot;
    if (cadence === 'weekly' && slot.getDay() === 1) return slot;
  }
  // Unreachable: 8 consecutive days always contain a Monday and a %3 day.
  return noonOf(new Date(now.getTime() + 7 * DAY_MS));
}

/**
 * PURE planning of the complete desired notification set (AC1, AC2). The
 * scheduler diffs this against what the OS has and applies the difference —
 * all policy lives here where it is unit-testable.
 */
export function planNotifications(
  tasks: TaskData[],
  prefs: NotificationPrefs,
  now: Date,
): PlannedNotification[] {
  const planned: PlannedNotification[] = [];

  if (prefs.deadlineUrgency) {
    for (const task of tasks) {
      if (task.status !== 'pending' && task.status !== 'in_progress') continue;
      if (task.deadline === null) continue;
      const remaining = task.deadline.getTime() - now.getTime();
      if (remaining <= DEADLINE_MIN_REMAINING_MS) continue;

      const leadMoment = task.deadline.getTime() - DEADLINE_LEAD_MS;
      const onTime = leadMoment > now.getTime();
      const copy = onTime ? deadlineTomorrowCopy(task.title) : deadlineSoonCopy(task.title);
      planned.push({
        key: `deadline:${task.id}:${task.deadline.getTime()}`,
        ...copy,
        fireAt: new Date(onTime ? leadMoment : now.getTime() + DEADLINE_FALLBACK_DELAY_MS),
        type: 'deadline_urgency',
      });
    }
  }

  const hasPendingTask = tasks.some((task) => task.status === 'pending');
  if (prefs.challenges !== 'off' && hasPendingTask) {
    const slot = nextChallengeSlot(prefs.challenges, now);
    planned.push({
      key: `challenge:${localDateKey(slot)}`,
      title: CHALLENGE_COPY.title,
      body: CHALLENGE_COPY.body,
      fireAt: slot,
      type: 'challenge',
    });
  }

  return planned;
}
