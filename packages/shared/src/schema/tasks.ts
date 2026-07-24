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

import type { TaskData, TaskSize, TaskStatus } from '../types/task';

// Server-side mirror of the local tasks table (schema-local). Same canonical
// TaskData shape — the Postgres copy is a 1:1 backup of local data — plus
// `userId` for multi-tenancy. Dates use `timestamptz` (epoch-ms integers on
// SQLite); `contexts` stays a JSON-encoded string to keep the shapes identical.
export const tasks = pgTable(
  'tasks',
  {
    // Client-generated UUID accepted as-is — deliberately NO defaultRandom():
    // the server must never mint or reassign task ids.
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    title: text('title').notNull(),
    details: text('details'),
    notes: text('notes'),
    status: text('status').$type<TaskStatus>().notNull().default('pending'),
    size: text('size').$type<TaskSize>(),
    contexts: text('contexts'),
    deadline: timestamp('deadline', { withTimezone: true, mode: 'date' }),
    hasCheckNeeded: boolean('has_check_needed').notNull().default(false),
    // JSON-encoded TaskReviewFlags (Story 6.1) — mirrors schema-local.
    reviewFlags: text('review_flags'),
    // Behavioral metadata (Story 6.4) — mirrors schema-local.
    skipCount: integer('skip_count').notNull().default(0),
    // Rolling skip window start (Story 7.2) — mirrors schema-local.
    skipWindowStartedAt: timestamp('skip_window_started_at', { withTimezone: true, mode: 'date' }),
    // Last meaningful action (Story 7.2) — mirrors schema-local; migration
    // 0003 backfills existing rows from updated_at.
    lastEngagedAt: timestamp('last_engaged_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .$defaultFn(() => new Date()),
    // Schema-managed timestamps (Story 5.3 pre-work) — mirrors schema-local.
    // Explicit values in .values()/.set() win over $defaultFn/$onUpdate, so
    // sync writes always carry the client's content-change clock unchanged.
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    // Server-clock WRITE stamp (distinct from the content-clock updatedAt) —
    // the pull cursor keys on this, so a stale-clocked client can never hide
    // rows from other devices.
    syncedAt: timestamp('synced_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    // Composite PK: ids are client-minted, so global uniqueness cannot be
    // trusted across tenants — scoping the PK by user_id means a malicious
    // client reusing another user's task UUID can neither collide with nor
    // probe for it, and per-user sync queries (`where user_id = ?`) ride the
    // PK's leading column. All Story 5.3 reads/writes MUST still be scoped by
    // the authenticated ctx.userId, never by id alone.
    primaryKey({ columns: [table.userId, table.id] }),
    // Pull queries filter `user_id = ? AND synced_at > ?` (Story 5.3).
    index('idx_tasks_user_id_synced_at').on(table.userId, table.syncedAt),
  ],
);

export type ServerTaskRow = typeof tasks.$inferSelect;
export type NewServerTaskRow = typeof tasks.$inferInsert;

// Compile-time conformance check: apart from the server-only `userId` and
// `syncedAt`, the server row must be exactly TaskData (both directions) —
// same guarantee schema-local enforces.
type AssertExact<A, B> = A extends B ? (B extends A ? true : false) : false;
type Expect<T extends true> = T;
type _ServerTaskRowConformsToTaskData = Expect<
  AssertExact<Omit<ServerTaskRow, 'userId' | 'syncedAt'>, TaskData>
>;
