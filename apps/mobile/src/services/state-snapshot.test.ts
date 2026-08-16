import { starActivityLog } from '@one-down/shared/schema-local';

// expo-crypto is a native module; under Node the equivalent is node:crypto.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { setPreference } from './preferences-repository';
import { captureStateSnapshot } from './state-snapshot';
import { createTask, deleteTasksPermanently } from './tasks-repository';

describe('state snapshot (9.8 F3, integration, real migration SQL)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  it('uploads every table — tombstones included — and returns the uuid it sent', async () => {
    const live = await createTask(testDb.db, { title: 'Live task' });
    const dead = await createTask(testDb.db, { title: 'Deleted task' });
    await deleteTasksPermanently(testDb.db, [dead.id]);
    await testDb.db.insert(starActivityLog).values({
      id: '3f9f6d2a-0000-4000-8000-000000000001',
      taskId: live.id,
      taskTitle: 'Live task',
      action: 'task_completed',
      amount: 5,
      createdAt: new Date(),
    });
    await setPreference(testDb.db, 'ai.general_notes', '- tiny steps');

    const sent: { id: string; payload: string }[] = [];
    const returnedId = await captureStateSnapshot(testDb.db, {
      save: (input) => {
        sent.push(input);
        return Promise.resolve({ id: input.id });
      },
    });

    expect(sent).toHaveLength(1);
    expect(returnedId).toBe(sent[0]!.id);

    const payload = JSON.parse(sent[0]!.payload) as {
      schema: string;
      counts: Record<string, number>;
      tables: { tasks: { id: string; deletedAt: string | null }[] };
    };
    expect(payload.schema).toBe('one-down-local@1');
    expect(payload.counts.tasks).toBe(2);
    expect(payload.counts.starActivityLog).toBe(1);
    expect(payload.counts.preferences).toBe(1);
    // The tombstoned row is IN the snapshot — that's the debugging point.
    const deadRow = payload.tables.tasks.find((row) => row.id === dead.id);
    expect(deadRow?.deletedAt).not.toBeNull();
  });
});
