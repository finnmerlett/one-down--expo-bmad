import { eq } from 'drizzle-orm';

import { tasks } from '@one-down/shared/schema-local';

import type { ParsedTaskDraft } from '@one-down/shared';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import {
  confirmReviewItem,
  createTask,
  createTasksFromBrainDump,
  EmptyTitleError,
  setTaskStatus,
  updateTask,
} from './tasks-repository';

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

  describe('createTasksFromBrainDump (Story 6.1)', () => {
    const draft = (overrides: Partial<ParsedTaskDraft> = {}): ParsedTaskDraft => ({
      title: 'Call the dentist',
      details: null,
      size: null,
      contexts: [],
      deadline: null,
      timeSensitive: false,
      ...overrides,
    });

    it('writes inferred fields, records them in reviewFlags, and sets hasCheckNeeded', async () => {
      const deadlineIso = '2026-07-20T18:00:00.000Z';
      const [created] = await createTasksFromBrainDump(testDb.db, [
        draft({ size: 'quick_win', contexts: ['phone'], deadline: deadlineIso }),
      ]);

      const [row] = await testDb.db.select().from(tasks);
      expect(row).toEqual(created);
      expect(row?.size).toBe('quick_win');
      expect(row?.contexts).toBe('["phone"]');
      expect(row?.deadline?.toISOString()).toBe(deadlineIso);
      expect(row?.hasCheckNeeded).toBe(true);
      expect(JSON.parse(row?.reviewFlags ?? '{}')).toEqual({
        inferred: ['size', 'contexts', 'deadline'],
      });
    });

    it('a plain draft gets no flags and no check-needed mark', async () => {
      await createTasksFromBrainDump(testDb.db, [draft()]);

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.reviewFlags).toBeNull();
      expect(row?.hasCheckNeeded).toBe(false);
    });

    it('time-sensitive without a date sets missingDeadline (and a bad ISO degrades to it)', async () => {
      const created = await createTasksFromBrainDump(testDb.db, [
        draft({ title: 'Urgent thing', timeSensitive: true }),
        draft({ title: 'Bad date', timeSensitive: true, deadline: 'not-a-date' }),
      ]);

      expect(created).toHaveLength(2);
      for (const task of created) {
        expect(task.deadline).toBeNull();
        expect(JSON.parse(task.reviewFlags ?? '{}')).toEqual({ missingDeadline: true });
        expect(task.hasCheckNeeded).toBe(true);
      }
    });

    it('skips empty-title drafts and trims the rest', async () => {
      const created = await createTasksFromBrainDump(testDb.db, [
        draft({ title: '   ' }),
        draft({ title: '  Water plants  ', details: '  the ferns  ' }),
      ]);

      expect(created).toHaveLength(1);
      expect(created[0]?.title).toBe('Water plants');
      expect(created[0]?.details).toBe('the ferns');
      const rows = await testDb.db.select().from(tasks);
      expect(rows).toHaveLength(1);
    });
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

  describe('review flags (Story 6.2)', () => {
    // Seed a fully-flagged task through the real brain-dump path.
    const seedFlagged = async () => {
      const [task] = await createTasksFromBrainDump(testDb.db, [
        {
          title: 'Call the dentist',
          details: null,
          size: 'quick_win',
          contexts: ['phone'],
          deadline: '2026-07-20T18:00:00.000Z',
          timeSensitive: false,
        },
      ]);
      if (!task) throw new Error('seed failed');
      return task;
    };

    it('editing a flagged field clears its flag, recomputes hasCheckNeeded, and reports it', async () => {
      const task = await seedFlagged();

      const result = await updateTask(testDb.db, task.id, { size: 'big_time' });
      expect(result.confirmedItems).toEqual(['size']);
      expect(result.reviewCleared).toBe(false);

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.size).toBe('big_time');
      expect(JSON.parse(row?.reviewFlags ?? '{}')).toEqual({
        inferred: ['contexts', 'deadline'],
      });
      expect(row?.hasCheckNeeded).toBe(true);
    });

    it('a deadline write clears both the inferred flag and missingDeadline', async () => {
      const [task] = await createTasksFromBrainDump(testDb.db, [
        {
          title: 'Urgent form',
          details: null,
          size: null,
          contexts: [],
          deadline: null,
          timeSensitive: true,
        },
      ]);
      if (!task) throw new Error('seed failed');
      expect(JSON.parse(task.reviewFlags ?? '{}')).toEqual({ missingDeadline: true });

      const result = await updateTask(testDb.db, task.id, {
        deadline: new Date('2026-07-21T18:00:00.000Z'),
      });
      expect(result.confirmedItems).toEqual(['missingDeadline']);
      // Last flag cleared → the review pass for this task completed.
      expect(result.reviewCleared).toBe(true);

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.reviewFlags).toBeNull();
      expect(row?.hasCheckNeeded).toBe(false);
    });

    it('editing an unflagged field reports no confirmations', async () => {
      const task = await seedFlagged();

      const result = await updateTask(testDb.db, task.id, { title: 'Renamed' });
      expect(result.confirmedItems).toEqual([]);

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.hasCheckNeeded).toBe(true);
    });

    it('confirmReviewItem clears the flag without touching the value, exactly once', async () => {
      const task = await seedFlagged();

      const first = await confirmReviewItem(testDb.db, task.id, 'contexts');
      expect(first).toEqual({ confirmed: true, reviewCleared: false });

      // Double tap: the flag is already gone — no-op, no second award.
      const second = await confirmReviewItem(testDb.db, task.id, 'contexts');
      expect(second).toEqual({ confirmed: false, reviewCleared: false });

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.contexts).toBe('["phone"]'); // value untouched
      expect(JSON.parse(row?.reviewFlags ?? '{}')).toEqual({ inferred: ['size', 'deadline'] });

      // Clearing the remaining flags reports completion on the LAST one.
      await confirmReviewItem(testDb.db, task.id, 'size');
      const last = await confirmReviewItem(testDb.db, task.id, 'deadline');
      expect(last).toEqual({ confirmed: true, reviewCleared: true });
      const [done] = await testDb.db.select().from(tasks);
      expect(done?.reviewFlags).toBeNull();
      expect(done?.hasCheckNeeded).toBe(false);
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
