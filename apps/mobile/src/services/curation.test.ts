import { TASK_CONTEXTS, type TaskData } from '@one-down/shared';

import { availableContexts, curateTasks, urgentContexts } from './curation';

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
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

describe('curateTasks', () => {
  it('keeps pending and in-progress tasks, drops completed and cut-loose', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'pending', createdAt: new Date('2026-06-02') }),
      makeTask({ id: 'b', status: 'completed' }),
      makeTask({ id: 'c', status: 'in_progress', createdAt: new Date('2026-06-01') }),
      makeTask({ id: 'd', status: 'cut_loose' }),
    ];

    expect(
      curateTasks(tasks)
        .map((t) => t.id)
        .sort(),
    ).toEqual(['a', 'c']);
  });

  it('filters by context overlap when active contexts are set', () => {
    const tasks = [
      makeTask({ id: 'home-only', contexts: '["home"]', createdAt: new Date('2026-06-01') }),
      makeTask({
        id: 'phone-or-home',
        contexts: '["phone","home"]',
        createdAt: new Date('2026-06-02'),
      }),
      makeTask({ id: 'laptop-only', contexts: '["laptop"]', createdAt: new Date('2026-06-03') }),
    ];

    expect(
      curateTasks(tasks, { contexts: ['home'] })
        .map((t) => t.id)
        .sort(),
    ).toEqual(['home-only', 'phone-or-home']);
  });

  it('always includes context-free tasks when filtering (doable anywhere)', () => {
    const tasks = [
      makeTask({ id: 'anywhere', contexts: null }),
      makeTask({ id: 'empty-list', contexts: '[]' }),
      makeTask({ id: 'laptop-only', contexts: '["laptop"]' }),
    ];

    expect(
      curateTasks(tasks, { contexts: ['home'] })
        .map((t) => t.id)
        .sort(),
    ).toEqual(['anywhere', 'empty-list']);
  });

  it('treats malformed contexts JSON as context-free rather than crashing', () => {
    const tasks = [makeTask({ id: 'broken', contexts: 'not-json' })];

    expect(curateTasks(tasks, { contexts: ['home'] }).map((t) => t.id)).toEqual(['broken']);
  });

  it('mode keeps matching-size and unsized tasks, drops the other size', () => {
    const tasks = [
      makeTask({ id: 'quick', size: 'quick_win', createdAt: new Date('2026-06-03') }),
      makeTask({ id: 'big', size: 'big_time', createdAt: new Date('2026-06-02') }),
      makeTask({ id: 'unsized', size: null, createdAt: new Date('2026-06-01') }),
    ];

    expect(
      curateTasks(tasks, { size: 'quick_win' })
        .map((t) => t.id)
        .sort(),
    ).toEqual(['quick', 'unsized']);
    expect(
      curateTasks(tasks, { size: 'big_time' })
        .map((t) => t.id)
        .sort(),
    ).toEqual(['big', 'unsized']);
  });

  it('null/undefined mode keeps every size', () => {
    const tasks = [
      makeTask({ id: 'quick', size: 'quick_win', createdAt: new Date('2026-06-02') }),
      makeTask({ id: 'big', size: 'big_time', createdAt: new Date('2026-06-01') }),
    ];

    expect(
      curateTasks(tasks, { size: null })
        .map((t) => t.id)
        .sort(),
    ).toEqual(['big', 'quick']);
    expect(
      curateTasks(tasks, {})
        .map((t) => t.id)
        .sort(),
    ).toEqual(['big', 'quick']);
  });

  it('combines context and mode filters with AND semantics (AC5)', () => {
    const tasks = [
      makeTask({ id: 'home-quick', contexts: '["home"]', size: 'quick_win' }),
      makeTask({ id: 'home-big', contexts: '["home"]', size: 'big_time' }),
      makeTask({ id: 'phone-quick', contexts: '["phone"]', size: 'quick_win' }),
      makeTask({ id: 'anywhere-unsized', contexts: null, size: null }),
    ];

    expect(
      curateTasks(tasks, { contexts: ['home'], size: 'quick_win' })
        .map((t) => t.id)
        .sort(),
    ).toEqual(['anywhere-unsized', 'home-quick']);
  });

  it('does not mutate the input array', () => {
    const tasks = [
      makeTask({ id: 'b', deadline: new Date('2026-06-20') }),
      makeTask({ id: 'a', deadline: new Date('2026-06-12') }),
    ];
    const snapshot = tasks.map((t) => t.id);

    curateTasks(tasks);

    expect(tasks.map((t) => t.id)).toEqual(snapshot);
  });
});

