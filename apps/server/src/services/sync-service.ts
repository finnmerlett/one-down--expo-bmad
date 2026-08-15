import { and, eq, gt, sql, type SQL } from 'drizzle-orm';

import type {
  PreferenceData,
  PreferenceUpsert,
  StarActivityData,
  StarActivityUpsert,
  SubtaskData,
  SubtaskUpsert,
  TaskData,
  TaskUpsert,
} from '@one-down/shared';
import { preferences, starActivityLog, subtasks, tasks } from '@one-down/shared/schema';

import type { DbClient } from '../db/client';

// Timestamp-based sync ("last-content-changed wins", Story 5.3; generalized
// to four entities in Story 9.7: tasks, subtasks, star ledger, preferences).
// Whole-row resolution on the client-set content clock `updatedAt`;
// `syncedAt` is the server write clock the pull cursors key on. Deletion is
// a tombstone (`deletedAt`) riding the same rules — the server NEVER runs a
// SQL DELETE on synced rows.

export interface PushResult {
  /** Ids inserted or updated (incoming row won). */
  applied: string[];
  /** Ids skipped — the server copy is already newer/equal; the authoritative
   *  row reaches the client via pull. */
  stale: string[];
  /** Ids refused — the id exists under ANOTHER user (uuid collision across
   *  tenants). Never reveals anything about the existing row. Preferences
   *  can't hit this: their PK is (userId, key), keys collide by design. */
  rejected: string[];
}

export interface PullResult<T> {
  rows: T[];
  /** Database clock read in the same transaction — the client's next cursor. */
  serverTime: Date;
}

type Tx = Parameters<Parameters<DbClient['transaction']>[0]>[0];

/**
 * The per-entity seam: the shared core below owns the transaction, the LWW
 * comparison, and the cross-tenant rejection; adapters own the fully-typed
 * drizzle statements (which columns exist is an entity decision, not a sync
 * decision) and the content clock (`updatedAt` for mutable entities;
 * `createdAt` for the immutable star ledger — an existing ledger row always
 * compares clock-equal, so re-pushes are stale echoes and the update arm
 * never runs).
 */
interface PushAdapter<T> {
  getId(row: T): string;
  /** The row's content clock — what "newer wins" compares. */
  clockOf(row: T): Date;
  /** Rows with this id ACROSS users (uuid entities) so a foreign owner
   *  rejects the push; preferences scope to the caller (keys collide by design). */
  findExisting(tx: Tx, userId: string, row: T): Promise<{ userId: string; clock: Date }[]>;
  insert(tx: Tx, userId: string, row: T, syncedAt: SQL): Promise<void>;
  update(tx: Tx, userId: string, row: T, syncedAt: SQL): Promise<void>;
}

async function pushRows<T>(
  db: DbClient,
  userId: string,
  incoming: T[],
  adapter: PushAdapter<T>,
): Promise<PushResult> {
  const applied: string[] = [];
  const stale: string[] = [];
  const rejected: string[] = [];

  await db.transaction(async (tx) => {
    for (const row of incoming) {
      const id = adapter.getId(row);
      const existing = await adapter.findExisting(tx, userId, row);
      const own = existing.find((candidate) => candidate.userId === userId);
      if (!own && existing.length > 0) {
        rejected.push(id);
        continue;
      }

      // DB clock, not new Date(): the pull cursor is handed out from
      // Postgres now(), so stamping writes from the app-server clock lets
      // skew hide rows from the next pull. now() is fixed per transaction.
      const syncedAt = sql`now()`;
      if (!own) {
        await adapter.insert(tx, userId, row, syncedAt);
        applied.push(id);
      } else if (adapter.clockOf(row) > own.clock) {
        await adapter.update(tx, userId, row, syncedAt);
        applied.push(id);
      } else {
        stale.push(id);
      }
    }
  });

  return { applied, stale, rejected };
}

