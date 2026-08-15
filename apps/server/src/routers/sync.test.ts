import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import superjson from 'superjson';

import type { PreferenceData, StarActivityData, SubtaskData, TaskData } from '@one-down/shared';
import { preferences, starActivityLog, subtasks, tasks } from '@one-down/shared/schema';

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
    await db.delete(subtasks).where(inArray(subtasks.userId, trackedUserIds));
    await db.delete(starActivityLog).where(inArray(starActivityLog.userId, trackedUserIds));
    await db.delete(preferences).where(inArray(preferences.userId, trackedUserIds));
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
    deletedAt: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  };
}

function pushTo(procedure: string, token: string | null, payload: unknown) {
  return app.inject({
    method: 'POST',
    url: `/trpc/${procedure}`,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    // superjson wire format: { json, meta? } — Dates survive as Dates.
    payload: JSON.stringify(superjson.serialize(payload)),
  });
}

function pullFrom(procedure: string, token: string | null, since: Date | null) {
  const input = encodeURIComponent(JSON.stringify(superjson.serialize({ since })));
  return app.inject({
    method: 'GET',
    url: `/trpc/${procedure}?input=${input}`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const push = (token: string | null, rows: TaskData[]) =>
  pushTo('sync.push', token, { tasks: rows });
const pull = (token: string | null, since: Date | null) => pullFrom('sync.pull', token, since);

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

// --- Story 9.7 -------------------------------------------------------------

describe('sync.push — old-client compatibility (Story 9.7)', () => {
  it('accepts a task push WITHOUT the deletedAt key (pre-9.7 bundle) and defaults it null', async () => {
    const user = await newUser();
    const { deletedAt: _omitted, ...legacyShape } = makeTask({ title: 'From an old bundle' });

    const response = await pushTo('sync.push', user.accessToken, { tasks: [legacyShape] });

    expect(response.statusCode).toBe(200);
    expect(deserializeResult<PushPayload>(response).applied).toEqual([legacyShape.id]);
    const [row] = await db.select().from(tasks).where(eq(tasks.id, legacyShape.id));
    expect(row?.deletedAt).toBeNull();
  });

  it('round-trips a task tombstone (push deletedAt, pull it back)', async () => {
    const user = await newUser();
    const task = makeTask({ title: 'Deleted on device' });
    await push(user.accessToken, [task]);

    const tombstoned = {
      ...task,
      deletedAt: new Date(task.updatedAt.getTime() + 30_000),
      updatedAt: new Date(task.updatedAt.getTime() + 60_000),
    };
    const response = await push(user.accessToken, [tombstoned]);
    expect(deserializeResult<PushPayload>(response).applied).toEqual([task.id]);

    const pulled = deserializeResult<PullPayload>(await pull(user.accessToken, null));
    const wire = pulled.tasks.find((row) => row.id === task.id);
    expect(wire?.deletedAt?.getTime()).toBe(tombstoned.deletedAt.getTime());
  });
});

function makeSubtask(overrides: Partial<SubtaskData> = {}): SubtaskData {
  return {
    id: randomUUID(),
    taskId: randomUUID(),
    title: 'Sync test step',
    completed: false,
    orderIndex: 0,
    source: 'ai',
    deletedAt: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  };
}

interface RowsPullPayload<Row> {
  rows: Row[];
  serverTime: Date;
}

describe('sync.pushSubtasks / pullSubtasks', () => {
  it('inserts, applies newer, skips stale, and isolates per user', async () => {
    const alice = await newUser();
    const bob = await newUser();
    const step = makeSubtask({ title: 'Original step' });

    const inserted = await pushTo('sync.pushSubtasks', alice.accessToken, { rows: [step] });
    expect(deserializeResult<PushPayload>(inserted).applied).toEqual([step.id]);
    await pushTo('sync.pushSubtasks', bob.accessToken, { rows: [makeSubtask()] });

    // Newer content clock wins; older is stale.
    const newer = {
      ...step,
      title: 'Renamed step',
      updatedAt: new Date(step.updatedAt.getTime() + 60_000),
    };
    expect(
      deserializeResult<PushPayload>(
        await pushTo('sync.pushSubtasks', alice.accessToken, { rows: [newer] }),
      ),
    ).toMatchObject({ applied: [step.id] });
    expect(
      deserializeResult<PushPayload>(
        await pushTo('sync.pushSubtasks', alice.accessToken, { rows: [step] }),
      ),
    ).toMatchObject({ stale: [step.id] });

    // Pull: only Alice's rows, exactly SubtaskData on the wire.
    const pulled = deserializeResult<RowsPullPayload<SubtaskData>>(
      await pullFrom('sync.pullSubtasks', alice.accessToken, null),
    );
    expect(pulled.rows).toHaveLength(1);
    expect(pulled.rows[0]).toEqual({ ...newer });
  });

  it("rejects a push against another user's subtask id", async () => {
    const alice = await newUser();
    const bob = await newUser();
    const step = makeSubtask();
    await pushTo('sync.pushSubtasks', alice.accessToken, { rows: [step] });

    const hijack = { ...step, updatedAt: new Date(step.updatedAt.getTime() + 3_600_000) };
    const response = await pushTo('sync.pushSubtasks', bob.accessToken, { rows: [hijack] });

    expect(deserializeResult<PushPayload>(response)).toEqual({
      applied: [],
      stale: [],
      rejected: [step.id],
    });
  });

  it('requires auth', async () => {
    const response = await pushTo('sync.pushSubtasks', null, { rows: [makeSubtask()] });
    expect(response.statusCode).toBe(401);
  });
});

describe('sync.pushStarActivity / pullStarActivity', () => {
  it('round-trips ledger rows, including the tombstone flip and non-uuid taskIds', async () => {
    const user = await newUser();
    const award: StarActivityData = {
      id: randomUUID(),
      // Queue-level awards use '' — the column is text, not uuid, on purpose.
      taskId: '',
      taskTitle: 'Cleared the queue',
      action: 'triage_confirmed',
      amount: 2,
      deletedAt: null,
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
      updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    };
    const inserted = await pushTo('sync.pushStarActivity', user.accessToken, { rows: [award] });
    expect(deserializeResult<PushPayload>(inserted).applied).toEqual([award.id]);

    // The no-trace undo: same row comes back tombstoned with a newer clock.
    const tombstoned = {
      ...award,
      deletedAt: new Date('2026-07-02T10:00:00.000Z'),
      updatedAt: new Date('2026-07-02T10:00:00.000Z'),
    };
    await pushTo('sync.pushStarActivity', user.accessToken, { rows: [tombstoned] });

    const pulled = deserializeResult<RowsPullPayload<StarActivityData>>(
      await pullFrom('sync.pullStarActivity', user.accessToken, null),
    );
    expect(pulled.rows).toHaveLength(1);
    expect(pulled.rows[0]).toEqual({ ...tombstoned });
  });

  it('requires auth', async () => {
    const response = await pullFrom('sync.pullStarActivity', null, null);
    expect(response.statusCode).toBe(401);
  });
});

describe('sync.pushPreferences / pullPreferences', () => {
  it('the same key under two users never collides (keyed by userId+key, no rejection)', async () => {
    const alice = await newUser();
    const bob = await newUser();
    const pref = (value: string): PreferenceData => ({
      key: 'ai.general_notes',
      value: JSON.stringify(value),
      deletedAt: null,
      updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    });

    const aliceResponse = await pushTo('sync.pushPreferences', alice.accessToken, {
      rows: [pref('- alice note')],
    });
    const bobResponse = await pushTo('sync.pushPreferences', bob.accessToken, {
      rows: [pref('- bob note')],
    });
    expect(deserializeResult<PushPayload>(aliceResponse).applied).toEqual(['ai.general_notes']);
    expect(deserializeResult<PushPayload>(bobResponse).applied).toEqual(['ai.general_notes']);

    const alicePull = deserializeResult<RowsPullPayload<PreferenceData>>(
      await pullFrom('sync.pullPreferences', alice.accessToken, null),
    );
    expect(alicePull.rows).toHaveLength(1);
    expect(alicePull.rows[0]?.value).toBe(JSON.stringify('- alice note'));
  });

  it('newer value wins, older is stale', async () => {
    const user = await newUser();
    const base: PreferenceData = {
      key: 'appearance_mode',
      value: JSON.stringify('dark'),
      deletedAt: null,
      updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    };
    await pushTo('sync.pushPreferences', user.accessToken, { rows: [base] });

    const newer = {
      ...base,
      value: JSON.stringify('light'),
      updatedAt: new Date('2026-07-01T11:00:00.000Z'),
    };
    expect(
      deserializeResult<PushPayload>(
        await pushTo('sync.pushPreferences', user.accessToken, { rows: [newer] }),
      ),
    ).toMatchObject({ applied: ['appearance_mode'] });
    expect(
      deserializeResult<PushPayload>(
        await pushTo('sync.pushPreferences', user.accessToken, { rows: [base] }),
      ),
    ).toMatchObject({ stale: ['appearance_mode'] });

    const pulled = deserializeResult<RowsPullPayload<PreferenceData>>(
      await pullFrom('sync.pullPreferences', user.accessToken, null),
    );
    expect(pulled.rows.find((row) => row.key === 'appearance_mode')?.value).toBe(
      JSON.stringify('light'),
    );
  });

  it('requires auth', async () => {
    const response = await pullFrom('sync.pullPreferences', null, null);
    expect(response.statusCode).toBe(401);
  });
});
