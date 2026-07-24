import type { TaskData } from '@one-down/shared';

import {
  buildWelcomeBackSummary,
  promoteQuickWin,
  selectAttentionTasks,
  shouldShowWelcomeBack,
} from './welcome-back';

const NOW = new Date('2026-06-15T12:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const daysBefore = (days: number): Date => new Date(NOW.getTime() - days * MS_PER_DAY);

function makeTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: overrides.id ?? 'task-1',
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

describe('shouldShowWelcomeBack (Story 7.3, AC1/AC5)', () => {
  it('never greets a first launch (null lastActiveAt)', () => {
    expect(shouldShowWelcomeBack(null, NOW)).toBe(false);
  });

  it('boundary: 3d23h → false, exactly 4d → true', () => {
    const justUnder = NOW.getTime() - (4 * 24 - 1) * 60 * 60 * 1000;
    expect(shouldShowWelcomeBack(justUnder, NOW)).toBe(false);
    expect(shouldShowWelcomeBack(NOW.getTime() - 4 * MS_PER_DAY, NOW)).toBe(true);
  });
});

describe('buildWelcomeBackSummary (Story 7.3, AC1)', () => {
  const lastActiveAt = daysBefore(5).getTime();

  it('counts waiting tasks, deadlines passed while away, and stale suggestions', () => {
    const tasks = [
      // Waiting, deadline passed DURING the absence.
      makeTask({ id: 'due-away', deadline: daysBefore(2), lastEngagedAt: daysBefore(1) }),
      // Waiting + stale (no engagement for 8 days).
      makeTask({ id: 'stale', lastEngagedAt: daysBefore(8) }),
      // Waiting, in progress, healthy.
      makeTask({ id: 'running', status: 'in_progress' }),
      // Deadline passed BEFORE the absence window — not "while away".
      makeTask({ id: 'due-before', deadline: daysBefore(6) }),
      // Deadline still ahead.
      makeTask({ id: 'due-later', deadline: new Date(NOW.getTime() + MS_PER_DAY) }),
    ];

    const summary = buildWelcomeBackSummary(tasks, lastActiveAt, NOW);

    expect(summary.daysAway).toBe(5);
    expect(summary.tasksWaiting).toBe(5);
    expect(summary.deadlinesPassed).toBe(1);
    expect(summary.staleSuggestions).toBe(1);
  });

  it('excludes completed/cut-loose/archived tasks from every count', () => {
    const tasks = (['completed', 'cut_loose', 'archived'] as const).map((status, index) =>
      makeTask({
        id: `${status}-${index}`,
        status,
        deadline: daysBefore(2),
        lastEngagedAt: daysBefore(20),
      }),
    );

    const summary = buildWelcomeBackSummary(tasks, lastActiveAt, NOW);

    expect(summary.tasksWaiting).toBe(0);
    expect(summary.deadlinesPassed).toBe(0);
    expect(summary.staleSuggestions).toBe(0);
  });

  it('clamps a degenerate future lastActiveAt to zero days away', () => {
    const summary = buildWelcomeBackSummary([], NOW.getTime() + MS_PER_DAY, NOW);
    expect(summary.daysAway).toBe(0);
  });
});

describe('selectAttentionTasks (Story 7.3, AC3)', () => {
  const lastActiveAt = daysBefore(5).getTime();

  it('dedupes to one row per task with deadline_passed > avoided > stale precedence', () => {
    const tasks = [
      // Deadline passed AND avoided AND stale → deadline_passed wins.
      makeTask({
        id: 'everything',
        deadline: daysBefore(1),
        lastEngagedAt: daysBefore(9),
        skipCount: 6,
        skipWindowStartedAt: daysBefore(1),
      }),
      // Avoided AND stale → avoided wins.
      makeTask({
        id: 'avoided-stale',
        lastEngagedAt: daysBefore(9),
        skipCount: 5,
        skipWindowStartedAt: daysBefore(2),
      }),
      // Stale only.
      makeTask({ id: 'stale-only', lastEngagedAt: daysBefore(8) }),
      // Healthy — no row.
      makeTask({ id: 'fine' }),
    ];

    const rows = selectAttentionTasks(tasks, lastActiveAt, NOW);

    expect(rows.map((row) => [row.task.id, row.reason])).toEqual([
      ['everything', 'deadline_passed'],
      ['avoided-stale', 'avoided'],
      ['stale-only', 'stale'],
    ]);
  });

  it('an in-progress task with a passed deadline still gets a row (active, needs attention)', () => {
    const rows = selectAttentionTasks(
      [makeTask({ id: 'running-due', status: 'in_progress', deadline: daysBefore(1) })],
      lastActiveAt,
      NOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reason).toBe('deadline_passed');
  });
});

describe('promoteQuickWin (Story 7.3, AC4)', () => {
  const quickWin = (id: string, deadline: Date | null = null) =>
    makeTask({ id, size: 'quick_win', deadline });
  const bigTime = (id: string) => makeTask({ id, size: 'big_time' });

  it('moves the first non-overdue quick win to the front', () => {
    const promoted = promoteQuickWin([bigTime('b1'), quickWin('q1'), quickWin('q2')], NOW);
    expect(promoted.map((task) => task.id)).toEqual(['q1', 'b1', 'q2']);
  });

  it('prefers a non-overdue quick win over an earlier overdue one', () => {
    const promoted = promoteQuickWin(
      [bigTime('b1'), quickWin('overdue', daysBefore(1)), quickWin('fresh')],
      NOW,
    );
    expect(promoted.map((task) => task.id)).toEqual(['fresh', 'b1', 'overdue']);
  });

  it('falls back to an overdue quick win when no fresh one exists', () => {
    const promoted = promoteQuickWin([bigTime('b1'), quickWin('overdue', daysBefore(1))], NOW);
    expect(promoted.map((task) => task.id)).toEqual(['overdue', 'b1']);
  });

  it('no quick win → identity; already-first → stable order', () => {
    const noQuickWins = [bigTime('b1'), bigTime('b2')];
    expect(promoteQuickWin(noQuickWins, NOW)).toBe(noQuickWins);

    const alreadyFirst = [quickWin('q1'), bigTime('b1')];
    expect(promoteQuickWin(alreadyFirst, NOW)).toBe(alreadyFirst);
  });
});
