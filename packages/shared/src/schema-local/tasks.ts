import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cut_loose'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_SIZES = ['quick_win', 'big_time'] as const;
export type TaskSize = (typeof TASK_SIZES)[number];

export const TASK_CONTEXTS = ['home', 'out_and_about', 'phone', 'laptop', 'internet'] as const;
export type TaskContext = (typeof TASK_CONTEXTS)[number];

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  details: text('details'),
  status: text('status').notNull().default('pending'),
  size: text('size'),
  contexts: text('contexts'),
  deadline: integer('deadline', { mode: 'timestamp_ms' }),
  hasCheckNeeded: integer('has_check_needed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export type LocalTask = typeof tasks.$inferSelect;
export type NewLocalTask = typeof tasks.$inferInsert;
