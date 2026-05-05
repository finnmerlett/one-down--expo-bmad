import { describe, expect, test } from 'bun:test';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

import {
  TASK_CONTEXTS,
  TASK_SIZES,
  TASK_STATUSES,
  type LocalTask,
  type NewLocalTask,
  tasks,
} from './tasks';

describe('local tasks schema (sqlite)', () => {
  test('table is named "tasks"', () => {
    const config = getTableConfig(tasks);
    expect(config.name).toBe('tasks');
  });

  test('exposes all columns with snake_case sql names', () => {
    const config = getTableConfig(tasks);
    const byName = Object.fromEntries(config.columns.map((column) => [column.name, column]));

    expect(Object.keys(byName).sort()).toEqual([
      'contexts',
      'created_at',
      'deadline',
      'details',
      'has_check_needed',
      'id',
      'size',
      'status',
      'title',
      'updated_at',
    ]);

    expect(byName['id']?.primary).toBe(true);
    expect(byName['id']?.notNull).toBe(true);
    expect(byName['title']?.notNull).toBe(true);
    expect(byName['details']?.notNull).toBe(false);
    expect(byName['status']?.notNull).toBe(true);
    expect(byName['size']?.notNull).toBe(false);
    expect(byName['contexts']?.notNull).toBe(false);
    expect(byName['deadline']?.notNull).toBe(false);
    expect(byName['has_check_needed']?.notNull).toBe(true);
    expect(byName['created_at']?.notNull).toBe(true);
    expect(byName['updated_at']?.notNull).toBe(true);
  });

  test('inferred LocalTask / NewLocalTask types compile', () => {
    const example: LocalTask = {
      id: 'a',
      title: 't',
      details: null,
      status: 'pending',
      size: null,
      contexts: null,
      deadline: null,
      hasCheckNeeded: false,
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

  test('TASK_STATUSES contains valid status values', () => {
    expect(TASK_STATUSES).toEqual(['pending', 'in_progress', 'completed', 'cut_loose']);
  });

  test('TASK_SIZES contains valid size values', () => {
    expect(TASK_SIZES).toEqual(['quick_win', 'big_time']);
  });

  test('TASK_CONTEXTS contains valid context values', () => {
    expect(TASK_CONTEXTS).toEqual(['home', 'out_and_about', 'phone', 'laptop', 'internet']);
  });
});
