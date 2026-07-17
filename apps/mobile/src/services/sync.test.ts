import { eq } from 'drizzle-orm';

import type { TaskData } from '@one-down/shared';
import { syncMeta, tasks } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { runSync, type SyncTransport } from './sync';
import { createTask } from './tasks-repository';

// expo-crypto is a native module; under Node the equivalent is node:crypto.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));

// Stub transport — the network boundary is the acceptable seam here; OUR
// merge/diff logic runs against real SQLite (real migration SQL).
function makeTransport() {
  const pushCalls: TaskData[][] = [];
  const pullCalls: (Date | null)[] = [];
  let pullResponse: { tasks: TaskData[]; serverTime: Date } = {
    tasks: [],
    serverTime: new Date('2026-07-10T00:00:10.000Z'),
  };
  let failPushWith: Error | null = null;

  const transport: SyncTransport = {
    push: (input) => {
      if (failPushWith) return Promise.reject(failPushWith);
      pushCalls.push(input.tasks);
      return Promise.resolve({
        applied: input.tasks.map((task) => task.id),
        stale: [],
        rejected: [],
      });
    },
    pull: (input) => {
      pullCalls.push(input.since);
      return Promise.resolve(pullResponse);
    },
  };

  return {
    transport,
    pushCalls,
    pullCalls,
    setPull: (next: typeof pullResponse) => {
      pullResponse = next;
    },
    failPush: (error: Error) => {
      failPushWith = error;
    },
  };
}

const alice = { userId: 'user-alice' };
const bob = { userId: 'user-bob' };

async function readMeta(db: TestDb['db']) {
  const [row] = await db.select().from(syncMeta).where(eq(syncMeta.id, 'singleton'));
  return row;
}

