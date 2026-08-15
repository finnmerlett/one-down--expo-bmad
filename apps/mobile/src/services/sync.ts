import { eq, gt } from 'drizzle-orm';

import type { PreferenceData, StarActivityData, SubtaskData, TaskData } from '@one-down/shared';
import {
  preferences,
  starActivityLog,
  subtasks,
  syncMeta,
  tasks,
} from '@one-down/shared/schema-local';

import type { TasksDb } from './tasks-repository';

// Client half of the timestamp-based sync (Story 5.3; generalized to four
// entities in Story 9.7). Pure logic over an injected db + transport so
// integration tests run against real SQLite with a stubbed network boundary.

export interface PushResponse {
  applied: string[];
  stale: string[];
  rejected: string[];
}

export interface PullResponse<Row> {
  rows: Row[];
  serverTime: Date;
}

export interface SyncTransport {
  pushTasks(rows: TaskData[]): Promise<PushResponse>;
  pullTasks(since: Date | null): Promise<PullResponse<TaskData>>;
  pushSubtasks(rows: SubtaskData[]): Promise<PushResponse>;
  pullSubtasks(since: Date | null): Promise<PullResponse<SubtaskData>>;
  pushStarActivity(rows: StarActivityData[]): Promise<PushResponse>;
  pullStarActivity(since: Date | null): Promise<PullResponse<StarActivityData>>;
  pushPreferences(rows: PreferenceData[]): Promise<PushResponse>;
  pullPreferences(since: Date | null): Promise<PullResponse<PreferenceData>>;
}

export interface SyncSession {
  userId: string;
}

export interface EntityOutcome {
  pushed: number;
  pulled: number;
}

/** Entity keys double as the per-entity `sync_meta` row ids. */
export const SYNC_ENTITIES = ['tasks', 'subtasks', 'star_activity', 'preferences'] as const;
export type SyncEntityKey = (typeof SYNC_ENTITIES)[number];

export interface SyncOutcome {
  /** Totals across all entities. */
  pushed: number;
  pulled: number;
  entities: Record<SyncEntityKey, EntityOutcome>;
}

// Pull cursor safety overlap for commit races — re-delivery is harmless
// because apply is idempotent (echoes skip on updatedAt >=).
const PULL_CURSOR_OVERLAP_MS = 2_000;
// Server input caps push batches at 500 rows.
const PUSH_BATCH_LIMIT = 500;

/**
 * The per-entity seam: the shared loop below owns cursors, batching, and the
 * LWW apply; adapters own the fully-typed drizzle statements, the match key
 * (uuid `id` everywhere except preferences, which match on `key`), and the
 * content clock (`updatedAt` for mutable entities; `createdAt` for the
 * immutable star ledger, whose rows never change after insert).
 */
interface EntityAdapter<Row> {
  metaId: SyncEntityKey;
  /** The row's content clock — drives the push high-water mark and LWW. */
  clockOf(row: Row): Date;
  changedSince(db: TasksDb, since: Date | null): Promise<Row[]>;
  push(transport: SyncTransport, rows: Row[]): Promise<unknown>;
  pull(transport: SyncTransport, since: Date | null): Promise<PullResponse<Row>>;
  findLocal(db: TasksDb, incoming: Row): Promise<Row | undefined>;
  insertLocal(db: TasksDb, incoming: Row): Promise<void>;
  updateLocal(db: TasksDb, incoming: Row): Promise<void>;
}

/**
 * One entity's push-then-pull round (the Story 5.3 loop, unchanged):
 * (1) read/repair cursors — a different (or first) user resets both, so the
 *     fresh full sync merges device data into the new account (deliberate,
 *     documented behaviour);
 * (2) push local rows with updatedAt beyond the high-water mark (null = all);
 * (3) pull server changes since the cursor and apply by newer-wins;
 * (4) advance the pull cursor off the server clock (never the device clock).
 * Cursors only advance after their stage succeeded — a failed run marks no
 * progress and the next trigger retries.
 */
async function syncEntity<Row>(
  db: TasksDb,
  transport: SyncTransport,
  session: SyncSession,
  adapter: EntityAdapter<Row>,
): Promise<EntityOutcome> {
  const stored = (await db.select().from(syncMeta).where(eq(syncMeta.id, adapter.metaId)))[0];
  let meta = stored;
  if (!meta || meta.userId !== session.userId) {
    meta = { id: adapter.metaId, userId: session.userId, lastPushedAt: null, pullCursor: null };
    await db
      .insert(syncMeta)
      .values(meta)
      .onConflictDoUpdate({
        target: syncMeta.id,
        set: { userId: session.userId, lastPushedAt: null, pullCursor: null },
      });
  }

  const toPush = await adapter.changedSince(db, meta.lastPushedAt);
  let pushed = 0;
  if (toPush.length > 0) {
    for (let start = 0; start < toPush.length; start += PUSH_BATCH_LIMIT) {
      const batch = toPush.slice(start, start + PUSH_BATCH_LIMIT);
      await adapter.push(transport, batch);
      pushed += batch.length;
    }
    const highWater = new Date(Math.max(...toPush.map((row) => adapter.clockOf(row).getTime())));
    await db
      .update(syncMeta)
      .set({ lastPushedAt: highWater })
      .where(eq(syncMeta.id, adapter.metaId));
  }

  const { rows: incomingRows, serverTime } = await adapter.pull(transport, meta.pullCursor);
  let pulled = 0;
  for (const incoming of incomingRows) {
    const local = await adapter.findLocal(db, incoming);
    if (!local) {
      // Explicit values (incl. timestamps) win over $defaultFn — the row
      // lands exactly as the server sent it.
      await adapter.insertLocal(db, incoming);
      pulled += 1;
    } else if (adapter.clockOf(local) >= adapter.clockOf(incoming)) {
      // Own echo, or a local pending edit that wins here and pushes next run.
      // (The immutable ledger always lands here — equal clocks, nothing to do.)
    } else {
      // Whole-row overwrite; the explicit updatedAt bypasses $onUpdate so the
      // server's content clock is preserved exactly (the pre-work pin).
      await adapter.updateLocal(db, incoming);
      pulled += 1;
    }
  }

  await db
    .update(syncMeta)
    .set({ pullCursor: new Date(serverTime.getTime() - PULL_CURSOR_OVERLAP_MS) })
    .where(eq(syncMeta.id, adapter.metaId));

  return { pushed, pulled };
}

