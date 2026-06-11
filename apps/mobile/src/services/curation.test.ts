import type { TaskData } from '@one-down/shared';

import { curateTasks } from './curation';

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
  it('keeps only pending tasks', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'pending' }),
      makeTask({ id: 'b', status: 'completed' }),
      makeTask({ id: 'c', status: 'in_progress' }),
      makeTask({ id: 'd', status: 'cut_loose' }),
    ];

    expect(curateTasks(tasks).map((t) => t.id)).toEqual(['a']);
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

    expect(curateTasks(tasks, ['home']).map((t) => t.id)).toEqual(['phone-or-home', 'home-only']);
  });

  it('always includes context-free tasks when filtering (doable anywhere)', () => {
    const tasks = [
      makeTask({ id: 'anywhere', contexts: null }),
      makeTask({ id: 'empty-list', contexts: '[]' }),
      makeTask({ id: 'laptop-only', contexts: '["laptop"]' }),
    ];

    expect(curateTasks(tasks, ['home']).map((t) => t.id)).toEqual(['anywhere', 'empty-list']);
  });

  it('treats malformed contexts JSON as context-free rather than crashing', () => {
    const tasks = [makeTask({ id: 'broken', contexts: 'not-json' })];

    expect(curateTasks(tasks, ['home']).map((t) => t.id)).toEqual(['broken']);
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