describe('runSync (integration, real migration SQL)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  it('first sync pushes ALL local rows and advances lastPushedAt to the max updatedAt', async () => {
    const harness = makeTransport();
    const a = await createTask(testDb.db, { title: 'First' });
    const b = await createTask(testDb.db, { title: 'Second' });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    expect(outcome.pushed).toBe(2);
    expect(harness.pushCalls).toHaveLength(1);
    expect(harness.pushCalls[0]?.map((task) => task.id).sort()).toEqual([a.id, b.id].sort());
    // Fresh user: pull ran with a null cursor (full pull).
    expect(harness.pullCalls).toEqual([null]);

    const meta = await readMeta(testDb.db);
    expect(meta?.userId).toBe(alice.userId);
    expect(meta?.lastPushedAt?.getTime()).toBe(
      Math.max(a.updatedAt.getTime(), b.updatedAt.getTime()),
    );
    // Pull cursor = serverTime minus the 2s overlap.
    expect(meta?.pullCursor?.getTime()).toBe(new Date('2026-07-10T00:00:10.000Z').getTime() - 2000);
  });

  it('second run pushes only rows edited after lastPushedAt', async () => {
    const harness = makeTransport();
    const a = await createTask(testDb.db, { title: 'Edit me' });
    await createTask(testDb.db, { title: 'Leave me' });
    await runSync(testDb.db, harness.transport, alice);

    // Deterministic later edit (explicit clock — same-ms $onUpdate stamps
    // would make this flaky).
    const meta = await readMeta(testDb.db);
    const later = new Date((meta?.lastPushedAt?.getTime() ?? 0) + 60_000);
    await testDb.db
      .update(tasks)
      .set({ title: 'Edited', updatedAt: later })
      .where(eq(tasks.id, a.id));

    const outcome = await runSync(testDb.db, harness.transport, alice);

    expect(outcome.pushed).toBe(1);
    expect(harness.pushCalls[1]?.map((task) => task.id)).toEqual([a.id]);
    expect((await readMeta(testDb.db))?.lastPushedAt?.getTime()).toBe(later.getTime());
  });

  it('applies a pulled newer row with its EXACT timestamps ($onUpdate bypass)', async () => {
    const harness = makeTransport();
    const local = await createTask(testDb.db, { title: 'Local version' });
    const incoming: TaskData = {
      ...local,
      title: 'Server version',
      notes: 'written on another device',
      updatedAt: new Date(local.updatedAt.getTime() + 60_000),
    };
    harness.setPull({ tasks: [incoming], serverTime: new Date('2026-07-10T00:01:00.000Z') });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    expect(outcome.pulled).toBe(1);
    const [row] = await testDb.db.select().from(tasks).where(eq(tasks.id, local.id));
    expect(row?.title).toBe('Server version');
    expect(row?.notes).toBe('written on another device');
    // The server's content clock survives exactly — never re-stamped.
    expect(row?.updatedAt.getTime()).toBe(incoming.updatedAt.getTime());
    expect(row?.createdAt.getTime()).toBe(incoming.createdAt.getTime());
  });

  it('inserts a pulled row that does not exist locally (fresh-install restore)', async () => {
    const harness = makeTransport();
    const incoming: TaskData = {
      id: 'b7e7f9a4-0000-4000-8000-000000000001',
      title: 'From the cloud',
      details: null,
      notes: null,
      status: 'pending',
      size: null,
      contexts: null,
      deadline: null,
      hasCheckNeeded: false,
      createdAt: new Date('2026-07-01T09:00:00.000Z'),
      updatedAt: new Date('2026-07-02T09:00:00.000Z'),
    };
    harness.setPull({ tasks: [incoming], serverTime: new Date('2026-07-10T00:01:00.000Z') });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    expect(outcome.pulled).toBe(1);
    const [row] = await testDb.db.select().from(tasks).where(eq(tasks.id, incoming.id));
    expect(row).toEqual(incoming);
  });

  it('skips a pulled row that is older or equal (own echo)', async () => {
    const harness = makeTransport();
    const local = await createTask(testDb.db, { title: 'Kept' });
    // Equal updatedAt = the row we just pushed coming back via the cursor overlap.
    harness.setPull({ tasks: [{ ...local, title: 'Echo' }], serverTime: new Date() });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    expect(outcome.pulled).toBe(0);
    const [row] = await testDb.db.select().from(tasks).where(eq(tasks.id, local.id));
    expect(row?.title).toBe('Kept');
  });

  it('keeps a local-newer edit and re-pushes it in the same run (push-before-pull)', async () => {
    const harness = makeTransport();
    const local = await createTask(testDb.db, { title: 'v1' });
    await runSync(testDb.db, harness.transport, alice);

    const base = (await readMeta(testDb.db))?.lastPushedAt?.getTime() ?? 0;
    await testDb.db
      .update(tasks)
      .set({ title: 'Local wins', updatedAt: new Date(base + 120_000) })
      .where(eq(tasks.id, local.id));
    // The server still holds an older concurrent edit.
    harness.setPull({
      tasks: [{ ...local, title: 'Server loses', updatedAt: new Date(base + 60_000) }],
      serverTime: new Date(),
    });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    // Pushed the local winner, discarded the pulled loser.
    expect(harness.pushCalls[1]?.map((task) => task.title)).toEqual(['Local wins']);
    expect(outcome.pulled).toBe(0);
    const [row] = await testDb.db.select().from(tasks).where(eq(tasks.id, local.id));
    expect(row?.title).toBe('Local wins');
  });

  it('resets both cursors when the session user changes (device data merges into the new account)', async () => {
    const harness = makeTransport();
    await createTask(testDb.db, { title: 'Shared device task' });
    await runSync(testDb.db, harness.transport, alice);
    expect((await readMeta(testDb.db))?.pullCursor).not.toBeNull();

    await runSync(testDb.db, harness.transport, bob);

    const meta = await readMeta(testDb.db);
    expect(meta?.userId).toBe(bob.userId);
    // Full push (lastPushedAt was reset) and full pull (null cursor) for Bob.
    expect(harness.pushCalls[1]).toHaveLength(1);
    expect(harness.pullCalls[1]).toBeNull();
  });

  it('marks no progress when the transport fails', async () => {
    const harness = makeTransport();
    await createTask(testDb.db, { title: 'Unlucky' });
    harness.failPush(new Error('network down'));

    await expect(runSync(testDb.db, harness.transport, alice)).rejects.toThrow('network down');

    const meta = await readMeta(testDb.db);
    expect(meta?.lastPushedAt).toBeNull();
    expect(meta?.pullCursor).toBeNull();
  });
});
