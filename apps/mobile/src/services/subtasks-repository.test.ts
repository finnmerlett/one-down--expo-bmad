import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import {
  createSubtasks,
  deleteSubtask,
  listSubtasks,
  replaceUncompletedSubtasks,
  setSubtaskCompleted,
} from './subtasks-repository';

// expo-crypto is a native module; under Node the equivalent is node:crypto.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));

describe('subtasks-repository (integration, real migration SQL)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    // The 0006 migration creating the subtasks table runs here — table
    // existence is proven by every test below.
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  it('creates subtasks in step order, skipping blank titles', async () => {
    const created = await createSubtasks(
      testDb.db,
      'task-1',
      ['First step', '   ', 'Second step'],
      'ai',
    );

    expect(created.map((row) => row.title)).toEqual(['First step', 'Second step']);
    expect(created.map((row) => row.orderIndex)).toEqual([0, 1]);
    expect(created.every((row) => row.source === 'ai')).toBe(true);
    expect(created.every((row) => !row.completed)).toBe(true);
  });

  it('appends later inserts after the highest existing orderIndex (micro after breakdown)', async () => {
    await createSubtasks(testDb.db, 'task-1', ['A', 'B', 'C'], 'ai');
    const [micro] = await createSubtasks(testDb.db, 'task-1', ['Tiny first step'], 'micro');

    expect(micro?.orderIndex).toBe(3);
    // Other tasks get their own sequence.
    const [other] = await createSubtasks(testDb.db, 'task-2', ['Elsewhere'], 'ai');
    expect(other?.orderIndex).toBe(0);

    const listed = await listSubtasks(testDb.db, 'task-1');
    expect(listed.map((row) => row.title)).toEqual(['A', 'B', 'C', 'Tiny first step']);
  });

  it('setSubtaskCompleted reports real state changes only (no-op guard)', async () => {
    const [subtask] = await createSubtasks(testDb.db, 'task-1', ['Tick me'], 'ai');
    if (!subtask) throw new Error('seed failed');

    expect(await setSubtaskCompleted(testDb.db, subtask.id, true)).toBe(true);
    // Same state again → no change, so no star re-award upstream.
    expect(await setSubtaskCompleted(testDb.db, subtask.id, true)).toBe(false);
    // Untick is a real change again (reversal path).
    expect(await setSubtaskCompleted(testDb.db, subtask.id, false)).toBe(true);
    // Unknown id → no-op.
    expect(await setSubtaskCompleted(testDb.db, 'missing', true)).toBe(false);
  });

  it('replaceUncompletedSubtasks keeps completed rows and appends after the max index (6.4)', async () => {
    const created = await createSubtasks(testDb.db, 'task-1', ['A', 'B', 'C'], 'ai');
    const first = created[0];
    if (!first) throw new Error('seed failed');
    await setSubtaskCompleted(testDb.db, first.id, true);

    const result = await replaceUncompletedSubtasks(
      testDb.db,
      'task-1',
      ['Refined: B', 'Refined: C'],
      'ai',
    );
    expect(result).toEqual({ deletedCount: 2, insertedCount: 2 });

    const listed = await listSubtasks(testDb.db, 'task-1');
    expect(listed.map((row) => row.title)).toEqual(['A', 'Refined: B', 'Refined: C']);
    // The completed row is byte-identical untouched (UX-DR7)...
    expect(listed[0]?.id).toBe(first.id);
    expect(listed[0]?.completed).toBe(true);
    // ...and the refined steps landed after the SURVIVING max orderIndex
    // (the deleted rows' indices are free again).
    expect(listed.map((row) => row.orderIndex)).toEqual([0, 1, 2]);
  });

  it('deleteSubtask returns the deleted row once, null after', async () => {
    const [subtask] = await createSubtasks(testDb.db, 'task-1', ['Remove me'], 'ai');
    if (!subtask) throw new Error('seed failed');
    await setSubtaskCompleted(testDb.db, subtask.id, true);

    const deleted = await deleteSubtask(testDb.db, subtask.id);
    expect(deleted?.id).toBe(subtask.id);
    // was_completed / star reversal upstream keys on the returned row.
    expect(deleted?.completed).toBe(true);

    expect(await deleteSubtask(testDb.db, subtask.id)).toBeNull();
    expect(await listSubtasks(testDb.db, 'task-1')).toEqual([]);
  });
});
