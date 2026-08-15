import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { SubtaskData, SubtaskSource } from '../types/subtask';

// Server-side mirror of the local subtasks table (Story 9.7) — same canonical
// SubtaskData shape plus `userId` / `syncedAt`, same conventions as the tasks
// mirror: client-minted ids accepted as-is, composite (userId, id) PK,
// pull-cursor index on (userId, syncedAt). Deliberately NO FK to tasks —
// matches the local schema, and sync applies tasks before subtasks anyway.
export const subtasks = pgTable(
  'subtasks',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    taskId: uuid('task_id').notNull(),
    title: text('title').notNull(),
    completed: boolean('completed').notNull().default(false),
    orderIndex: integer('order_index').notNull(),
    source: text('source').$type<SubtaskSource>().notNull(),
    // Tombstone (Story 9.7) — mirrors schema-local.
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
    // Schema-managed timestamps — same explicit-value-wins semantics as tasks.
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    // Server-clock write stamp — the pull cursor keys on this (see tasks).
    syncedAt: timestamp('synced_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index('idx_subtasks_user_id_synced_at').on(table.userId, table.syncedAt),
  ],
);

export type ServerSubtaskRow = typeof subtasks.$inferSelect;
export type NewServerSubtaskRow = typeof subtasks.$inferInsert;

// Compile-time conformance check: apart from the server-only `userId` and
// `syncedAt`, the server row must be exactly SubtaskData (both directions).
type AssertExact<A, B> = A extends B ? (B extends A ? true : false) : false;
type Expect<T extends true> = T;
type _ServerSubtaskRowConformsToSubtaskData = Expect<
  AssertExact<Omit<ServerSubtaskRow, 'userId' | 'syncedAt'>, SubtaskData>
>;
