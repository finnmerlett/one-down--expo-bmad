import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Debugging snapshots (Story 9.8, F3) — a client-initiated dump of the whole
// local DB, stored verbatim as a JSON blob and referenced by its uuid. This
// table is SERVER-ONLY: it has no local mirror and is deliberately outside
// the sync engine (the 9.7 sync-complexity freeze). Rows are written once and
// only ever read by a human debugging with psql.
export const stateSnapshots = pgTable(
  'state_snapshots',
  {
    // Client-generated (crypto.randomUUID) — the uuid the user copies.
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    // JSON.stringify of the client's full local DB + metadata. Opaque blob;
    // never queried into, so text (not jsonb) keeps it byte-faithful.
    payload: text('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('idx_state_snapshots_user_id_created_at').on(table.userId, table.createdAt)],
);

export type StateSnapshotRow = typeof stateSnapshots.$inferSelect;
export type NewStateSnapshotRow = typeof stateSnapshots.$inferInsert;
