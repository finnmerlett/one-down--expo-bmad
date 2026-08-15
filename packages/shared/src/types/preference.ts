/**
 * Canonical preference shape (Story 9.7) — the wire/sync view of one
 * key-value row. BOTH table definitions must conform (AssertExact, same
 * pattern as TaskData): the `preferences` sqliteTable in `schema-local` and
 * the pg mirror in `schema`. Values are JSON-encoded strings; keys are
 * app-defined (e.g. 'ai.general_notes'), NOT uuids — every user legitimately
 * has the same keys, so preference sync matches on (userId, key).
 */
export interface PreferenceData {
  key: string;
  /** JSON-encoded value — any serializable preference shape fits. */
  value: string;
  /** Tombstone (Story 9.7): non-null = deleted; reads filter `deletedAt is null`. */
  deletedAt: Date | null;
  /** Content clock for sync LWW — stamped by setPreference on every write. */
  updatedAt: Date;
}
