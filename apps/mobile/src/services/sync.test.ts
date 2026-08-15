import { eq } from 'drizzle-orm';

import type { PreferenceData, StarActivityData, SubtaskData, TaskData } from '@one-down/shared';
import {
  preferences,
  starActivityLog,
  subtasks,
  syncMeta,
  tasks,
} from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { setPreference } from './preferences-repository';
import { runSync, type PullResponse, type SyncEntityKey, type SyncTransport } from './sync';
import { createTask, deleteTasksPermanently } from './tasks-repository';
import {
  createSubtasks,
  deleteSubtask,
  replaceUncompletedSubtasks,
  restoreSubtask,
} from './subtasks-repository';

// expo-crypto is a native module; under Node the equivalent is node:crypto.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));

const SERVER_TIME = new Date('2026-07-10T00:00:10.000Z');

// Stub transport — the network boundary is the acceptable seam here; OUR
// merge/diff logic runs against real SQLite (real migration SQL). One
// recorder per entity: pushes land in `pushes[entity]`, pulls consume
// `pullResponses[entity]` and record their cursor in `pullSince[entity]`.
function makeTransport() {
  const pushes = {
    tasks: [] as TaskData[][],
    subtasks: [] as SubtaskData[][],
    star_activity: [] as StarActivityData[][],
    preferences: [] as PreferenceData[][],
  };
  const pullSince: Record<SyncEntityKey, (Date | null)[]> = {
    tasks: [],
    subtasks: [],
    star_activity: [],
    preferences: [],
  };
  const pullResponses: { [K in SyncEntityKey]: PullResponse<never> | PullResponse<unknown> } = {
    tasks: { rows: [], serverTime: SERVER_TIME },
    subtasks: { rows: [], serverTime: SERVER_TIME },
    star_activity: { rows: [], serverTime: SERVER_TIME },
    preferences: { rows: [], serverTime: SERVER_TIME },
  };
  const failures: Partial<Record<SyncEntityKey, Error>> = {};

  function pushFor<Row extends { id: string } | { key: string }>(
    entity: SyncEntityKey,
    sink: Row[][],
  ) {
    return (rows: Row[]) => {
      const failure = failures[entity];
      if (failure) return Promise.reject(failure);
      sink.push(rows);
      return Promise.resolve({
        applied: rows.map((row) => ('id' in row ? row.id : row.key)),
        stale: [],
        rejected: [],
      });
    };
  }
  function pullFor<Row>(entity: SyncEntityKey) {
    return (since: Date | null) => {
      pullSince[entity].push(since);
      return Promise.resolve(pullResponses[entity] as PullResponse<Row>);
    };
  }

  const transport: SyncTransport = {
    pushTasks: pushFor('tasks', pushes.tasks),
    pullTasks: pullFor<TaskData>('tasks'),
    pushSubtasks: pushFor('subtasks', pushes.subtasks),
    pullSubtasks: pullFor<SubtaskData>('subtasks'),
    pushStarActivity: pushFor('star_activity', pushes.star_activity),
    pullStarActivity: pullFor<StarActivityData>('star_activity'),
    pushPreferences: pushFor('preferences', pushes.preferences),
    pullPreferences: pullFor<PreferenceData>('preferences'),
  };

  return {
    transport,
    pushes,
    pullSince,
    setPull<Row>(entity: SyncEntityKey, response: PullResponse<Row>) {
      pullResponses[entity] = response;
    },
    fail(entity: SyncEntityKey, error: Error) {
      failures[entity] = error;
    },
  };
}

const alice = { userId: 'user-alice' };
const bob = { userId: 'user-bob' };

