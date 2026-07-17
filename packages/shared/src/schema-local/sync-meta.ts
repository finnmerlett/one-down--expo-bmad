import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Sync cursors (Story 5.3) — a singleton row (id = 'singleton'). `userId` is
// the account the cursors belong to: when the session user differs, both
// cursors reset so a fresh full sync merges device data into the new account
// (deliberate, documented behaviour).
export const syncMeta = sqliteTable('sync_meta', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  /** Content-clock high-water mark of rows already pushed (max updatedAt). */
  lastPushedAt: integer('last_pushed_at', { mode: 'timestamp_ms' }),
  /** Server-clock cursor for pulls (serverTime - overlap, set after each pull). */
  pullCursor: integer('pull_cursor', { mode: 'timestamp_ms' }),
});

export type SyncMetaRow = typeof syncMeta.$inferSelect;
