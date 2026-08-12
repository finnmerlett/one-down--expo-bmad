import type { TaskData } from '@one-down/shared';
import { starActivityLog, tasks } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { netStarsByTask } from './star-awards';
import {
  archiveSelection,
  deleteSelection,
  needsArchiveWarning,
  restoreFromBin,
} from './task-archive';

// expo-crypto is a native module; under Node the equivalent is node:crypto.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));

function makeTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: 'task-1',
    title: 'Sample task',
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
    lastEngagedAt: new Date('2026-06-01T10:00:00Z'),
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

function ledgerRow(taskId: string, amount: number, id: string) {
  return {
    id,
    taskId,
    taskTitle: 'snapshot',
    action: 'task_completed' as const,
    amount,
    createdAt: new Date('2026-06-05T10:00:00Z'),
  };
}

describe('needsArchiveWarning (Story 7.1, pure)', () => {
  const noStars = new Map<string, number>();

  it('pending-only selections with no stars need no warning (AC3)', () => {
    expect(needsArchiveWarning([makeTask()], noStars)).toBe(false);
  });

  it.each(['in_progress', 'completed'] as const)('warns when any task is %s (AC2)', (status) => {
    expect(needsArchiveWarning([makeTask(), makeTask({ id: 't2', status })], noStars)).toBe(true);
  });

  it('warns when a pending task carries net positive stars (defensive: subtask stars)', () => {
    expect(needsArchiveWarning([makeTask()], new Map([['task-1', 2]]))).toBe(true);
  });

  it('zero or negative net stars alone never warn', () => {
    expect(needsArchiveWarning([makeTask()], new Map([['task-1', 0]]))).toBe(false);
    expect(needsArchiveWarning([makeTask()], new Map([['task-1', -3]]))).toBe(false);
  });

  it('an empty selection never warns', () => {
    expect(needsArchiveWarning([], noStars)).toBe(false);
  });
});

describe('task-archive (integration, real migration SQL)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  it('archiving started/completed tasks retracts each net-positive total as ONE negative row (AC2)', async () => {
    const completed = makeTask({ id: 'done-1', title: 'Done task', status: 'completed' });
    const started = makeTask({ id: 'started-1', title: 'Started task', status: 'in_progress' });
    await testDb.db.insert(tasks).values([completed, started]);
    // Completion + early bonus + a subtask row: net = 10 + 3 + 1 = 14.
    await testDb.db
      .insert(starActivityLog)
      .values([
        ledgerRow('done-1', 10, 'row-1'),
        ledgerRow('done-1', 3, 'row-2'),
        ledgerRow('done-1', 1, 'row-3'),
      ]);

    const result = await archiveSelection(testDb.db, [completed, started], { warned: true });

    expect(result).toEqual({ count: 2, starsRemoved: 14 });
    const rows = await testDb.db.select().from(tasks);
    expect(rows.every((row) => row.status === 'archived')).toBe(true);

    // ONE retraction row for done-1 (full net), none for the starless task.
    const ledger = await testDb.db.select().from(starActivityLog);
    const retractions = ledger.filter((row) => row.action === 'archive_retraction');
    expect(retractions).toHaveLength(1);
    expect(retractions[0]?.taskId).toBe('done-1');
    expect(retractions[0]?.amount).toBe(-14);
    expect(retractions[0]?.taskTitle).toBe('Done task');

    // Net after retraction is zero — totals (4.2) drop by exactly the award.
    const net = await netStarsByTask(testDb.db, ['done-1']);
    expect(net.get('done-1')).toBe(0);
  });

  it('archiving a pending-only selection inserts no transactions (AC3)', async () => {
    const a = makeTask({ id: 'a', title: 'A' });
    const b = makeTask({ id: 'b', title: 'B' });
    await testDb.db.insert(tasks).values([a, b]);

    const result = await archiveSelection(testDb.db, [a, b], { warned: false });

    expect(result).toEqual({ count: 2, starsRemoved: 0 });
    expect(await testDb.db.select().from(starActivityLog)).toHaveLength(0);
  });

  it('restore returns the task to pending WITHOUT touching the ledger (AC6)', async () => {
    const task = makeTask({ id: 'done-1', title: 'Done task', status: 'completed' });
    await testDb.db.insert(tasks).values(task);
    await testDb.db.insert(starActivityLog).values([ledgerRow('done-1', 10, 'row-1')]);
    await archiveSelection(testDb.db, [task], { warned: true });

    await restoreFromBin(testDb.db, task);

    const rows = await testDb.db.select().from(tasks);
    expect(rows[0]?.status).toBe('pending');
    // Award + retraction both remain; nothing re-credited (no reverse tracking).
    const ledger = await testDb.db.select().from(starActivityLog);
    expect(ledger).toHaveLength(2);
    expect((await netStarsByTask(testDb.db, ['done-1'])).get('done-1')).toBe(0);
  });

  it('permanent delete removes rows but PRESERVES the ledger history (AC5)', async () => {
    const task = makeTask({ id: 'done-1', title: 'Done task', status: 'archived' });
    await testDb.db.insert(tasks).values(task);
    await testDb.db.insert(starActivityLog).values([ledgerRow('done-1', 10, 'row-1')]);

    const count = await deleteSelection(testDb.db, ['done-1']);

    expect(count).toBe(1);
    expect(await testDb.db.select().from(tasks)).toHaveLength(0);
    // The ledger survives task deletion by design (taskId is nullable-safe).
    expect(await testDb.db.select().from(starActivityLog)).toHaveLength(1);
  });
});
