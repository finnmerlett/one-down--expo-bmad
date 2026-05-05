import { describe, expect, test } from 'bun:test';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

import { type LocalTask, type NewLocalTask, tasks } from './tasks';

describe('local tasks schema (sqlite)', () => {
  test('table is named "tasks"', () => {
    const config = getTableConfig(tasks);
    expect(config.name).toBe('tasks');
  });

  test('exposes the local column subset with snake_case sql names', () => {
    const config = getTableConfig(tasks);
    const byName = Object.fromEntries(config.columns.map((column) => [column.name, column]));

    expect(Object.keys(byName).sort()).toEqual([
      'created_at',
      'details',
      'id',
      'title',
      'updated_at',
    ]);

    expect(byName['id']?.primary).toBe(true);
    expect(byName['id']?.notNull).toBe(true);
    expect(byName['title']?.notNull).toBe(true);
    expect(byName['details']?.notNull).toBe(false);
    expect(byName['created_at']?.notNull).toBe(true);
    expect(byName['updated_at']?.notNull).toBe(true);
  });

  test('inferred LocalTask / NewLocalTask types compile', () => {
    const example: LocalTask = {
      id: 'a',
      title: 't',
      details: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const draft: NewLocalTask = {
      id: 'b',
      title: 't',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(example.id).toBe('a');
    expect(draft.id).toBe('b');
  });
});
