import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { PreferenceData } from '../types/preference';

// Generic key-value store; values are JSON-encoded strings so any
// serializable preference shape fits without schema churn. First consumer:
// notification preferences (Story 8.1). Story 3.1's context persistence
// should REUSE this table rather than adding its own. Synced to the pg
// mirror since Story 9.7 (carries the AI general notes across devices).
export const preferences = sqliteTable('preferences', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  // Tombstone (Story 9.7) — no delete path writes it today; it exists so a
  // future removal syncs, and setPreference revives tombstoned keys.
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export type PreferenceRow = typeof preferences.$inferSelect;
export type NewPreferenceRow = typeof preferences.$inferInsert;

// Compile-time conformance check: the table's select shape must be exactly
// PreferenceData (both directions). Fails to compile on any drift.
type AssertExact<A, B> = A extends B ? (B extends A ? true : false) : false;
type Expect<T extends true> = T;
type _PreferenceRowConformsToPreferenceData = Expect<AssertExact<PreferenceRow, PreferenceData>>;
