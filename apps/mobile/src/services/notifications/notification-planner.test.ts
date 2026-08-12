import type { TaskData } from '@one-down/shared';

import {
  DEADLINE_FALLBACK_DELAY_MS,
  DEADLINE_LEAD_MS,
  nextChallengeSlot,
  planNotifications,
} from './notification-planner';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from './notification-prefs';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

// Local wall-clock time (no Z suffix) — the challenge slots are local-noon
// rules, so tests must be timezone-independent.
const NOW = new Date('2026-07-16T09:00:00');

function makeTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: 'task-1',
    title: 'Renew passport',
    details: null,
    notes: null,
    status: 'pending',
    size: null,
    criticality: null,
    contexts: null,
    deadline: null,
    hasCheckNeeded: false,
    reviewFlags: null,
    skipCount: 0,
    skipWindowStartedAt: null,
    lastEngagedAt: new Date('2026-07-01T10:00:00'),
    createdAt: new Date('2026-07-01T10:00:00'),
    updatedAt: new Date('2026-07-01T10:00:00'),
    ...overrides,
  };
}

const prefsWith = (overrides: Partial<NotificationPrefs>): NotificationPrefs => ({
  ...DEFAULT_NOTIFICATION_PREFS,
  ...overrides,
});

describe('planNotifications — deadline urgency (AC1)', () => {
  it('schedules at deadline − 24h with a stable key when the lead moment is ahead', () => {
    const deadline = new Date(NOW.getTime() + 48 * HOUR_MS);
    const planned = planNotifications([makeTask({ deadline })], DEFAULT_NOTIFICATION_PREFS, NOW);

    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({
      key: `deadline:task-1:${deadline.getTime()}`,
      type: 'deadline_urgency',
      title: '"Renew passport" is due tomorrow',
    });
    expect(planned[0]?.fireAt.getTime()).toBe(deadline.getTime() - DEADLINE_LEAD_MS);
  });

  it('falls back to now + 30min when the 24h mark passed but >2h remain', () => {
    const deadline = new Date(NOW.getTime() + 10 * HOUR_MS);
    const planned = planNotifications([makeTask({ deadline })], DEFAULT_NOTIFICATION_PREFS, NOW);

    expect(planned).toHaveLength(1);
    expect(planned[0]?.fireAt.getTime()).toBe(NOW.getTime() + DEADLINE_FALLBACK_DELAY_MS);
    // Fallback copy is honest — the deadline is NOT tomorrow.
    expect(planned[0]?.title).toBe('"Renew passport" is coming up');
  });

  it('plans nothing when ≤2h remain, the deadline passed, or there is no deadline', () => {
    const cases = [
      makeTask({ deadline: new Date(NOW.getTime() + 2 * HOUR_MS) }),
      makeTask({ deadline: new Date(NOW.getTime() - HOUR_MS) }),
      makeTask({ deadline: null }),
    ];
    for (const task of cases) {
      expect(planNotifications([task], DEFAULT_NOTIFICATION_PREFS, NOW)).toHaveLength(0);
    }
  });

  it('plans nothing for completed / cut-loose tasks', () => {
    const deadline = new Date(NOW.getTime() + 48 * HOUR_MS);
    const tasks = [
      makeTask({ id: 'a', status: 'completed', deadline }),
      makeTask({ id: 'b', status: 'cut_loose', deadline }),
    ];
    expect(planNotifications(tasks, DEFAULT_NOTIFICATION_PREFS, NOW)).toHaveLength(0);
  });

  it('still covers in_progress tasks and respects the pref being off', () => {
    const deadline = new Date(NOW.getTime() + 48 * HOUR_MS);
    const task = makeTask({ status: 'in_progress', deadline });

    expect(planNotifications([task], DEFAULT_NOTIFICATION_PREFS, NOW)).toHaveLength(1);
    expect(planNotifications([task], prefsWith({ deadlineUrgency: false }), NOW)).toHaveLength(0);
  });
});

describe('planNotifications — challenge invitations (AC2)', () => {
  it('plans one challenge at the next slot, keyed by local fire date', () => {
    const planned = planNotifications([makeTask()], prefsWith({ challenges: 'daily' }), NOW);

    const challenge = planned.find((entry) => entry.type === 'challenge');
    expect(challenge).toBeDefined();
    // 09:00 → same day 12:00 local.
    expect(challenge?.fireAt.getHours()).toBe(12);
    expect(challenge?.fireAt.getDate()).toBe(NOW.getDate());
    expect(challenge?.key).toBe('challenge:2026-07-16');
    expect(challenge?.title).toBe('Got a quick 5 minutes?');
  });

  it('plans nothing when the pref is off or no pending task exists', () => {
    expect(planNotifications([makeTask()], prefsWith({ challenges: 'off' }), NOW)).toHaveLength(0);
    expect(planNotifications([], prefsWith({ challenges: 'daily' }), NOW)).toHaveLength(0);
    expect(
      planNotifications(
        [makeTask({ status: 'in_progress' }), makeTask({ id: 'c', status: 'completed' })],
        prefsWith({ challenges: 'daily' }),
        NOW,
      ),
    ).toHaveLength(0);
  });

  it('is stable across repeated planning runs (same key → diff leaves it alone)', () => {
    const prefs = prefsWith({ challenges: 'every_3_days' });
    const first = planNotifications([makeTask()], prefs, NOW);
    const secondNow = new Date(NOW.getTime() + 5 * 60_000);
    const second = planNotifications([makeTask()], prefs, secondNow);
    expect(first[0]?.key).toBe(second[0]?.key);
  });
});

describe('nextChallengeSlot cadences', () => {
  it('daily: next 12:00 local, strictly after now', () => {
    const morning = nextChallengeSlot('daily', NOW);
    expect(morning.getHours()).toBe(12);
    expect(morning.getDate()).toBe(NOW.getDate());

    const afternoon = nextChallengeSlot('daily', new Date('2026-07-16T13:00:00'));
    expect(afternoon.getHours()).toBe(12);
    expect(afternoon.getTime() - NOW.getTime()).toBeGreaterThan(0);
    expect(afternoon.getDate()).toBe(17);
  });

  it('every_3_days: noon slots exactly 3 days apart', () => {
    const first = nextChallengeSlot('every_3_days', NOW);
    expect(first.getHours()).toBe(12);
    expect(first.getTime()).toBeGreaterThan(NOW.getTime());
    expect(first.getTime() - NOW.getTime()).toBeLessThanOrEqual(3 * DAY_MS);

    const second = nextChallengeSlot('every_3_days', new Date(first.getTime() + 60_000));
    expect(second.getTime() - first.getTime()).toBe(3 * DAY_MS);
  });

  it('weekly: next Monday 12:00 local', () => {
    const slot = nextChallengeSlot('weekly', NOW);
    expect(slot.getDay()).toBe(1);
    expect(slot.getHours()).toBe(12);
    expect(slot.getTime()).toBeGreaterThan(NOW.getTime());
    expect(slot.getTime() - NOW.getTime()).toBeLessThanOrEqual(7 * DAY_MS);
  });
});
