import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { SubtaskData, SubtaskSource } from '../types/subtask';

// Subtasks from accepted AI breakdowns / micro-task nudges (Stories 6.3/6.4).
// Synced to the pg mirror since Story 9.7. No FK constraint (matches the
// server table): tasks sync before subtasks, and tombstoned parents keep
// their rows anyway.
export const subtasks = sqliteTable(
  'subtasks',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    title: text('title').notNull(),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    orderIndex: integer('order_index').notNull(),
    source: text('source').$type<SubtaskSource>().notNull(),
    // Tombstone (Story 9.7) — same semantics as tasks.deletedAt.
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    // Schema-managed timestamps, same semantics as the tasks table.
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [index('idx_subtasks_task_id').on(table.taskId)],
);

export type SubtaskRow = typeof subtasks.$inferSelect;
export type NewSubtaskRow = typeof subtasks.$inferInsert;

// Compile-time conformance check: the table's select shape must be exactly
// SubtaskData (both directions). Fails to compile on any drift.
type AssertExact<A, B> = A extends B ? (B extends A ? true : false) : false;
type Expect<T extends true> = T;
type _SubtaskRowConformsToSubtaskData = Expect<AssertExact<SubtaskRow, SubtaskData>>;
