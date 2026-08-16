import { randomUUID } from 'expo-crypto';

import {
  preferences,
  starActivityLog,
  subtasks,
  syncMeta,
  taskOffers,
  tasks,
} from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';

import type { PreferencesDb } from './preferences-repository';

/**
 * Debugging state snapshot (Story 9.8, Keep F3): dump the ENTIRE local DB —
 * every table, tombstones included — as one JSON blob, upload it under a
 * client-generated uuid, and hand that uuid back for the user to quote in a
 * bug report. Deliberately outside the sync engine (9.7 freeze): a snapshot
 * is write-once evidence, not synced state.
 */
export interface SnapshotTransport {
  save: (input: { id: string; payload: string }) => Promise<{ id: string }>;
}

export async function captureStateSnapshot(
  db: PreferencesDb,
  transport: SnapshotTransport,
  capturedAt = new Date(),
): Promise<string> {
  const [taskRows, subtaskRows, ledgerRows, preferenceRows, offerRows, syncMetaRows] =
    await Promise.all([
      db.select().from(tasks),
      db.select().from(subtasks),
      db.select().from(starActivityLog),
      db.select().from(preferences),
      db.select().from(taskOffers),
      db.select().from(syncMeta),
    ]);

  // JSON.stringify serializes drizzle's Date values as ISO strings — the
  // blob is for a human with psql, not for machine round-tripping.
  const payload = JSON.stringify({
    schema: 'one-down-local@1',
    capturedAt: capturedAt.toISOString(),
    counts: {
      tasks: taskRows.length,
      subtasks: subtaskRows.length,
      starActivityLog: ledgerRows.length,
      preferences: preferenceRows.length,
      taskOffers: offerRows.length,
      syncMeta: syncMetaRows.length,
    },
    tables: {
      tasks: taskRows,
      subtasks: subtaskRows,
      starActivityLog: ledgerRows,
      preferences: preferenceRows,
      taskOffers: offerRows,
      syncMeta: syncMetaRows,
    },
  });

  const id = randomUUID();
  await transport.save({ id, payload });
  track('state_snapshot_saved', { bytes: payload.length });
  return id;
}
