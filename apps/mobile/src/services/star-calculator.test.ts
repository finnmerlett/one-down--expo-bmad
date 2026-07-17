import type { TaskData } from '@one-down/shared';

import { potentialStars, relativeUrgencyBonus } from './star-calculator';

const NOW = new Date('2026-06-10T12:00:00Z');

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
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

describe('potentialStars', () => {
  it('unsized task with no deadline is worth the completion base (10)', () => {
    expect(potentialStars(makeTask(), [], NOW)).toBe(10);
  });

  it('big_time size adds its bonus (15); quick_win adds none (10)', () => {
    expect(potentialStars(makeTask({ size: 'big_time' }), [], NOW)).toBe(15);
    expect(potentialStars(makeTask({ size: 'quick_win' }), [], NOW)).toBe(10);
  });

  it('stacks size bonus with the urgency bonus', () => {
    const task = makeTask({ id: 'due', size: 'big_time', deadline: new Date('2026-06-11') });
    // Sole deadline-bearing task -> full urgency bonus: 10 + 5 + 5.
    expect(potentialStars(task, [makeTask({ id: 'peer' })], NOW)).toBe(20);
  });
});

describe('relativeUrgencyBonus', () => {
  it('is 0 for a task without a deadline', () => {
    expect(relativeUrgencyBonus(makeTask(), [makeTask({ id: 'x', deadline: NOW })])).toBe(0);
  });

  it('grants the full bonus to a single deadline-bearing task', () => {
    expect(relativeUrgencyBonus(makeTask({ deadline: new Date('2026-06-12') }), [])).toBe(5);
  });

  it('ranks by deadline: soonest gets the full bonus, latest the floor share', () => {
    const soonest = makeTask({ id: 'soonest', deadline: new Date('2026-06-11') });
    const middle = makeTask({ id: 'middle', deadline: new Date('2026-06-15') });
    const latest = makeTask({ id: 'latest', deadline: new Date('2026-06-20') });
    const active = [soonest, middle, latest];

    // D = 3: soonest round(5*3/3)=5, middle round(5*2/3)=3, latest round(5*1/3)=2.
    expect(relativeUrgencyBonus(soonest, active)).toBe(5);
    expect(relativeUrgencyBonus(middle, active)).toBe(3);
    expect(relativeUrgencyBonus(latest, active)).toBe(2);
  });

  it('deadline-free peers do not dilute the pool', () => {
    const due = makeTask({ id: 'due', deadline: new Date('2026-06-12') });
    const peers = [makeTask({ id: 'p1' }), makeTask({ id: 'p2' }), makeTask({ id: 'p3' })];

    expect(relativeUrgencyBonus(due, peers)).toBe(5);
  });

  it('dedupes the task itself out of the active list', () => {
    const due = makeTask({ id: 'due', deadline: new Date('2026-06-12') });

    // If `due` double-counted, D would be 2 and the bonus would round down.
    expect(relativeUrgencyBonus(due, [due])).toBe(5);
  });

  it('rounds the proportional share (2nd of 2 -> round(2.5) = 3)', () => {
    const first = makeTask({ id: 'first', deadline: new Date('2026-06-11') });
    const second = makeTask({ id: 'second', deadline: new Date('2026-06-12') });

    expect(relativeUrgencyBonus(second, [first, second])).toBe(3);
  });
});
