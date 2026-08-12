import { eq } from 'drizzle-orm';

import type { StarAction, TaskData } from '@one-down/shared';
import { starActivityLog, tasks } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { awardCompletionStars, awardCutLooseStars } from './star-awards';
import { undoTaskCompletion, undoTaskCutLoose } from './task-undo';

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
    status: 'completed',
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

function ledgerRow(
  taskId: string,
  amount: number,
  id: string,
  action: StarAction,
  createdAt = new Date('2026-06-05T10:00:00Z'),
) {
  return { id, taskId, taskTitle: 'snapshot', action, amount, createdAt };
}

describe('undoTaskCompletion (integration, real migration SQL)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  async function seedTask(task: TaskData): Promise<void> {
    await testDb.db.insert(tasks).values(task);
  }

  async function taskStatus(id: string): Promise<string | undefined> {
    const rows = await testDb.db.select().from(tasks);
    return rows.find((row) => row.id === id)?.status;
  }

  async function setStatus(id: string, status: TaskData['status']): Promise<void> {
    await testDb.db.update(tasks).set({ status }).where(eq(tasks.id, id));
  }

  it('returns the task to pending and DELETES the award — no trace in the log', async () => {
    const task = makeTask();
    await seedTask(task);
    await testDb.db.insert(starActivityLog).values(ledgerRow(task.id, 12, 'l1', 'task_completed'));

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(12);
    expect(await taskStatus(task.id)).toBe('pending');
    // Owner decision: removal, not a negative pair — the log is empty.
    expect(await testDb.db.select().from(starActivityLog)).toHaveLength(0);
  });

  it('leaves subtask and triage stars untouched — only the completion award goes', async () => {
    const task = makeTask();
    await seedTask(task);
    await testDb.db
      .insert(starActivityLog)
      .values([
        ledgerRow(task.id, 10, 'l1', 'task_completed'),
        ledgerRow(task.id, 1, 'l2', 'subtask_completed'),
        ledgerRow(task.id, 1, 'l3', 'triage_confirmed'),
      ]);

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(10);
    const ledger = await testDb.db.select().from(starActivityLog);
    expect(ledger.map((row) => row.action).sort()).toEqual([
      'subtask_completed',
      'triage_confirmed',
    ]);
    expect(ledger.reduce((sum, row) => sum + row.amount, 0)).toBe(2);
  });

  it('complete → undo cycles through the real award path leave zero completion rows', async () => {
    const task = makeTask({ status: 'pending' });
    await seedTask(task);

    for (let cycle = 0; cycle < 2; cycle += 1) {
      // Mirror the real flow: the status write lands, then the award —
      // undoTaskCompletion reads status from the DB (toast-undo staleness).
      await setStatus(task.id, 'completed');
      await awardCompletionStars(testDb.db, { ...task, status: 'completed' });
      const { starsRemoved } = await undoTaskCompletion(testDb.db, task);
      expect(starsRemoved).toBeGreaterThan(0);
      const completionRows = (await testDb.db.select().from(starActivityLog)).filter(
        (row) => row.action === 'task_completed' || row.action === 'completion_undone',
      );
      expect(completionRows).toHaveLength(0);
    }
    expect(await taskStatus(task.id)).toBe('pending');
  });

  it('undo reads status from the DB, not the caller snapshot (toast-undo path)', async () => {
    // The toast closes over a task whose status is STALE ('pending' — the
    // completion write hadn't landed when the handler captured it).
    const task = makeTask({ status: 'pending' });
    await seedTask(task);
    await setStatus(task.id, 'completed');
    await testDb.db.insert(starActivityLog).values(ledgerRow(task.id, 10, 'l1', 'task_completed'));

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(10);
    expect(await taskStatus(task.id)).toBe('pending');
    expect(await testDb.db.select().from(starActivityLog)).toHaveLength(0);
  });

  it('deletes only the newest unmatched award; a balanced legacy pair stays intact', async () => {
    // First-iteration undo wrote award+negative pairs — they net 0 and stay.
    const task = makeTask();
    await seedTask(task);
    await testDb.db
      .insert(starActivityLog)
      .values([
        ledgerRow(task.id, 10, 'l1', 'task_completed', new Date('2026-06-05T10:00:00Z')),
        ledgerRow(task.id, -10, 'l2', 'completion_undone', new Date('2026-06-05T11:00:00Z')),
        ledgerRow(task.id, 12, 'l3', 'task_completed', new Date('2026-06-06T09:00:00Z')),
      ]);

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(12);
    const ledger = await testDb.db.select().from(starActivityLog);
    expect(ledger.map((row) => row.id).sort()).toEqual(['l1', 'l2']);
    expect(ledger.reduce((sum, row) => sum + row.amount, 0)).toBe(0);
  });

  it('falls back to one negative row when no award row fits the outstanding credit', async () => {
    // Odd legacy state: award 12 but 2 already retracted — outstanding 10.
    // Deleting the 12 would overshoot, so the remainder is cancelled instead.
    const task = makeTask();
    await seedTask(task);
    await testDb.db
      .insert(starActivityLog)
      .values([
        ledgerRow(task.id, 12, 'l1', 'task_completed'),
        ledgerRow(task.id, -2, 'l2', 'completion_undone'),
      ]);

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(10);
    const ledger = await testDb.db.select().from(starActivityLog);
    // Completion-family rows now net zero — totals stay exact.
    expect(ledger.reduce((sum, row) => sum + row.amount, 0)).toBe(0);
    expect(await taskStatus(task.id)).toBe('pending');
  });

  it('no outstanding credit → nothing deleted or inserted, but the status still flips', async () => {
    const task = makeTask();
    await seedTask(task);

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(0);
    expect(await taskStatus(task.id)).toBe('pending');
    expect(await testDb.db.select().from(starActivityLog)).toHaveLength(0);
  });

  it('is a no-op on tasks that are not completed', async () => {
    const task = makeTask({ status: 'in_progress' });
    await seedTask(task);
    await testDb.db.insert(starActivityLog).values(ledgerRow(task.id, 10, 'l1', 'task_completed'));

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(0);
    expect(await taskStatus(task.id)).toBe('in_progress');
    expect(await testDb.db.select().from(starActivityLog)).toHaveLength(1);
  });

  it('cut-loose undo removes the newest release award and restores pending', async () => {
    const task = makeTask({ status: 'pending' });
    await seedTask(task);
    await setStatus(task.id, 'cut_loose');
    const awarded = await awardCutLooseStars(testDb.db, { ...task, status: 'cut_loose' });

    const { starsRemoved } = await undoTaskCutLoose(testDb.db, task);

    expect(starsRemoved).toBe(awarded);
    expect(await taskStatus(task.id)).toBe('pending');
    expect(await testDb.db.select().from(starActivityLog)).toHaveLength(0);
  });

  it('cut-loose undo is a no-op when the task is not cut loose', async () => {
    const task = makeTask({ status: 'completed' });
    await seedTask(task);
    await testDb.db.insert(starActivityLog).values(ledgerRow(task.id, 2, 'l1', 'task_cut_loose'));

    const { starsRemoved } = await undoTaskCutLoose(testDb.db, task);

    expect(starsRemoved).toBe(0);
    expect(await taskStatus(task.id)).toBe('completed');
    expect(await testDb.db.select().from(starActivityLog)).toHaveLength(1);
  });

  it('cut-loose undo removes only the NEWEST release row (cut → undo → cut again)', async () => {
    const task = makeTask({ status: 'pending' });
    await seedTask(task);
    await setStatus(task.id, 'cut_loose');
    await testDb.db
      .insert(starActivityLog)
      .values([
        ledgerRow(task.id, 2, 'l1', 'task_cut_loose', new Date('2026-06-05T10:00:00Z')),
        ledgerRow(task.id, 2, 'l2', 'task_cut_loose', new Date('2026-06-06T10:00:00Z')),
      ]);

    const { starsRemoved } = await undoTaskCutLoose(testDb.db, task);

    expect(starsRemoved).toBe(2);
    const ledger = await testDb.db.select().from(starActivityLog);
    expect(ledger.map((row) => row.id)).toEqual(['l1']);
  });

  it("only the target task's award is removed", async () => {
    const task = makeTask();
    const other = makeTask({ id: 'task-2', title: 'Other task' });
    await seedTask(task);
    await seedTask(other);
    await testDb.db
      .insert(starActivityLog)
      .values([
        ledgerRow(task.id, 10, 'l1', 'task_completed'),
        ledgerRow(other.id, 15, 'l2', 'task_completed'),
      ]);

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(10);
    expect(await taskStatus(other.id)).toBe('completed');
    const ledger = await testDb.db.select().from(starActivityLog);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.taskId).toBe(other.id);
  });
});
