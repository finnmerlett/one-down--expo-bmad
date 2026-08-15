import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PreferenceData } from '../types/preference';

// Server-side mirror of the local preferences table (Story 9.7) — same
// canonical PreferenceData shape plus `userId` / `syncedAt`. Keys are
// app-defined strings ('ai.general_notes', 'notifications.prefs', ...), NOT
// uuids: every user legitimately holds the same keys, so the PK is
// (userId, key) and — unlike the uuid-keyed entities — there is no
// cross-tenant collision to reject.
export const preferences = pgTable(
  'preferences',
  {
    userId: uuid('user_id').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    // Tombstone (Story 9.7) — mirrors schema-local.
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
    // Content clock for sync LWW — stamped by the client's setPreference.
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
    // Server-clock write stamp — the pull cursor keys on this (see tasks).
    syncedAt: timestamp('synced_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.key] }),
    index('idx_preferences_user_id_synced_at').on(table.userId, table.syncedAt),
  ],
);

export type ServerPreferenceRow = typeof preferences.$inferSelect;
export type NewServerPreferenceRow = typeof preferences.$inferInsert;

// Compile-time conformance check: apart from the server-only `userId` and
// `syncedAt`, the server row must be exactly PreferenceData (both directions).
type AssertExact<A, B> = A extends B ? (B extends A ? true : false) : false;
type Expect<T extends true> = T;
type _ServerPreferenceRowConformsToPreferenceData = Expect<
  AssertExact<Omit<ServerPreferenceRow, 'userId' | 'syncedAt'>, PreferenceData>
>;
