import { tasks } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { createTask, EmptyTitleError } from './tasks-repository';

// expo-crypto is a native module; under Node the equivalent is node:crypto.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));

describe('tasks-repository (integration, real migration SQL)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  it('creates a task with defaults and reads it back', async () => {
    const created = await createTask(testDb.db, {
      title: '  Buy milk  ',
      details: '  semi-skimmed  ',
    });

    expect(created.title).toBe('Buy milk');
    expect(created.details).toBe('semi-skimmed');
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);

    const rows = await testDb.db.select().from(tasks);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(created);
    expect(rows[0]?.status).toBe('pending');
    expect(rows[0]?.hasCheckNeeded).toBe(false);
    expect(rows[0]?.size).toBeNull();
    expect(rows[0]?.deadline).toBeNull();
    expect(rows[0]?.createdAt).toBeInstanceOf(Date);
  });

  it('stores missing/blank details as null', async () => {
    const noDetails = await createTask(testDb.db, { title: 'a' });
    const blankDetails = await createTask(testDb.db, { title: 'b', details: '   ' });

    expect(noDetails.details).toBeNull();
    expect(blankDetails.details).toBeNull();
  });

  it('rejects empty/whitespace titles without inserting', async () => {
    await expect(createTask(testDb.db, { title: '   ' })).rejects.toThrow(EmptyTitleError);

    const rows = await testDb.db.select().from(tasks);
    expect(rows).toHaveLength(0);
  });
});