async function pullRows<T>(db: DbClient, select: (tx: Tx) => Promise<T[]>): Promise<PullResult<T>> {
  return db.transaction(async (tx) => {
    // Same-transaction now(): the cursor can never run ahead of the rows it
    // was read with. Raw execute() skips drizzle's type mapping, so read the
    // clock as an epoch-ms number instead of a driver-dependent string.
    const timeRows = await tx.execute<{ now_ms: number | string }>(
      sql`select (extract(epoch from now()) * 1000) as now_ms`,
    );
    const nowMs = Number(timeRows[0]?.now_ms);
    if (!Number.isFinite(nowMs)) {
      throw new Error('pull: could not read the database clock');
    }
    const serverTime = new Date(Math.floor(nowMs));

    return { rows: await select(tx), serverTime };
  });
}

// ---------------------------------------------------------------------------
// Tasks (Story 5.3 — wire shape and result keys are load-bearing for old
// clients; sync.push/sync.pull must keep behaving exactly as before).

/** Strip the server-only columns — the wire shape is exactly TaskData. */
function toTaskData(row: typeof tasks.$inferSelect): TaskData {
  const { userId: _userId, syncedAt: _syncedAt, ...data } = row;
  return data;
}

export function pushTasks(db: DbClient, userId: string, incoming: TaskUpsert[]) {
  return pushRows(db, userId, incoming, {
    getId: (row) => row.id,
    clockOf: (row) => row.updatedAt,
    // Select by id ACROSS users deliberately: a row owned by someone else
    // must reject the push (composite PK would otherwise happily insert a
    // second copy under this user — an id-collision trap).
    findExisting: (tx, _userId, row) =>
      tx
        .select({ userId: tasks.userId, clock: tasks.updatedAt })
        .from(tasks)
        .where(eq(tasks.id, row.id)),
    // userId ALWAYS from the authenticated ctx — never a client value.
    insert: async (tx, uid, row, syncedAt) => {
      await tx.insert(tasks).values({ ...row, userId: uid, syncedAt });
    },
    // Explicit updatedAt (the incoming content clock) wins over $onUpdate.
    update: async (tx, uid, row, syncedAt) => {
      await tx
        .update(tasks)
        .set({
          title: row.title,
          details: row.details,
          notes: row.notes,
          status: row.status,
          size: row.size,
          criticality: row.criticality,
          contexts: row.contexts,
          deadline: row.deadline,
          hasCheckNeeded: row.hasCheckNeeded,
          reviewFlags: row.reviewFlags,
          skipCount: row.skipCount,
          skipWindowStartedAt: row.skipWindowStartedAt,
          lastEngagedAt: row.lastEngagedAt,
          deletedAt: row.deletedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          syncedAt,
        })
        .where(and(eq(tasks.userId, uid), eq(tasks.id, row.id)));
    },
  });
}

/** Legacy result shape ({ tasks }, not { rows }) — old clients depend on it. */
export async function pullTasks(
  db: DbClient,
  userId: string,
  since: Date | null,
): Promise<{ tasks: TaskData[]; serverTime: Date }> {
  const { rows, serverTime } = await pullRows(db, (tx) =>
    tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), since === null ? undefined : gt(tasks.syncedAt, since))),
  );
  return { tasks: rows.map(toTaskData), serverTime };
}

// ---------------------------------------------------------------------------
// Subtasks (Story 9.7)

function toSubtaskData(row: typeof subtasks.$inferSelect): SubtaskData {
  const { userId: _userId, syncedAt: _syncedAt, ...data } = row;
  return data;
}

export function pushSubtasks(db: DbClient, userId: string, incoming: SubtaskUpsert[]) {
  return pushRows(db, userId, incoming, {
    getId: (row) => row.id,
    clockOf: (row) => row.updatedAt,
    findExisting: (tx, _userId, row) =>
      tx
        .select({ userId: subtasks.userId, clock: subtasks.updatedAt })
        .from(subtasks)
        .where(eq(subtasks.id, row.id)),
    insert: async (tx, uid, row, syncedAt) => {
      await tx.insert(subtasks).values({ ...row, userId: uid, syncedAt });
    },
    update: async (tx, uid, row, syncedAt) => {
      await tx
        .update(subtasks)
        .set({
          taskId: row.taskId,
          title: row.title,
          completed: row.completed,
          orderIndex: row.orderIndex,
          source: row.source,
          deletedAt: row.deletedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          syncedAt,
        })
        .where(and(eq(subtasks.userId, uid), eq(subtasks.id, row.id)));
    },
  });
}