async function readMeta(db: TestDb['db'], entity: SyncEntityKey = 'tasks') {
  const [row] = await db.select().from(syncMeta).where(eq(syncMeta.id, entity));
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
    expect(outcome.entities.tasks).toEqual({ pushed: 2, pulled: 0 });
    expect(harness.pushes.tasks).toHaveLength(1);
    expect(harness.pushes.tasks[0]?.map((task) => task.id).sort()).toEqual([a.id, b.id].sort());
    // Fresh user: every entity pulled with a null cursor (full pull).
    expect(harness.pullSince.tasks).toEqual([null]);
    expect(harness.pullSince.subtasks).toEqual([null]);

    const meta = await readMeta(testDb.db);
    expect(meta?.userId).toBe(alice.userId);
    expect(meta?.lastPushedAt?.getTime()).toBe(
      Math.max(a.updatedAt.getTime(), b.updatedAt.getTime()),
    );
    // Pull cursor = serverTime minus the 2s overlap.
    expect(meta?.pullCursor?.getTime()).toBe(SERVER_TIME.getTime() - 2000);
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

    expect(outcome.entities.tasks.pushed).toBe(1);
    expect(harness.pushes.tasks[1]?.map((task) => task.id)).toEqual([a.id]);
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
    harness.setPull('tasks', { rows: [incoming], serverTime: SERVER_TIME });

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
      criticality: null,
      contexts: null,
      deadline: null,
      hasCheckNeeded: false,
      reviewFlags: null,
      skipCount: 0,
      skipWindowStartedAt: null,
      lastEngagedAt: new Date('2026-07-01T09:00:00.000Z'),
      deletedAt: null,
      createdAt: new Date('2026-07-01T09:00:00.000Z'),
      updatedAt: new Date('2026-07-02T09:00:00.000Z'),
    };
    harness.setPull('tasks', { rows: [incoming], serverTime: SERVER_TIME });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    expect(outcome.pulled).toBe(1);
    const [row] = await testDb.db.select().from(tasks).where(eq(tasks.id, incoming.id));
    expect(row).toEqual(incoming);
  });

  it('skips a pulled row that is older or equal (own echo)', async () => {
    const harness = makeTransport();
    const local = await createTask(testDb.db, { title: 'Kept' });
    // Equal updatedAt = the row we just pushed coming back via the cursor overlap.
    harness.setPull('tasks', { rows: [{ ...local, title: 'Echo' }], serverTime: new Date() });

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
    harness.setPull('tasks', {
      rows: [{ ...local, title: 'Server loses', updatedAt: new Date(base + 60_000) }],
      serverTime: new Date(),
    });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    // Pushed the local winner, discarded the pulled loser.
    expect(harness.pushes.tasks[1]?.map((task) => task.title)).toEqual(['Local wins']);
    expect(outcome.pulled).toBe(0);
    const [row] = await testDb.db.select().from(tasks).where(eq(tasks.id, local.id));
    expect(row?.title).toBe('Local wins');
  });

  it('resets every entity cursor when the session user changes (device data merges into the new account)', async () => {
    const harness = makeTransport();
    const task = await createTask(testDb.db, { title: 'Shared device task' });
    await createSubtasks(testDb.db, task.id, ['Step one'], 'manual');
    await runSync(testDb.db, harness.transport, alice);
    expect((await readMeta(testDb.db))?.pullCursor).not.toBeNull();
    expect((await readMeta(testDb.db, 'subtasks'))?.pullCursor).not.toBeNull();

    await runSync(testDb.db, harness.transport, bob);

    for (const entity of ['tasks', 'subtasks', 'star_activity', 'preferences'] as const) {
      const meta = await readMeta(testDb.db, entity);
      expect(meta?.userId).toBe(bob.userId);
      // Full pull (null cursor) for Bob on every entity.
      expect(harness.pullSince[entity][1]).toBeNull();
    }
    // Full push (lastPushedAt was reset) of the device's rows.
    expect(harness.pushes.tasks[1]).toHaveLength(1);
    expect(harness.pushes.subtasks[1]).toHaveLength(1);
  });

  it("marks no progress for a failed entity, keeps earlier entities' progress", async () => {
    const harness = makeTransport();
    const task = await createTask(testDb.db, { title: 'Unlucky' });
    await createSubtasks(testDb.db, task.id, ['Doomed step'], 'manual');
    harness.fail('subtasks', new Error('network down'));

    await expect(runSync(testDb.db, harness.transport, alice)).rejects.toThrow('network down');

    // Tasks (ran first) kept their progress; subtasks marked none.
    expect((await readMeta(testDb.db, 'tasks'))?.lastPushedAt).not.toBeNull();
    const subMeta = await readMeta(testDb.db, 'subtasks');
    expect(subMeta?.lastPushedAt).toBeNull();
    expect(subMeta?.pullCursor).toBeNull();
  });

  // --- Story 9.7: tombstones ------------------------------------------------

  it('pushes a permanent delete as a tombstone (the resurrection regression)', async () => {
    const harness = makeTransport();
    const task = await createTask(testDb.db, { title: 'Doomed' });
    await createSubtasks(testDb.db, task.id, ['Doomed step'], 'ai');
    await runSync(testDb.db, harness.transport, alice);

    await deleteTasksPermanently(testDb.db, [task.id]);
    const outcome = await runSync(testDb.db, harness.transport, alice);

    // Pre-9.7 this pushed NOTHING (SQL DELETE was invisible to sync) and the
    // task resurrected on the next fresh sign-in. Now the tombstone syncs.
    expect(outcome.entities.tasks.pushed).toBe(1);
    expect(harness.pushes.tasks[1]?.[0]?.id).toBe(task.id);
    expect(harness.pushes.tasks[1]?.[0]?.deletedAt).toBeInstanceOf(Date);
    expect(outcome.entities.subtasks.pushed).toBe(1);
    expect(harness.pushes.subtasks[1]?.[0]?.deletedAt).toBeInstanceOf(Date);
  });

  it('applies a pulled tombstone (a delete made on another device lands here)', async () => {
    const harness = makeTransport();
    const local = await createTask(testDb.db, { title: 'Deleted elsewhere' });
    harness.setPull('tasks', {
      rows: [
        {
          ...local,
          status: 'archived',
          deletedAt: new Date(local.updatedAt.getTime() + 30_000),
          updatedAt: new Date(local.updatedAt.getTime() + 60_000),
        },
      ],
      serverTime: SERVER_TIME,
    });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    expect(outcome.pulled).toBe(1);
    const [row] = await testDb.db.select().from(tasks).where(eq(tasks.id, local.id));
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });

  it('round-trips the AI step-replace as tombstones + inserts, and undo revives the same row', async () => {
    const harness = makeTransport();
    const task = await createTask(testDb.db, { title: 'Stepped task' });
    const [oldStep] = await createSubtasks(testDb.db, task.id, ['Old step'], 'ai');
    await runSync(testDb.db, harness.transport, alice);

    // AI "change these": the old uncompleted step tombstones, the new inserts.
    await replaceUncompletedSubtasks(testDb.db, task.id, ['New step'], 'ai');
    const afterReplace = await runSync(testDb.db, harness.transport, alice);
    expect(afterReplace.entities.subtasks.pushed).toBe(2);
    const replacePush = harness.pushes.subtasks[1] ?? [];
    expect(replacePush.find((row) => row.id === oldStep?.id)?.deletedAt).toBeInstanceOf(Date);
    expect(replacePush.find((row) => row.title === 'New step')?.deletedAt).toBeNull();

    // Step-remove + undo: the SAME row tombstones, then revives with a newer
    // content clock (so the revival beats the already-synced tombstone).
    const [newStep] = await testDb.db.select().from(subtasks).where(eq(subtasks.title, 'New step'));
    const deleted = await deleteSubtask(testDb.db, newStep!.id);
    await runSync(testDb.db, harness.transport, alice);
    await restoreSubtask(testDb.db, deleted!);
    await runSync(testDb.db, harness.transport, alice);

    const [revived] = await testDb.db.select().from(subtasks).where(eq(subtasks.id, newStep!.id));
    expect(revived?.deletedAt).toBeNull();
    const lastPush = harness.pushes.subtasks.at(-1) ?? [];
    expect(lastPush.map((row) => row.id)).toEqual([newStep!.id]);
    expect(lastPush[0]?.deletedAt).toBeNull();
    expect(lastPush[0]?.updatedAt.getTime()).toBeGreaterThan(deleted!.updatedAt.getTime());
  });

  // --- Story 9.7: the two new entities --------------------------------------

  it('pushes and pulls star-ledger rows on their own cursor pair', async () => {
    const harness = makeTransport();
    await testDb.db.insert(starActivityLog).values({
      id: 'aaaaaaaa-0000-4000-8000-000000000001',
      taskId: null,
      taskTitle: 'Earned locally',
      action: 'task_completed',
      amount: 10,
      createdAt: new Date('2026-07-01T09:00:00.000Z'),
      updatedAt: new Date('2026-07-01T09:00:00.000Z'),
    });
    const incoming: StarActivityData = {
      id: 'aaaaaaaa-0000-4000-8000-000000000002',
      taskId: null,
      taskTitle: 'Earned elsewhere',
      action: 'task_cut_loose',
      amount: 2,
      deletedAt: null,
      createdAt: new Date('2026-07-02T09:00:00.000Z'),
      updatedAt: new Date('2026-07-02T09:00:00.000Z'),
    };
    harness.setPull('star_activity', { rows: [incoming], serverTime: SERVER_TIME });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    expect(outcome.entities.star_activity).toEqual({ pushed: 1, pulled: 1 });
    expect(harness.pushes.star_activity[0]?.[0]?.taskTitle).toBe('Earned locally');
    const rows = await testDb.db.select().from(starActivityLog);
    expect(rows).toHaveLength(2);
    const meta = await readMeta(testDb.db, 'star_activity');
    expect(meta?.pullCursor?.getTime()).toBe(SERVER_TIME.getTime() - 2000);
  });

  it('pushes and pulls preferences matched on KEY, newer-wins', async () => {
    const harness = makeTransport();
    await setPreference(testDb.db, 'ai.general_notes', '- likes physical steps');
    const [localRow] = await testDb.db
      .select()
      .from(preferences)
      .where(eq(preferences.key, 'ai.general_notes'));
    // Another device wrote the same key LATER — it must win here.
    const incoming: PreferenceData = {
      key: 'ai.general_notes',
      value: JSON.stringify('- prefers tiny steps'),
      deletedAt: null,
      updatedAt: new Date(localRow!.updatedAt.getTime() + 60_000),
    };
    harness.setPull('preferences', { rows: [incoming], serverTime: SERVER_TIME });

    const outcome = await runSync(testDb.db, harness.transport, alice);

    expect(outcome.entities.preferences.pushed).toBe(1);
    expect(harness.pushes.preferences[0]?.[0]?.key).toBe('ai.general_notes');
    expect(outcome.entities.preferences.pulled).toBe(1);
    const [row] = await testDb.db
      .select()
      .from(preferences)
      .where(eq(preferences.key, 'ai.general_notes'));
    expect(row?.value).toBe(JSON.stringify('- prefers tiny steps'));
    expect(row?.updatedAt.getTime()).toBe(incoming.updatedAt.getTime());
  });
});
