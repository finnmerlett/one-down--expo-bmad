import { eq } from 'drizzle-orm';

import { tasks } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { createTask, EmptyTitleError, setTaskStatus, updateTask } from './tasks-repository';

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

  describe('updateTask (Story 1.4 inline edits)', () => {
    it('applies a partial patch, bumps updatedAt, and leaves other fields alone', async () => {
      const created = await createTask(testDb.db, { title: 'Original', details: 'keep me' });
      // Back-date so the bump assertion can actually fail (same-ms create+update
      // would satisfy >= even if updateTask never touched updatedAt).
      const backdated = new Date('2026-01-01T00:00:00Z');
      await testDb.db.update(tasks).set({ updatedAt: backdated });

      await updateTask(testDb.db, created.id, { title: '  Renamed  ' });

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.title).toBe('Renamed');
      expect(row?.details).toBe('keep me');
      expect(row?.updatedAt.getTime()).toBeGreaterThan(backdated.getTime());
    });

    it('trims notes/details and stores blanks as null', async () => {
      const created = await createTask(testDb.db, { title: 'a', details: 'old' });

      await updateTask(testDb.db, created.id, { notes: '  remember the keys  ' });
      await updateTask(testDb.db, created.id, { details: '   ' });

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.notes).toBe('remember the keys');
      expect(row?.details).toBeNull();
    });

    it('JSON-encodes contexts and stores an empty selection as null', async () => {
      const created = await createTask(testDb.db, { title: 'a' });

      await updateTask(testDb.db, created.id, { contexts: ['home', 'phone'] });
      let [row] = await testDb.db.select().from(tasks);
      expect(row?.contexts).toBe('["home","phone"]');

      await updateTask(testDb.db, created.id, { contexts: [] });
      [row] = await testDb.db.select().from(tasks);
      expect(row?.contexts).toBeNull();
    });

    it('sets and clears the size', async () => {
      const created = await createTask(testDb.db, { title: 'a' });

      await updateTask(testDb.db, created.id, { size: 'big_time' });
      let [row] = await testDb.db.select().from(tasks);
      expect(row?.size).toBe('big_time');

      await updateTask(testDb.db, created.id, { size: null });
      [row] = await testDb.db.select().from(tasks);
      expect(row?.size).toBeNull();
    });

    it('rejects blanking the title and writes nothing', async () => {
      const created = await createTask(testDb.db, { title: 'Keep me' });

      await expect(updateTask(testDb.db, created.id, { title: '  ' })).rejects.toThrow(
        EmptyTitleError,
      );

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.title).toBe('Keep me');
      expect(row?.updatedAt).toEqual(created.updatedAt);
    });
  });

  describe('schema-managed timestamps (Story 5.3 pre-work)', () => {
    it('setTaskStatus bumps updatedAt via $onUpdate', async () => {
      const created = await createTask(testDb.db, { title: 'a' });
      const backdated = new Date('2026-01-01T00:00:00Z');
      await testDb.db.update(tasks).set({ updatedAt: backdated }).where(eq(tasks.id, created.id));

      await setTaskStatus(testDb.db, created.id, 'in_progress');

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.status).toBe('in_progress');
      expect(row?.updatedAt.getTime()).toBeGreaterThan(backdated.getTime());
    });

    it('an explicit updatedAt in .set() wins over $onUpdate (sync-apply pin)', async () => {
      // The sync pull path writes server rows with their exact timestamps —
      // this pins the drizzle semantics that make that safe.
      const created = await createTask(testDb.db, { title: 'a' });
      const exact = new Date('2026-03-05T12:34:56.789Z');

      await testDb.db
        .update(tasks)
        .set({ title: 'server copy', updatedAt: exact })
        .where(eq(tasks.id, created.id));

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.title).toBe('server copy');
      expect(row?.updatedAt.getTime()).toBe(exact.getTime());
    });
  });
});