describe('availableContexts', () => {
  it('maps tagged browsable tasks to their contexts', () => {
    const tasks = [
      makeTask({ id: 'a', contexts: '["home","phone"]' }),
      makeTask({ id: 'b', status: 'in_progress', contexts: '["laptop"]' }),
    ];

    expect(availableContexts(tasks)).toEqual(new Set(['home', 'phone', 'laptop']));
  });

  it('makes every context available when any untagged browsable task exists', () => {
    const tasks = [
      makeTask({ id: 'a', contexts: '["home"]' }),
      makeTask({ id: 'anywhere', contexts: null }),
    ];

    expect(availableContexts(tasks)).toEqual(new Set(TASK_CONTEXTS));
  });

  it('ignores completed and cut-loose tasks', () => {
    const tasks = [
      makeTask({ id: 'done', status: 'completed', contexts: '["home"]' }),
      makeTask({ id: 'released', status: 'cut_loose', contexts: null }),
      makeTask({ id: 'live', contexts: '["phone"]' }),
    ];

    expect(availableContexts(tasks)).toEqual(new Set(['phone']));
  });

  it('returns an empty set for no tasks', () => {
    expect(availableContexts([])).toEqual(new Set());
  });

  it('ignores unknown stored context values', () => {
    const tasks = [makeTask({ id: 'a', contexts: '["home","garden_shed"]' })];

    expect(availableContexts(tasks)).toEqual(new Set(['home']));
  });

  it('respects the mode: contexts whose only tasks fail the size filter are unavailable', () => {
    const tasks = [
      makeTask({ id: 'big-laptop', size: 'big_time', contexts: '["laptop"]' }),
      makeTask({ id: 'quick-home', size: 'quick_win', contexts: '["home"]' }),
      makeTask({ id: 'unsized-phone', size: null, contexts: '["phone"]' }),
    ];

    // Unsized tasks pass both modes, so phone stays available either way.
    expect(availableContexts(tasks, 'quick_win')).toEqual(new Set(['home', 'phone']));
    expect(availableContexts(tasks, 'big_time')).toEqual(new Set(['laptop', 'phone']));
    expect(availableContexts(tasks, null)).toEqual(new Set(['laptop', 'home', 'phone']));
  });
});

