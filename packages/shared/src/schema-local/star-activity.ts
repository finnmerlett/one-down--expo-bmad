import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { StarAction, StarActivityData } from '../types/star';

// Star transaction ledger (Story 4.1). Append-only: awards are inserted at
// completion/cut-loose time; totals (4.2) and the activity log (4.3) are
// derived by reading, never by updating rows.
export const starActivityLog = sqliteTable('star_activity_log', {
  id: text('id').primaryKey(),
  taskId: text('task_id'),
  taskTitle: text('task_title').notNull(),
  action: text('action').$type<StarAction>().notNull(),
  amount: integer('amount').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
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
