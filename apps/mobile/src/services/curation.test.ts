import { TASK_CONTEXTS, type TaskData } from '@one-down/shared';

import { availableContexts, curateTasks } from './curation';

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

describe('curateTasks', () => {
  it('keeps pending and in-progress tasks, drops completed and cut-loose', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'pending', createdAt: new Date('2026-06-02') }),
      makeTask({ id: 'b', status: 'completed' }),
      makeTask({ id: 'c', status: 'in_progress', createdAt: new Date('2026-06-01') }),
      makeTask({ id: 'd', status: 'cut_loose' }),
    ];

    expect(curateTasks(tasks).map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('orders by deadline soonest first, no-deadline last, then newest created', () => {
    const tasks = [
      makeTask({ id: 'no-deadline-old', createdAt: new Date('2026-06-01') }),
      makeTask({ id: 'late', deadline: new Date('2026-06-20') }),
      makeTask({ id: 'no-deadline-new', createdAt: new Date('2026-06-05') }),
      makeTask({ id: 'soon', deadline: new Date('2026-06-12') }),
    ];

    expect(curateTasks(tasks).map((t) => t.id)).toEqual([
      'soon',
      'late',
      'no-deadline-new',
      'no-deadline-old',
    ]);
  });

  it('breaks deadline ties by newest created', () => {
    const deadline = new Date('2026-06-15');
    const tasks = [
      makeTask({ id: 'older', deadline, createdAt: new Date('2026-06-01') }),
      makeTask({ id: 'newer', deadline, createdAt: new Date('2026-06-03') }),
    ];

    expect(curateTasks(tasks).map((t) => t.id)).toEqual(['newer', 'older']);
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

    expect(curateTasks(tasks, { contexts: ['home'] }).map((t) => t.id)).toEqual([
      'phone-or-home',
      'home-only',
    ]);
  });

  it('always includes context-free tasks when filtering (doable anywhere)', () => {
    const tasks = [
      makeTask({ id: 'anywhere', contexts: null }),
      makeTask({ id: 'empty-list', contexts: '[]' }),
      makeTask({ id: 'laptop-only', contexts: '["laptop"]' }),
    ];

    expect(curateTasks(tasks, { contexts: ['home'] }).map((t) => t.id)).toEqual([
      'anywhere',
      'empty-list',
    ]);
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

    expect(curateTasks(tasks, { size: 'quick_win' }).map((t) => t.id)).toEqual([
      'quick',
      'unsized',
    ]);
    expect(curateTasks(tasks, { size: 'big_time' }).map((t) => t.id)).toEqual(['big', 'unsized']);
  });

  it('null/undefined mode keeps every size', () => {
    const tasks = [
      makeTask({ id: 'quick', size: 'quick_win', createdAt: new Date('2026-06-02') }),
      makeTask({ id: 'big', size: 'big_time', createdAt: new Date('2026-06-01') }),
    ];

    expect(curateTasks(tasks, { size: null }).map((t) => t.id)).toEqual(['quick', 'big']);
    expect(curateTasks(tasks, {}).map((t) => t.id)).toEqual(['quick', 'big']);
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
