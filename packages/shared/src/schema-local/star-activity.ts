import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { StarAction, StarActivityData } from '../types/star';

// Star transaction ledger (Story 4.1). Append-only in spirit: awards are
// inserted at completion/cut-loose time; totals (4.2) and the activity log
// (4.3) are derived by reading. The only "edit" is tombstoning (Story 9.7):
// the no-trace undo paths flip deletedAt instead of hard-deleting, so the
// removal syncs like any other row change.
export const starActivityLog = sqliteTable('star_activity_log', {
  id: text('id').primaryKey(),
  taskId: text('task_id'),
  taskTitle: text('task_title').notNull(),
  action: text('action').$type<StarAction>().notNull(),
  amount: integer('amount').notNull(),
  // Tombstone (Story 9.7) — same semantics as tasks.deletedAt.
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  // Content clock for sync LWW (Story 9.7) — only moves when deletedAt flips.
  // Migration 0011 backfills existing rows from created_at.
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type StarActivityRow = typeof starActivityLog.$inferSelect;
export type NewStarActivityRow = typeof starActivityLog.$inferInsert;

// Compile-time conformance check: the table's select shape must be exactly
// StarActivityData (both directions). Fails to compile on any drift.
type AssertExact<A, B> = A extends B ? (B extends A ? true : false) : false;
type Expect<T extends true> = T;
type _StarActivityRowConformsToStarActivityData = Expect<
  AssertExact<StarActivityRow, StarActivityData>
>;
