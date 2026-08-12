import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import superjson from 'superjson';

import type { TaskData } from '@one-down/shared';
import { tasks } from '@one-down/shared/schema';

import { createDbClient } from '../db/client';
import { buildServer } from '../index';
import { loadEnv } from '../lib/env';
import { createTestUser } from '../test-utils/auth';

// Integration against the REAL local stack: GoTrue users/JWTs + the supabase
// Postgres (drizzle migrations applied via `bun run db:migrate`).
const env = loadEnv({ NODE_ENV: 'test' });
const db = createDbClient(env.DATABASE_URL);
const app = buildServer(env, { db });

const trackedUserIds: string[] = [];

async function newUser() {
  const user = await createTestUser();
  trackedUserIds.push(user.userId);
  return user;
}

afterAll(async () => {
  if (trackedUserIds.length > 0) {
    await db.delete(tasks).where(inArray(tasks.userId, trackedUserIds));
  }
  await app.close();
  await db.$client.end();
});

function makeTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: randomUUID(),
    title: 'Sync test task',
    details: null,
    notes: null,
    status: 'pending',
    size: null,
    criticality: null,
    contexts: null,
    deadline: null,
    hasCheckNeeded: false,
    reviewFlags: null,
    skipCount: 0,
    skipWindowStartedAt: null,
    lastEngagedAt: new Date('2026-07-01T10:00:00.000Z'),
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  };
}

function push(token: string | null, rows: TaskData[]) {
  return app.inject({
    method: 'POST',
    url: '/trpc/sync.push',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    // superjson wire format: { json, meta? } — Dates survive as Dates.
    payload: JSON.stringify(superjson.serialize({ tasks: rows })),
  });
}

function pull(token: string | null, since: Date | null) {
  const input = encodeURIComponent(JSON.stringify(superjson.serialize({ since })));
  return app.inject({
    method: 'GET',
    url: `/trpc/sync.pull?input=${input}`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

interface PushPayload {
  applied: string[];
  stale: string[];
  rejected: string[];
}

interface PullPayload {
  tasks: TaskData[];
  serverTime: Date;
}

function deserializeResult<T>(response: { json: () => { result: { data: unknown } } }): T {
  return superjson.deserialize(
    response.json().result.data as Parameters<typeof superjson.deserialize>[0],
  );
}

describe('sync.push', () => {
  it('inserts new rows under the ctx user with a server syncedAt', async () => {
    const user = await newUser();
    const task = makeTask();
    const before = new Date();

    const response = await push(user.accessToken, [task]);

    expect(response.statusCode).toBe(200);
    expect(deserializeResult<PushPayload>(response)).toEqual({
      applied: [task.id],
      stale: [],
      rejected: [],
    });

    const [row] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(row?.userId).toBe(user.userId);
    expect(row?.title).toBe(task.title);
    // Content clock preserved exactly; write clock is the server's.
    expect(row?.updatedAt.getTime()).toBe(task.updatedAt.getTime());
    expect(row!.syncedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
  });

  it('applies a newer push and skips a stale one (last-content-changed wins)', async () => {
    const user = await newUser();
    const task = makeTask({ title: 'Original' });
    await push(user.accessToken, [task]);

    // Newer content clock → wins.
    const newer = {
      ...task,
      title: 'Edited later',
      updatedAt: new Date(task.updatedAt.getTime() + 60_000),
    };
    const newerResponse = await push(user.accessToken, [newer]);
    expect(deserializeResult<PushPayload>(newerResponse)).toMatchObject({ applied: [task.id] });

    // Older content clock → stale, row untouched.
    const stale = {
      ...task,
      title: 'Ghost of an old edit',
      updatedAt: new Date(task.updatedAt.getTime() - 60_000),
    };
    const staleResponse = await push(user.accessToken, [stale]);
    expect(deserializeResult<PushPayload>(staleResponse)).toMatchObject({
      stale: [task.id],
      applied: [],
    });

    const [row] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(row?.title).toBe('Edited later');
    expect(row?.updatedAt.getTime()).toBe(newer.updatedAt.getTime());
  });

  it("rejects a push against another user's task id and never touches the row", async () => {
    const alice = await newUser();
    const bob = await newUser();
    const aliceTask = makeTask({ title: 'Alice owns this' });
    await push(alice.accessToken, [aliceTask]);

    const hijack = {
      ...aliceTask,
      title: 'Bob was here',
      updatedAt: new Date(aliceTask.updatedAt.getTime() + 3_600_000),
    };
    const response = await push(bob.accessToken, [hijack]);

    expect(deserializeResult<PushPayload>(response)).toEqual({
      applied: [],
      stale: [],
      rejected: [aliceTask.id],
    });
    const [row] = await db.select().from(tasks).where(eq(tasks.id, aliceTask.id));
    expect(row?.userId).toBe(alice.userId);
    expect(row?.title).toBe('Alice owns this');
  });

  it('requires auth', async () => {
    const response = await push(null, [makeTask()]);
    expect(response.statusCode).toBe(401);
    expect(response.json().error.json.data.code).toBe('UNAUTHORIZED');
  });
});

describe('sync.pull', () => {
  it("returns only the caller's rows changed after `since`, without server-only columns", async () => {
    const alice = await newUser();
    const bob = await newUser();
    const aliceTask = makeTask({ title: 'Alice task' });
    await push(alice.accessToken, [aliceTask]);
    await push(bob.accessToken, [makeTask({ title: 'Bob task' })]);

    const fullResponse = await pull(alice.accessToken, null);
    expect(fullResponse.statusCode).toBe(200);
    const full = deserializeResult<PullPayload>(fullResponse);
    // Isolation: never anyone else's rows.
    expect(full.tasks.map((task) => task.title)).toEqual(['Alice task']);
    expect(full.serverTime).toBeInstanceOf(Date);
    // Wire shape is exactly TaskData — userId/syncedAt stripped.
    expect(full.tasks[0]).toEqual({ ...aliceTask });

    // Cursor past the write → nothing new.
    const emptyResponse = await pull(alice.accessToken, full.serverTime);
    expect(deserializeResult<PullPayload>(emptyResponse).tasks).toEqual([]);

    // Cursor before the write → the row comes back (overlap re-delivery).
    const overlapResponse = await pull(
      alice.accessToken,
      new Date(full.serverTime.getTime() - 60_000),
    );
    expect(deserializeResult<PullPayload>(overlapResponse).tasks).toHaveLength(1);
  });

  it('requires auth', async () => {
    const response = await pull(null, null);
    expect(response.statusCode).toBe(401);
    expect(response.json().error.json.data.code).toBe('UNAUTHORIZED');
  });
});
