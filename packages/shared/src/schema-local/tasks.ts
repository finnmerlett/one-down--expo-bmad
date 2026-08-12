import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { TaskCriticality, TaskData, TaskSize, TaskStatus } from '../types/task';

// SQLite stores dates as epoch-ms integers ({ mode: 'timestamp_ms' } → Date in TS),
// booleans as 0/1 integers, and contexts as a JSON-encoded string array.
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  details: text('details'),
  notes: text('notes'),
  status: text('status').$type<TaskStatus>().notNull().default('pending'),
  size: text('size').$type<TaskSize>(),
  // How bad missing the deadline would be (9-5 item 15); null = chill.
  criticality: text('criticality').$type<TaskCriticality>(),
  contexts: text('contexts'),
  deadline: integer('deadline', { mode: 'timestamp_ms' }),
  hasCheckNeeded: integer('has_check_needed', { mode: 'boolean' }).notNull().default(false),
  // JSON-encoded TaskReviewFlags (Story 6.1) — which fields the AI inferred.
  reviewFlags: text('review_flags'),
  // Behavioral metadata (Story 6.4): increments must NOT bump updatedAt.
  skipCount: integer('skip_count').notNull().default(0),
  // Rolling skip window start (Story 7.2) — null = no active window.
  skipWindowStartedAt: integer('skip_window_started_at', { mode: 'timestamp_ms' }),
  // Last meaningful action (Story 7.2): start/edit/note — NOT mechanical
  // writes. Migration 0008 backfills existing rows from updated_at (best
  // available proxy); the $defaultFn covers fresh inserts.
  lastEngagedAt: integer('last_engaged_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
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
