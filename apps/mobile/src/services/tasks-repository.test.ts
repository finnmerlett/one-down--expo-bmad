import { eq } from 'drizzle-orm';

import { subtasks, tasks } from '@one-down/shared/schema-local';

import type { ParsedTaskDraft } from '@one-down/shared';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import {
  archiveTasks,
  confirmReviewItem,
  createTask,
  createTasksFromBrainDump,
  deleteTasksPermanently,
  EmptyTitleError,
  markTaskEngaged,
  recordTaskSkip,
  resetSkipCount,
  restoreTask,
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

  describe('skip counting (Story 6.4; windowed since Story 7.2)', () => {
    it('increments within the window without bumping updatedAt (never wins sync conflicts)', async () => {
      const created = await createTask(testDb.db, { title: 'Keep skipping me' });
      const backdated = new Date('2026-01-01T00:00:00Z');
      await testDb.db.update(tasks).set({ updatedAt: backdated }).where(eq(tasks.id, created.id));

      const first = new Date('2026-06-10T12:00:00Z');
      const second = new Date('2026-06-11T12:00:00Z');
      await recordTaskSkip(testDb.db, created.id, first);
      await recordTaskSkip(testDb.db, created.id, second);

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.skipCount).toBe(2);
      // The window opened at the FIRST skip and stays put while it is live.
      expect(row?.skipWindowStartedAt?.getTime()).toBe(first.getTime());
      // The $onUpdate stamp was defeated by the explicit self-assignment.
      expect(row?.updatedAt.getTime()).toBe(backdated.getTime());
    });

    it('a skip after window expiry restarts at count 1 with a fresh window (7.2 AC2)', async () => {
      const created = await createTask(testDb.db, { title: 'Old skips age out' });
      const windowStart = new Date('2026-06-01T12:00:00Z');
      await recordTaskSkip(testDb.db, created.id, windowStart);
      await recordTaskSkip(testDb.db, created.id, new Date('2026-06-02T12:00:00Z'));

      // 7 days + 1 ms past the window start — expired.
      const afterExpiry = new Date('2026-06-08T12:00:00.001Z');
      await recordTaskSkip(testDb.db, created.id, afterExpiry);

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.skipCount).toBe(1);
      expect(row?.skipWindowStartedAt?.getTime()).toBe(afterExpiry.getTime());
    });

    it('resets count AND window to zero/null, also without bumping updatedAt', async () => {
      const created = await createTask(testDb.db, { title: 'Answer the nudge' });
      const backdated = new Date('2026-01-01T00:00:00Z');
      await testDb.db.update(tasks).set({ updatedAt: backdated }).where(eq(tasks.id, created.id));
      await recordTaskSkip(testDb.db, created.id);

      await resetSkipCount(testDb.db, created.id);

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.skipCount).toBe(0);
      expect(row?.skipWindowStartedAt).toBeNull();
      expect(row?.updatedAt.getTime()).toBe(backdated.getTime());
    });
  });

  describe('engagement (Story 7.2, AC4)', () => {
    it('markTaskEngaged stamps lastEngagedAt and zeroes the skip window', async () => {
      const created = await createTask(testDb.db, { title: 'Kept task' });
      await recordTaskSkip(testDb.db, created.id);
      const now = new Date('2026-06-20T12:00:00Z');

      await markTaskEngaged(testDb.db, created.id, now);

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.lastEngagedAt.getTime()).toBe(now.getTime());
      expect(row?.skipCount).toBe(0);
      expect(row?.skipWindowStartedAt).toBeNull();
    });

    it('updateTask refreshes engagement on every real patch', async () => {
      const created = await createTask(testDb.db, { title: 'Edited task' });
      await recordTaskSkip(testDb.db, created.id);
      const engagedBefore = created.lastEngagedAt.getTime();

      await updateTask(testDb.db, created.id, { notes: 'a note change counts' });

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.skipCount).toBe(0);
      expect(row?.skipWindowStartedAt).toBeNull();
      expect(row?.lastEngagedAt.getTime()).toBeGreaterThanOrEqual(engagedBefore);
      expect(row?.lastEngagedAt.getTime()).toBeGreaterThan(0);
    });

    it('a no-op patch does not refresh engagement', async () => {
      const created = await createTask(testDb.db, { title: 'Untouched' });
      await recordTaskSkip(testDb.db, created.id);

      await updateTask(testDb.db, created.id, {});

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.skipCount).toBe(1);
    });

    it('restoreTask (7.1) counts as engagement — no instant stale flag on re-entry', async () => {
      const created = await createTask(testDb.db, { title: 'Binned then back' });
      await archiveTasks(testDb.db, [created.id]);
      const staleEngagement = new Date('2026-01-01T00:00:00Z');
      await testDb.db
        .update(tasks)
        .set({ lastEngagedAt: staleEngagement, updatedAt: staleEngagement })
        .where(eq(tasks.id, created.id));

      await restoreTask(testDb.db, created.id);

      const [row] = await testDb.db.select().from(tasks);
      expect(row?.status).toBe('pending');
      expect(row?.lastEngagedAt.getTime()).toBeGreaterThan(staleEngagement.getTime());
    });

    it('createTask initializes lastEngagedAt alongside createdAt (7.2 AC1 clock start)', async () => {
      const created = await createTask(testDb.db, { title: 'Fresh' });
      expect(created.lastEngagedAt).toBeInstanceOf(Date);
      expect(created.skipWindowStartedAt).toBeNull();
    });
  });

  describe('migration 0008 backfill (Story 7.2)', () => {
    it('pre-existing rows get last_engaged_at = updated_at', async () => {
      // Apply everything BEFORE 0008, insert a legacy row, then run 0008.
      // Located by content, not position — later migrations (0009+) exist.
      const allMigrations = loadLocalMigrationsSql();
      const backfillIndex = allMigrations.findIndex((sql) => sql.includes('last_engaged_at'));
      expect(backfillIndex).toBeGreaterThan(0);
      const legacyDb = createTestDb(allMigrations.slice(0, backfillIndex));
      legacyDb.sqlite.exec(
        "INSERT INTO tasks (id, title, created_at, updated_at) VALUES ('legacy-1', 'Old row', 1000, 2000)",
      );

      legacyDb.sqlite.exec(allMigrations[backfillIndex] ?? '');

      const [row] = await legacyDb.db.select().from(tasks).where(eq(tasks.id, 'legacy-1'));
      expect(row?.lastEngagedAt.getTime()).toBe(2000);
      expect(row?.skipWindowStartedAt).toBeNull();
      legacyDb.close();
    });
  });

  describe('archive / restore / permanent delete (Story 7.1)', () => {
    it('archiveTasks flips the whole selection and bumps updatedAt (content change)', async () => {
      const a = await createTask(testDb.db, { title: 'A' });
      const b = await createTask(testDb.db, { title: 'B' });
      const keep = await createTask(testDb.db, { title: 'Keep' });

      await archiveTasks(testDb.db, [a.id, b.id]);

      const rows = await testDb.db.select().from(tasks);
      const byId = new Map(rows.map((row) => [row.id, row]));
      expect(byId.get(a.id)?.status).toBe('archived');
      expect(byId.get(b.id)?.status).toBe('archived');
      expect(byId.get(keep.id)?.status).toBe('pending');
      expect(byId.get(a.id)?.updatedAt.getTime()).toBeGreaterThanOrEqual(a.updatedAt.getTime());
    });

    it('restoreTask returns archived AND cut-loose tasks to pending (AC6)', async () => {
      const archived = await createTask(testDb.db, { title: 'Archived' });
      const released = await createTask(testDb.db, { title: 'Released' });
      await archiveTasks(testDb.db, [archived.id]);
      await setTaskStatus(testDb.db, released.id, 'cut_loose');

      await restoreTask(testDb.db, archived.id);
      await restoreTask(testDb.db, released.id);

      const rows = await testDb.db.select().from(tasks);
      expect(rows.every((row) => row.status === 'pending')).toBe(true);
    });

    it('deleteTasksPermanently removes the tasks and their subtasks only', async () => {
      const doomed = await createTask(testDb.db, { title: 'Doomed' });
      const survivor = await createTask(testDb.db, { title: 'Survivor' });
      await testDb.db.insert(subtasks).values([
        { id: 'sub-1', taskId: doomed.id, title: 'Doomed step', orderIndex: 0, source: 'ai' },
        { id: 'sub-2', taskId: survivor.id, title: 'Kept step', orderIndex: 0, source: 'ai' },
      ]);

      await deleteTasksPermanently(testDb.db, [doomed.id]);

      const taskRows = await testDb.db.select().from(tasks);
      expect(taskRows.map((row) => row.id)).toEqual([survivor.id]);
      const subtaskRows = await testDb.db.select().from(subtasks);
      expect(subtaskRows.map((row) => row.id)).toEqual(['sub-2']);
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
