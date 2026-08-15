import { and, eq, isNull } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { preferences } from '@one-down/shared/schema-local';

// Same injectable-db pattern as tasks-repository: tests pass the
// better-sqlite3-backed test db (same schema, real SQL).
export type PreferencesDb = BaseSQLiteDatabase<'sync' | 'async', unknown, Record<string, unknown>>;

/**
 * Read a JSON-encoded preference. Unknown keys, tombstoned rows (Story 9.7),
 * and malformed stored values all resolve to null — callers fall back to
 * their defaults, a corrupt row never crashes a screen.
 */
export async function getPreference<T>(db: PreferencesDb, key: string): Promise<T | null> {
  const rows = await db
    .select({ value: preferences.value })
    .from(preferences)
    .where(and(eq(preferences.key, key), isNull(preferences.deletedAt)))
    .limit(1);
  const raw = rows[0]?.value;
  if (raw === undefined) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Upsert a JSON-encoded preference (last write wins, stamps updatedAt).
 *  Writing a key revives a tombstoned row — a set IS the opposite of a delete. */
export async function setPreference<T>(db: PreferencesDb, key: string, value: T): Promise<void> {
  const now = new Date();
  const encoded = JSON.stringify(value);
  await db
    .insert(preferences)
    .values({ key, value: encoded, updatedAt: now })
    .onConflictDoUpdate({
      target: preferences.key,
      set: { value: encoded, deletedAt: null, updatedAt: now },
    });
}