// --- Story 3.3: weighted scoring + momentum/variety passes. Fixed `now` and
// explicit seeds throughout — the algorithm must be fully deterministic for
// a given (now, seed).
describe('curateTasks scoring (Story 3.3)', () => {
  const NOW = new Date('2026-06-10T12:00:00Z');
  const options = (seed: number) => ({ now: NOW, seed });

  it('momentum: the top card is a quick win whenever one passes the filters', () => {
    const tasks = [
      makeTask({ id: 'big-a', size: 'big_time' }),
      makeTask({ id: 'unsized-b' }),
      makeTask({ id: 'quick-c', size: 'quick_win' }),
      makeTask({ id: 'big-d', size: 'big_time' }),
      makeTask({ id: 'quick-e', size: 'quick_win' }),
    ];

    for (let seed = 0; seed < 10; seed++) {
      expect(curateTasks(tasks, undefined, options(seed))[0]?.size).toBe('quick_win');
    }
  });

  it('momentum: with no quick wins the highest-scoring task simply leads', () => {
    const tasks = [
      makeTask({ id: 'big-a', size: 'big_time' }),
      makeTask({ id: 'big-b', size: 'big_time' }),
      makeTask({ id: 'big-c', size: 'big_time' }),
    ];

    const result = curateTasks(tasks, undefined, options(1));
    expect(result).toHaveLength(3);
    expect(result[0]?.size).toBe('big_time');
  });

  it('momentum is inert when the mode filters quick wins out', () => {
    const tasks = [
      makeTask({ id: 'quick', size: 'quick_win' }),
      makeTask({ id: 'big', size: 'big_time' }),
      makeTask({ id: 'unsized' }),
    ];

    const result = curateTasks(tasks, { size: 'big_time' }, options(0));
    expect(result.map((t) => t.id).sort()).toEqual(['big', 'unsized']);
    expect(result[0]?.size).not.toBe('quick_win');
  });

  it('urgency: a task due within 48h ranks in the top 3 across seeds', () => {
    const tasks = [
      makeTask({ id: 'quick', size: 'quick_win' }),
      makeTask({ id: 'big-a', size: 'big_time' }),
      makeTask({ id: 'big-b', size: 'big_time' }),
      makeTask({ id: 'unsized-a' }),
      makeTask({ id: 'unsized-b' }),
      makeTask({ id: 'unsized-c' }),
      // Due in 24h — urgency weight must dominate jitter (AC1b).
      makeTask({ id: 'urgent', deadline: new Date('2026-06-11T12:00:00Z') }),
    ];

    for (let seed = 0; seed < 10; seed++) {
      const order = curateTasks(tasks, undefined, options(seed)).map((t) => t.id);
      expect(order.indexOf('urgent')).toBeLessThan(3);
    }
  });

  it('variety: a lone big task is emitted before any 3-run of quick wins', () => {
    const tasks = [
      makeTask({ id: 'q1', size: 'quick_win' }),
      makeTask({ id: 'q2', size: 'quick_win' }),
      makeTask({ id: 'q3', size: 'quick_win' }),
      makeTask({ id: 'q4', size: 'quick_win' }),
      makeTask({ id: 'q5', size: 'quick_win' }),
      makeTask({ id: 'lone-big', size: 'big_time' }),
    ];

    for (let seed = 0; seed < 10; seed++) {
      const order = curateTasks(tasks, undefined, options(seed)).map((t) => t.id);
      // Never 3 consecutive same-size cards while a different size remains.
      expect(order.indexOf('lone-big')).toBeLessThanOrEqual(2);
    }
  });

  it('determinism: the same seed always produces the identical order', () => {
    const tasks = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => makeTask({ id }));

    const first = curateTasks(tasks, undefined, options(7)).map((t) => t.id);
    const second = curateTasks(tasks, undefined, options(7)).map((t) => t.id);
    expect(second).toEqual(first);
  });

  it('different seeds produce a fresh mix', () => {
    const tasks = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => makeTask({ id }));

    const orders = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        curateTasks(tasks, undefined, options(seed))
          .map((t) => t.id)
          .join(','),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('adding a task does not re-jitter the others (no mid-browse reshuffle)', () => {
    const tasks = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => makeTask({ id }));

    const before = curateTasks(tasks, undefined, options(3)).map((t) => t.id);
    const after = curateTasks([...tasks, makeTask({ id: 'newcomer' })], undefined, options(3))
      .map((t) => t.id)
      .filter((id) => id !== 'newcomer');
    expect(after).toEqual(before);
  });
});

describe('urgentContexts', () => {
  const NOW = new Date('2026-06-10T12:00:00Z');

  it('includes contexts of tasks due within 48h and overdue tasks', () => {
    const tasks = [
      makeTask({ id: 'soon', deadline: new Date('2026-06-11T12:00:00Z'), contexts: '["home"]' }),
      makeTask({ id: 'overdue', deadline: new Date('2026-06-08'), contexts: '["phone"]' }),
    ];

    expect(urgentContexts(tasks, NOW)).toEqual(new Set(['home', 'phone']));
  });

  it('excludes deadlines beyond the 48h window', () => {
    const tasks = [
      makeTask({ id: 'later', deadline: new Date('2026-06-13T13:00:00Z'), contexts: '["home"]' }),
    ];

    expect(urgentContexts(tasks, NOW)).toEqual(new Set());
  });

  it('ignores completed/cut-loose tasks and untagged urgent tasks', () => {
    const tasks = [
      makeTask({
        id: 'done',
        status: 'completed',
        deadline: new Date('2026-06-11'),
        contexts: '["home"]',
      }),
      makeTask({
        id: 'released',
        status: 'cut_loose',
        deadline: new Date('2026-06-11'),
        contexts: '["phone"]',
      }),
      makeTask({ id: 'untagged-urgent', deadline: new Date('2026-06-11'), contexts: null }),
    ];

    expect(urgentContexts(tasks, NOW)).toEqual(new Set());
  });
});
