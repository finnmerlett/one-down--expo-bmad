import type { StarAction, TaskData } from '@one-down/shared';
import { starActivityLog, tasks } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { awardCompletionStars } from './star-awards';
import { undoTaskCompletion } from './task-undo';

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

function ledgerRow(taskId: string, amount: number, id: string, action: StarAction) {
  return {
    id,
    taskId,
    taskTitle: 'snapshot',
    action,
    amount,
    createdAt: new Date('2026-06-05T10:00:00Z'),
  };
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

  it('returns the task to pending and retracts the completion award as a negative row', async () => {
    const task = makeTask();
    await seedTask(task);
    await testDb.db.insert(starActivityLog).values(ledgerRow(task.id, 12, 'l1', 'task_completed'));

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(12);
    expect(await taskStatus(task.id)).toBe('pending');
    const ledger = await testDb.db.select().from(starActivityLog);
    const retraction = ledger.find((row) => row.action === 'completion_undone');
    expect(retraction).toMatchObject({ taskId: task.id, amount: -12 });
    // Append-only: the original award row is untouched.
    expect(ledger.filter((row) => row.action === 'task_completed')).toHaveLength(1);
  });

  it('leaves subtask and triage stars untouched — only the completion credit moves', async () => {
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
    const net = ledger.reduce((sum, row) => sum + row.amount, 0);
    expect(net).toBe(2); // subtask + triage stars survive
  });

  it('complete → undo → complete → undo cycles always net the completion credit to zero', async () => {
    const task = makeTask({ status: 'pending' });
    await seedTask(task);

    // Cycle twice through the REAL award path (amounts may differ per cycle).
    for (let cycle = 0; cycle < 2; cycle += 1) {
      await awardCompletionStars(testDb.db, { ...task, status: 'completed' });
      const { starsRemoved } = await undoTaskCompletion(testDb.db, {
        ...task,
        status: 'completed',
      });
      expect(starsRemoved).toBeGreaterThan(0);
    }

    const ledger = await testDb.db.select().from(starActivityLog);
    const completionNet = ledger
      .filter((row) => row.action === 'task_completed' || row.action === 'completion_undone')
      .reduce((sum, row) => sum + row.amount, 0);
    expect(completionNet).toBe(0);
    expect(await taskStatus(task.id)).toBe('pending');
  });

  it('no outstanding credit → no retraction row, but the status still flips', async () => {
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

  it("only the target task's credit is retracted", async () => {
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
    const otherNet = ledger
      .filter((row) => row.taskId === other.id)
      .reduce((sum, row) => sum + row.amount, 0);
    expect(otherNet).toBe(15);
  });
});
