import type { TaskData } from '@one-down/shared';

import {
  bankedForCount,
  bonusWindow,
  calculateCompletionStars,
  isTopOfDeck,
  liveBadge,
  potentialStars,
  stepBankAmount,
} from './star-calculator';

const NOW = new Date('2026-06-10T12:00:00Z');
const DAY_MS = 86_400_000;

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * DAY_MS);
}

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
    lastEngagedAt: new Date('2026-06-01T10:00:00Z'),
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

describe('potentialStars (v1.5: size alone sets the value)', () => {
  it('quick win is worth 5; big time 20; unsized rides at quick-win value', () => {
    expect(potentialStars(makeTask({ size: 'quick_win' }))).toBe(5);
    expect(potentialStars(makeTask({ size: 'big_time' }))).toBe(20);
    expect(potentialStars(makeTask())).toBe(5);
  });

  it('deadlines never change the value — badges render separately', () => {
    expect(potentialStars(makeTask({ size: 'big_time', deadline: daysFromNow(1) }))).toBe(20);
  });
});

describe('bonusWindow', () => {
  it('is null without a deadline', () => {
    expect(bonusWindow(makeTask(), NOW)).toBeNull();
  });

  it('opens 4 days out and runs 2 — closed at 2 days out', () => {
    // Deadline 3 days out: inside the window (opened at −4d, closes at −2d).
    const inside = makeTask({ size: 'big_time', deadline: daysFromNow(3) });
    expect(bonusWindow(inside, NOW)).toEqual({
      kind: 'window',
      amount: 10,
      reason: expect.stringMatching(/^BONUS UNTIL /),
    });

    // Deadline 5 days out: the window hasn't opened yet.
    expect(bonusWindow(makeTask({ deadline: daysFromNow(5) }), NOW)).toBeNull();

    // Deadline 1.5 days out: the window has closed (placement takes over).
    expect(bonusWindow(makeTask({ deadline: daysFromNow(1.5) }), NOW)).toBeNull();
  });

  it('short notice opens immediately, capped at the deadline', () => {
    // Created now-ish with a deadline tomorrow: window = [created, deadline).
    const shortNotice = makeTask({
      size: 'quick_win',
      createdAt: new Date(NOW.getTime() - 60_000),
      deadline: daysFromNow(1),
    });
    expect(bonusWindow(shortNotice, NOW)).toEqual({
      kind: 'window',
      amount: 3,
      reason: expect.stringMatching(/^BONUS UNTIL /),
    });
  });
});

describe('isTopOfDeck', () => {
  it('true inside two days of the deadline (and overdue), false beyond', () => {
    expect(isTopOfDeck(makeTask({ deadline: daysFromNow(1) }), NOW)).toBe(true);
    expect(isTopOfDeck(makeTask({ deadline: daysFromNow(-1) }), NOW)).toBe(true);
    expect(isTopOfDeck(makeTask({ deadline: daysFromNow(3) }), NOW)).toBe(false);
    expect(isTopOfDeck(makeTask(), NOW)).toBe(false);
  });
});

describe('liveBadge (two reasons never stack — the larger wins)', () => {
  it('returns the offer when no window applies', () => {
    expect(liveBadge(makeTask({ size: 'quick_win' }), 3, NOW)).toEqual({
      kind: 'offer',
      amount: 3,
      reason: 'TO START IT NOW',
    });
  });

  it('window wins over a smaller (eroded) offer', () => {
    const task = makeTask({ size: 'big_time', deadline: daysFromNow(3) });
    expect(liveBadge(task, 2, NOW)).toMatchObject({ kind: 'window', amount: 10 });
  });

  it('a larger offer wins over the window', () => {
    const task = makeTask({ size: 'quick_win', deadline: daysFromNow(3) });
    expect(liveBadge(task, 10, NOW)).toMatchObject({ kind: 'offer', amount: 10 });
  });

  it('null with neither', () => {
    expect(liveBadge(makeTask(), 0, NOW)).toBeNull();
    expect(liveBadge(makeTask(), undefined, NOW)).toBeNull();
  });
});

describe('calculateCompletionStars (the conversion)', () => {
  it('pays value + badge − banked', () => {
    const task = makeTask({ size: 'big_time', deadline: daysFromNow(3) });
    expect(calculateCompletionStars(task, { bankedStars: 4, now: NOW })).toEqual({
      value: 20,
      bonus: 10,
      banked: 4,
      total: 26,
    });
  });

  it('floors at zero when banked exceeds the payout', () => {
    const task = makeTask({ size: 'quick_win' });
    expect(calculateCompletionStars(task, { bankedStars: 9, now: NOW }).total).toBe(0);
  });

  it('a plain unsized card with no deadline pays exactly its value', () => {
    expect(calculateCompletionStars(makeTask(), { bankedStars: 0, now: NOW })).toEqual({
      value: 5,
      bonus: 0,
      banked: 0,
      total: 5,
    });
  });
});

describe('banking maths', () => {
  it('steps bank 1 (quick win/unsized) or 2 (big time)', () => {
    expect(stepBankAmount(makeTask({ size: 'quick_win' }), 1)).toBe(1);
    expect(stepBankAmount(makeTask({ size: 'big_time' }), 1)).toBe(2);
    expect(stepBankAmount(makeTask(), 1)).toBe(1);
  });

  it('caps fill exactly at the card value: 5×1 quick win, 10×2 big time', () => {
    expect(bankedForCount(makeTask({ size: 'quick_win' }), 5)).toBe(5);
    expect(bankedForCount(makeTask({ size: 'quick_win' }), 8)).toBe(5);
    expect(bankedForCount(makeTask({ size: 'big_time' }), 10)).toBe(20);
    expect(bankedForCount(makeTask({ size: 'big_time' }), 12)).toBe(20);
    expect(stepBankAmount(makeTask({ size: 'quick_win' }), 6)).toBe(0);
  });
});
