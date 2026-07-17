import { diffScheduled } from './notification-diff';
import type { PlannedNotification } from './notification-planner';

function planned(key: string): PlannedNotification {
  return {
    key,
    title: 'title',
    body: 'body',
    fireAt: new Date('2026-07-17T12:00:00'),
    type: 'challenge',
  };
}

describe('diffScheduled', () => {
  it('partitions into cancel (stale), schedule (new), and keep (matching)', () => {
    const desired = [planned('a'), planned('b'), planned('c')];

    const { toCancel, toSchedule } = diffScheduled(desired, ['b', 'd']);

    expect(toCancel).toEqual(['d']);
    expect(toSchedule.map((entry) => entry.key)).toEqual(['a', 'c']);
  });

  it('cancels everything when nothing is desired (e.g. prefs switched off)', () => {
    expect(diffScheduled([], ['a', 'b'])).toEqual({ toCancel: ['a', 'b'], toSchedule: [] });
  });

  it('does nothing when the OS already matches the plan', () => {
    const desired = [planned('a'), planned('b')];
    expect(diffScheduled(desired, ['a', 'b'])).toEqual({ toCancel: [], toSchedule: [] });
  });
});
