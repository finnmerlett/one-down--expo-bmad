import { eq, gt } from 'drizzle-orm';

import type { TaskData } from '@one-down/shared';
import { syncMeta, tasks } from '@one-down/shared/schema-local';

import type { TasksDb } from './tasks-repository';

// Client half of the timestamp-based sync (Story 5.3). Pure logic over an
// injected db + transport so integration tests run against real SQLite with
// a stubbed network boundary.

export interface SyncTransport {
  push(input: {
    tasks: TaskData[];
  }): Promise<{ applied: string[]; stale: string[]; rejected: string[] }>;
  pull(input: { since: Date | null }): Promise<{ tasks: TaskData[]; serverTime: Date }>;
}

export interface SyncSession {
  userId: string;
}

export interface SyncOutcome {
  pushed: number;
  pulled: number;
}

const SINGLETON_ID = 'singleton';
// Pull cursor safety overlap for commit races — re-delivery is harmless
// because apply is idempotent (echoes skip on updatedAt >=).
const PULL_CURSOR_OVERLAP_MS = 2_000;
// Server input caps push batches at 500 rows.
const PUSH_BATCH_LIMIT = 500;

/**
 * One full sync round: push-before-pull, so a stale local edit gets
 * overwritten by the pulled winner in the same run. Throws on transport
 * failure — cursors only advance after their stage succeeded, so a failed
 * run marks no progress and the next trigger retries.
 */
export async function runSync(
  db: TasksDb,
  transport: SyncTransport,
  session: SyncSession,
): Promise<SyncOutcome> {
  // (1) Read/repair cursors. A different (or first) user resets both — the
  // fresh full sync merges device data into the new account (deliberate,
  // documented behaviour).
  const stored = (await db.select().from(syncMeta).where(eq(syncMeta.id, SINGLETON_ID)))[0];
  let meta = stored;
  if (!meta || meta.userId !== session.userId) {
    meta = { id: SINGLETON_ID, userId: session.userId, lastPushedAt: null, pullCursor: null };
    await db
      .insert(syncMeta)
      .values(meta)
      .onConflictDoUpdate({
        target: syncMeta.id,
        set: { userId: session.userId, lastPushedAt: null, pullCursor: null },
      });
  }

  // (2) Push local rows with updatedAt beyond the high-water mark (null = all).
  const toPush =
    meta.lastPushedAt === null
      ? await db.select().from(tasks)
      : await db.select().from(tasks).where(gt(tasks.updatedAt, meta.lastPushedAt));
  let pushed = 0;
  if (toPush.length > 0) {
    for (let start = 0; start < toPush.length; start += PUSH_BATCH_LIMIT) {
      const batch = toPush.slice(start, start + PUSH_BATCH_LIMIT);
      await transport.push({ tasks: batch });
      pushed += batch.length;
    }
    const highWater = new Date(Math.max(...toPush.map((row) => row.updatedAt.getTime())));
    await db.update(syncMeta).set({ lastPushedAt: highWater }).where(eq(syncMeta.id, SINGLETON_ID));
  }

  // (3) Pull server changes since the cursor and apply.
  const { tasks: incomingRows, serverTime } = await transport.pull({ since: meta.pullCursor });
  let pulled = 0;
  for (const incoming of incomingRows) {
    const local = (await db.select().from(tasks).where(eq(tasks.id, incoming.id)))[0];
    if (!local) {
      // Explicit values (incl. timestamps) win over $defaultFn — the row
      // lands exactly as the server sent it.
      await db.insert(tasks).values(incoming);
      pulled += 1;
    } else if (local.updatedAt >= incoming.updatedAt) {
      // Own echo, or a local pending edit that wins here and pushes next run.
    } else {
      // Whole-row overwrite; the explicit updatedAt bypasses $onUpdate so the
      // server's content clock is preserved exactly (the pre-work pin).
      const { id: _id, ...content } = incoming;
      await db.update(tasks).set(content).where(eq(tasks.id, incoming.id));
      pulled += 1;
    }
  }

  // (4) Advance the pull cursor off the server clock (never the device clock).
  await db
    .update(syncMeta)
    .set({ pullCursor: new Date(serverTime.getTime() - PULL_CURSOR_OVERLAP_MS) })
    .where(eq(syncMeta.id, SINGLETON_ID));

  return { pushed, pulled };
}
