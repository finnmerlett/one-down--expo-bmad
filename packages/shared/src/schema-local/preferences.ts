import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Generic local key-value store; values are JSON-encoded strings so any
// serializable preference shape fits without schema churn. First consumer:
// notification preferences (Story 8.1). Story 3.1's context persistence
// should REUSE this table rather than adding its own.
export const preferences = sqliteTable('preferences', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export type PreferenceRow = typeof preferences.$inferSelect;
export type NewPreferenceRow = typeof preferences.$inferInsert;
