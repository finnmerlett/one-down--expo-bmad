import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { StarAction, StarActivityData } from '../types/star';

// Server-side mirror of the local star_activity_log table (Story 9.7) — same
// canonical StarActivityData shape plus `userId` / `syncedAt`, same
// conventions as the tasks mirror. `taskId` is plain text, NOT uuid: local
// rows use '' for queue-level awards (triage_confirmed) and null after task
// deletion — it's a loose display reference, never a key. IMMUTABLE
// (9.7 convention pass): rows are only ever inserted — undo is a
// compensating row, so sync for this entity is insert-only.
export const starActivityLog = pgTable(
  'star_activity_log',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    taskId: text('task_id'),
    taskTitle: text('task_title').notNull(),
    action: text('action').$type<StarAction>().notNull(),
    amount: integer('amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    // Server-clock write stamp — the pull cursor keys on this (see tasks).
    syncedAt: timestamp('synced_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index('idx_star_activity_user_id_synced_at').on(table.userId, table.syncedAt),
  ],
);

export type ServerStarActivityRow = typeof starActivityLog.$inferSelect;
export type NewServerStarActivityRow = typeof starActivityLog.$inferInsert;

// Compile-time conformance check: apart from the server-only `userId` and
// `syncedAt`, the server row must be exactly StarActivityData (both directions).
type AssertExact<A, B> = A extends B ? (B extends A ? true : false) : false;
type Expect<T extends true> = T;
type _ServerStarActivityRowConformsToStarActivityData = Expect<
  AssertExact<Omit<ServerStarActivityRow, 'userId' | 'syncedAt'>, StarActivityData>
>;
