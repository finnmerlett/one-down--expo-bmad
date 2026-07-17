import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { TaskData, TaskSize, TaskStatus } from '../types/task';

// SQLite stores dates as epoch-ms integers ({ mode: 'timestamp_ms' } → Date in TS),
// booleans as 0/1 integers, and contexts as a JSON-encoded string array.
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  details: text('details'),
  notes: text('notes'),
  status: text('status').$type<TaskStatus>().notNull().default('pending'),
  size: text('size').$type<TaskSize>(),
  contexts: text('contexts'),
  deadline: integer('deadline', { mode: 'timestamp_ms' }),
  hasCheckNeeded: integer('has_check_needed', { mode: 'boolean' }).notNull().default(false),
  // JSON-encoded TaskReviewFlags (Story 6.1) — which fields the AI inferred.
  reviewFlags: text('review_flags'),
  // Timestamps are schema-managed (Story 5.3 pre-work) so updatedAt can never
  // be forgotten. CRITICAL drizzle semantics the sync-apply path relies on:
  // an explicit value in .values()/.set() WINS over $defaultFn/$onUpdate —
  // pulled rows keep their exact server timestamps, never re-stamped.
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

// Compile-time conformance check: the table's select shape must be exactly
// TaskData (both directions). Fails to compile on any drift.
type AssertExact<A, B> = A extends B ? (B extends A ? true : false) : false;
type Expect<T extends true> = T;
type _TaskRowConformsToTaskData = Expect<AssertExact<TaskRow, TaskData>>;
