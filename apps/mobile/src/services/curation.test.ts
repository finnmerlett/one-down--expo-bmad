import type { LocalTask } from '@one-down/shared/schema-local';

import { curateTasks } from './curation';

function makeTask(overrides: Partial<LocalTask> = {}): LocalTask {
  return {
    id: 'test-id',
    title: 'Test task',
    details: null,
    status: 'pending',
    size: null,
    contexts: null,
    deadline: null,
    hasCheckNeeded: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('curateTasks', () => {
  it('returns empty array for empty input', () => {
    expect(curateTasks([])).toEqual([]);
  });

  it('filters out non-pending tasks', () => {
    const tasks = [
      makeTask({ id: '1', status: 'pending' }),
      makeTask({ id: '2', status: 'completed' }),
      makeTask({ id: '3', status: 'in_progress' }),
      makeTask({ id: '4', status: 'cut_loose' }),
    ];
    const result = curateTasks(tasks);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('1');
  });

  it('returns all pending tasks when no contexts filter', () => {
    const tasks = [
      makeTask({ id: '1', status: 'pending' }),
      makeTask({ id: '2', status: 'pending' }),
    ];
    expect(curateTasks(tasks)).toHaveLength(2);
  });

  it('filters by active contexts when provided', () => {
    const tasks = [
      makeTask({ id: '1', contexts: '["home","phone"]' }),
      makeTask({ id: '2', contexts: '["laptop"]' }),
      makeTask({ id: '3', contexts: null }),
    ];
    const result = curateTasks(tasks, ['home']);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('includes tasks with null contexts when filtering (context-agnostic tasks)', () => {
    const tasks = [makeTask({ id: '1', contexts: null })];
    const result = curateTasks(tasks, ['phone']);
    expect(result).toHaveLength(1);
  });

  it('sorts tasks with deadlines before tasks without', () => {
    const tasks = [
      makeTask({ id: 'no-deadline', deadline: null, createdAt: new Date('2026-01-05') }),
      makeTask({
        id: 'has-deadline',
        deadline: new Date('2026-02-01'),
        createdAt: new Date('2026-01-01'),
      }),
    ];
    const result = curateTasks(tasks);
    expect(result[0]!.id).toBe('has-deadline');
    expect(result[1]!.id).toBe('no-deadline');
  });

  it('sorts tasks by soonest deadline first', () => {
    const tasks = [
      makeTask({ id: 'later', deadline: new Date('2026-03-01') }),
      makeTask({ id: 'sooner', deadline: new Date('2026-02-01') }),
    ];
    const result = curateTasks(tasks);
    expect(result[0]!.id).toBe('sooner');
    expect(result[1]!.id).toBe('later');
  });

  it('sorts by createdAt desc when deadlines are equal', () => {
    const tasks = [
      makeTask({ id: 'older', createdAt: new Date('2026-01-01') }),
      makeTask({ id: 'newer', createdAt: new Date('2026-01-05') }),
    ];
    const result = curateTasks(tasks);
    expect(result[0]!.id).toBe('newer');
    expect(result[1]!.id).toBe('older');
  });

  it('handles single task input', () => {
    const tasks = [makeTask({ id: 'only' })];
    const result = curateTasks(tasks);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('only');
  });
});