export async function pullSubtasks(
  db: DbClient,
  userId: string,
  since: Date | null,
): Promise<PullResult<SubtaskData>> {
  const { rows, serverTime } = await pullRows(db, (tx) =>
    tx
      .select()
      .from(subtasks)
      .where(
        and(eq(subtasks.userId, userId), since === null ? undefined : gt(subtasks.syncedAt, since)),
      ),
  );
  return { rows: rows.map(toSubtaskData), serverTime };
}

// ---------------------------------------------------------------------------
// Star activity ledger (Story 9.7)

function toStarActivityData(row: typeof starActivityLog.$inferSelect): StarActivityData {
  const { userId: _userId, syncedAt: _syncedAt, ...data } = row;
  return data;
}

// Insert-only in practice: ledger rows are immutable, so an existing own row
// always compares clock-equal → stale echo. The update arm is unreachable but
// kept whole-row for seam symmetry.
export function pushStarActivity(db: DbClient, userId: string, incoming: StarActivityUpsert[]) {
  return pushRows(db, userId, incoming, {
    getId: (row) => row.id,
    clockOf: (row) => row.createdAt,
    findExisting: (tx, _userId, row) =>
      tx
        .select({ userId: starActivityLog.userId, clock: starActivityLog.createdAt })
        .from(starActivityLog)
        .where(eq(starActivityLog.id, row.id)),
    insert: async (tx, uid, row, syncedAt) => {
      await tx.insert(starActivityLog).values({ ...row, userId: uid, syncedAt });
    },
    update: async (tx, uid, row, syncedAt) => {
      await tx
        .update(starActivityLog)
        .set({
          taskId: row.taskId,
          taskTitle: row.taskTitle,
          action: row.action,
          amount: row.amount,
          createdAt: row.createdAt,
          syncedAt,
        })
        .where(and(eq(starActivityLog.userId, uid), eq(starActivityLog.id, row.id)));
    },
  });
}

export async function pullStarActivity(
  db: DbClient,
  userId: string,
  since: Date | null,
): Promise<PullResult<StarActivityData>> {
  const { rows, serverTime } = await pullRows(db, (tx) =>
    tx
      .select()
      .from(starActivityLog)
      .where(
        and(
          eq(starActivityLog.userId, userId),
          since === null ? undefined : gt(starActivityLog.syncedAt, since),
        ),
      ),
  );
  return { rows: rows.map(toStarActivityData), serverTime };
}

// ---------------------------------------------------------------------------
// Preferences (Story 9.7) — keyed by (userId, key), so `findExisting` scopes
// to the caller and the cross-tenant rejection path can never fire.

function toPreferenceData(row: typeof preferences.$inferSelect): PreferenceData {
  const { userId: _userId, syncedAt: _syncedAt, ...data } = row;
  return data;
}

export function pushPreferences(db: DbClient, userId: string, incoming: PreferenceUpsert[]) {
  return pushRows(db, userId, incoming, {
    getId: (row) => row.key,
    clockOf: (row) => row.updatedAt,
    findExisting: (tx, uid, row) =>
      tx
        .select({ userId: preferences.userId, clock: preferences.updatedAt })
        .from(preferences)
        .where(and(eq(preferences.userId, uid), eq(preferences.key, row.key))),
    insert: async (tx, uid, row, syncedAt) => {
      await tx.insert(preferences).values({ ...row, userId: uid, syncedAt });
    },
    update: async (tx, uid, row, syncedAt) => {
      await tx
        .update(preferences)
        .set({
          value: row.value,
          deletedAt: row.deletedAt,
          updatedAt: row.updatedAt,
          syncedAt,
        })
        .where(and(eq(preferences.userId, uid), eq(preferences.key, row.key)));
    },
  });
}

export async function pullPreferences(
  db: DbClient,
  userId: string,
  since: Date | null,
): Promise<PullResult<PreferenceData>> {
  const { rows, serverTime } = await pullRows(db, (tx) =>
    tx
      .select()
      .from(preferences)
      .where(
        and(
          eq(preferences.userId, userId),
          since === null ? undefined : gt(preferences.syncedAt, since),
        ),
      ),
  );
  return { rows: rows.map(toPreferenceData), serverTime };
}