const tasksAdapter: EntityAdapter<TaskData> = {
  metaId: 'tasks',
  clockOf: (row) => row.updatedAt,
  changedSince: (db, since) =>
    since === null
      ? db.select().from(tasks)
      : db.select().from(tasks).where(gt(tasks.updatedAt, since)),
  push: (transport, rows) => transport.pushTasks(rows),
  pull: (transport, since) => transport.pullTasks(since),
  findLocal: async (db, incoming) =>
    (await db.select().from(tasks).where(eq(tasks.id, incoming.id)))[0],
  insertLocal: async (db, incoming) => {
    await db.insert(tasks).values(incoming);
  },
  updateLocal: async (db, incoming) => {
    const { id: _id, ...content } = incoming;
    await db.update(tasks).set(content).where(eq(tasks.id, incoming.id));
  },
};

const subtasksAdapter: EntityAdapter<SubtaskData> = {
  metaId: 'subtasks',
  clockOf: (row) => row.updatedAt,
  changedSince: (db, since) =>
    since === null
      ? db.select().from(subtasks)
      : db.select().from(subtasks).where(gt(subtasks.updatedAt, since)),
  push: (transport, rows) => transport.pushSubtasks(rows),
  pull: (transport, since) => transport.pullSubtasks(since),
  findLocal: async (db, incoming) =>
    (await db.select().from(subtasks).where(eq(subtasks.id, incoming.id)))[0],
  insertLocal: async (db, incoming) => {
    await db.insert(subtasks).values(incoming);
  },
  updateLocal: async (db, incoming) => {
    const { id: _id, ...content } = incoming;
    await db.update(subtasks).set(content).where(eq(subtasks.id, incoming.id));
  },
};

// The ledger is IMMUTABLE (insert-only): createdAt is its content clock, and
// the update arm below is unreachable in practice (an existing row always
// compares clock-equal and skips) — it exists only to satisfy the seam.
const starActivityAdapter: EntityAdapter<StarActivityData> = {
  metaId: 'star_activity',
  clockOf: (row) => row.createdAt,
  changedSince: (db, since) =>
    since === null
      ? db.select().from(starActivityLog)
      : db.select().from(starActivityLog).where(gt(starActivityLog.createdAt, since)),
  push: (transport, rows) => transport.pushStarActivity(rows),
  pull: (transport, since) => transport.pullStarActivity(since),
  findLocal: async (db, incoming) =>
    (await db.select().from(starActivityLog).where(eq(starActivityLog.id, incoming.id)))[0],
  insertLocal: async (db, incoming) => {
    await db.insert(starActivityLog).values(incoming);
  },
  updateLocal: async (db, incoming) => {
    const { id: _id, ...content } = incoming;
    await db.update(starActivityLog).set(content).where(eq(starActivityLog.id, incoming.id));
  },
};

const preferencesAdapter: EntityAdapter<PreferenceData> = {
  metaId: 'preferences',
  clockOf: (row) => row.updatedAt,
  changedSince: (db, since) =>
    since === null
      ? db.select().from(preferences)
      : db.select().from(preferences).where(gt(preferences.updatedAt, since)),
  push: (transport, rows) => transport.pushPreferences(rows),
  pull: (transport, since) => transport.pullPreferences(since),
  findLocal: async (db, incoming) =>
    (await db.select().from(preferences).where(eq(preferences.key, incoming.key)))[0],
  insertLocal: async (db, incoming) => {
    await db.insert(preferences).values(incoming);
  },
  updateLocal: async (db, incoming) => {
    const { key: _key, ...content } = incoming;
    await db.update(preferences).set(content).where(eq(preferences.key, incoming.key));
  },
};

/**
 * One full sync round across all four entities, in parent-first order
 * (tasks before their subtasks — the server tables are FK-free like the
 * local ones, but pulled parents landing first keeps every intermediate
 * state coherent). Each entity runs push-before-pull with its own cursor
 * pair, so a stale local edit gets overwritten by the pulled winner in the
 * same run. Throws on transport failure — earlier entities keep their
 * progress; the failed entity marked none and the next trigger retries.
 */
export async function runSync(
  db: TasksDb,
  transport: SyncTransport,
  session: SyncSession,
): Promise<SyncOutcome> {
  const entities = {
    tasks: await syncEntity(db, transport, session, tasksAdapter),
    subtasks: await syncEntity(db, transport, session, subtasksAdapter),
    star_activity: await syncEntity(db, transport, session, starActivityAdapter),
    preferences: await syncEntity(db, transport, session, preferencesAdapter),
  };
  const totals = Object.values(entities).reduce(
    (sum, outcome) => ({
      pushed: sum.pushed + outcome.pushed,
      pulled: sum.pulled + outcome.pulled,
    }),
    { pushed: 0, pulled: 0 },
  );
  return { ...totals, entities };
}
