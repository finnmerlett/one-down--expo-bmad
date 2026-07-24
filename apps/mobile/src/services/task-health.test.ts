import type { TaskData } from '@one-down/shared';

import { evaluateTaskHealth } from './task-health';

const NOW = new Date('2026-06-15T12:00:00Z');

const daysBefore = (days: number): Date => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function makeTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: 'task-1',
    title: 'Sample task',
    details: null,
    notes: null,
    status: 'pending',
    size: null,
    contexts: null,
    deadline: null,
    hasCheckNeeded: false,
    reviewFlags: null,
    skipCount: 0,
    skipWindowStartedAt: null,
    lastEngagedAt: daysBefore(1),
    createdAt: daysBefore(10),
    updatedAt: daysBefore(1),
    ...overrides,
  };
}

describe('evaluateTaskHealth (Story 7.2, pure)', () => {
  it('a freshly engaged task is healthy', () => {
    expect(evaluateTaskHealth(makeTask(), NOW)).toBeNull();
  });

  it('stale boundary: 6d23h → null, exactly 7d → stale (AC1)', () => {
    const justUnder = new Date(NOW.getTime() - (7 * 24 - 1) * 60 * 60 * 1000);
    expect(evaluateTaskHealth(makeTask({ lastEngagedAt: justUnder }), NOW)).toBeNull();
    expect(evaluateTaskHealth(makeTask({ lastEngagedAt: daysBefore(7) }), NOW)).toBe('stale');
  });

  it('avoided: threshold skips inside a live window (AC2)', () => {
    const task = makeTask({ skipCount: 5, skipWindowStartedAt: daysBefore(3) });
    expect(evaluateTaskHealth(task, NOW)).toBe('avoided');
  });

  it('below-threshold skips never flag avoided', () => {
    const task = makeTask({ skipCount: 4, skipWindowStartedAt: daysBefore(3) });
    expect(evaluateTaskHealth(task, NOW)).toBeNull();
  });

  it('threshold skips with an EXPIRED window do not flag (AC2 — old skips age out)', () => {
    const task = makeTask({
      skipCount: 5,
      skipWindowStartedAt: new Date(NOW.getTime() - (7 * 24 + 1) * 60 * 60 * 1000),
    });
    expect(evaluateTaskHealth(task, NOW)).toBeNull();
  });

  it('threshold skips with NO window recorded do not flag (defensive)', () => {
    expect(evaluateTaskHealth(makeTask({ skipCount: 5 }), NOW)).toBeNull();
  });

  it('avoided takes precedence when both stale and avoided apply', () => {
    const task = makeTask({
      lastEngagedAt: daysBefore(10),
      skipCount: 6,
      skipWindowStartedAt: daysBefore(2),
    });
    expect(evaluateTaskHealth(task, NOW)).toBe('avoided');
  });

  it.each(['in_progress', 'completed', 'cut_loose', 'archived'] as const)(
    'non-pending status %s never flags',
    (status) => {
      const task = makeTask({
        status,
        lastEngagedAt: daysBefore(30),
        skipCount: 9,
        skipWindowStartedAt: daysBefore(1),
      });
      expect(evaluateTaskHealth(task, NOW)).toBeNull();
    },
  );
});
