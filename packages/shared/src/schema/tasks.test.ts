import { describe, expect, test } from 'bun:test';
import { getTableConfig } from 'drizzle-orm/pg-core';

import { tasks, type NewTask, type Task } from './tasks';

describe('tasks schema', () => {
  test('table is named "tasks"', () => {
    const config = getTableConfig(tasks);
    expect(config.name).toBe('tasks');
  });

  test('exposes the canonical column set with snake_case sql names', () => {
    const config = getTableConfig(tasks);
    const byName = Object.fromEntries(config.columns.map((column) => [column.name, column]));

    expect(Object.keys(byName).sort()).toEqual([
      'content',
      'created_at',
      'id',
      'status',
      'updated_at',
      'user_id',
    ]);

    expect(byName['id']?.primary).toBe(true);
    expect(byName['user_id']?.notNull).toBe(true);
    expect(byName['content']?.notNull).toBe(true);
    expect(byName['status']?.notNull).toBe(true);
    expect(byName['created_at']?.notNull).toBe(true);
    expect(byName['updated_at']?.notNull).toBe(true);
  });

  test('inferred Task and NewTask types compile and are usable', () => {
    const example: Task = {
      id: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000001',
      content: 'sample',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const draft: NewTask = {
      id: '00000000-0000-0000-0000-000000000002',
      userId: '00000000-0000-0000-0000-000000000003',
      content: 'sample',
      status: 'pending',
    };

    expect(example.id).toBe('00000000-0000-0000-0000-000000000000');
    expect(draft.content).toBe('sample');
  });
});
