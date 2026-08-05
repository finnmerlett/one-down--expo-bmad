import { and, eq, gt, sql } from 'drizzle-orm';

import type { TaskData, TaskUpsert } from '@one-down/shared';
import { tasks } from '@one-down/shared/schema';

import type { DbClient } from '../db/client';

// Timestamp-based sync, tasks table only ("last-content-changed wins",
// Story 5.3). Whole-row resolution on the client-set content clock
// `updatedAt`; `syncedAt` is the server write clock the pull cursor keys on.

export interface PushResult {
  /** Ids inserted or updated (incoming row won). */
  applied: string[];
  /** Ids skipped — the server copy is already newer/equal; the authoritative
   *  row reaches the client via pull. */
  stale: string[];
  /** Ids refused — the id exists under ANOTHER user (uuid collision across
   *  tenants). Never reveals anything about the existing row. */
  rejected: string[];
}

export interface PullResult {
  tasks: TaskData[];
  /** Database clock read in the same transaction — the client's next cursor. */
  serverTime: Date;
}

/** Strip the server-only columns — the wire shape is exactly TaskData. */
function toTaskData(row: typeof tasks.$inferSelect): TaskData {
  const { userId: _userId, syncedAt: _syncedAt, ...data } = row;
  return data;
}

export async function pushTasks(
  db: DbClient,
  userId: string,
  incoming: TaskUpsert[],
): Promise<PushResult> {
  const applied: string[] = [];
  const stale: string[] = [];
  const rejected: string[] = [];

  await db.transaction(async (tx) => {
    for (const row of incoming) {
      // Select by id ACROSS users deliberately: a row owned by someone else
      // must reject the push (composite PK would otherwise happily insert a
      // second copy under this user — an id-collision trap for future sync).
      const existing = await tx.select().from(tasks).where(eq(tasks.id, row.id));
      const own = existing.find((candidate) => candidate.userId === userId);
      if (!own && existing.length > 0) {
        rejected.push(row.id);
        continue;
      }

      // DB clock, not new Date(): the pull cursor is handed out from
      // Postgres now(), so stamping writes from the app-server clock lets
      // skew hide rows from the next pull (and flaked the since-boundary
      // test). One clock for both sides; now() is fixed per transaction.
      const syncedAt = sql`now()`;
      if (!own) {
        // userId ALWAYS from the authenticated ctx — never a client value.
        await tx.insert(tasks).values({ ...row, userId, syncedAt });
        applied.push(row.id);
      } else if (row.updatedAt > own.updatedAt) {
        // Explicit updatedAt (the incoming content clock) wins over $onUpdate.
        await tx
          .update(tasks)
          .set({
            title: row.title,
            details: row.details,
            notes: row.notes,
            status: row.status,
            size: row.size,
            contexts: row.contexts,
            deadline: row.deadline,
            hasCheckNeeded: row.hasCheckNeeded,
            reviewFlags: row.reviewFlags,
            skipCount: row.skipCount,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            syncedAt,
          })
          .where(and(eq(tasks.userId, userId), eq(tasks.id, row.id)));
        applied.push(row.id);
      } else {
        stale.push(row.id);
      }
    }
  });

  return { applied, stale, rejected };
}

export async function pullTasks(
  db: DbClient,
  userId: string,
  since: Date | null,
): Promise<PullResult> {
  return db.transaction(async (tx) => {
    // Same-transaction now(): the cursor can never run ahead of the rows it
    // was read with. Raw execute() skips drizzle's type mapping, so read the
    // clock as an epoch-ms number instead of a driver-dependent string.
    const timeRows = await tx.execute<{ now_ms: number | string }>(
      sql`select (extract(epoch from now()) * 1000) as now_ms`,
    );
    const nowMs = Number(timeRows[0]?.now_ms);
    if (!Number.isFinite(nowMs)) {
      throw new Error('pullTasks: could not read the database clock');
    }
    const serverTime = new Date(Math.floor(nowMs));

    const rows = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), since === null ? undefined : gt(tasks.syncedAt, since)));

    return { tasks: rows.map(toTaskData), serverTime };
  });
}
