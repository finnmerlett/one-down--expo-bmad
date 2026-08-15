import { eq } from 'drizzle-orm';

import type { StarAction, TaskData } from '@one-down/shared';
import { starActivityLog, tasks } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { awardCompletionStars, awardCutLooseStars } from './star-awards';
import { visibleLedgerRows } from './star-ledger-display';
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
    deletedAt: null,
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

  /** What the user's FEED shows (9.7 convention pass): the ledger is
   *  append-only; same-local-day do/undo pairs collapse at render. */
  async function liveLedger() {
    return visibleLedgerRows(await testDb.db.select().from(starActivityLog));
  }

  it('returns the task to pending and writes a compensating row — same-day churn leaves the feed', async () => {
    const task = makeTask();
    await seedTask(task);
    // Award stamped "now" so the undo (also now) is a same-day pair.
    await testDb.db
      .insert(starActivityLog)
      .values(ledgerRow(task.id, 12, 'l1', 'task_completed', new Date()));

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(12);
    expect(await taskStatus(task.id)).toBe('pending');
    // The append-only ledger keeps BOTH rows, netting zero...
    const all = await testDb.db.select().from(starActivityLog);
    expect(all).toHaveLength(2);
    expect(all.reduce((sum, row) => sum + row.amount, 0)).toBe(0);
    expect(all.find((row) => row.action === 'completion_undone')?.amount).toBe(-12);
    // ...while the same-day pair disappears from what the user sees.
    expect(await liveLedger()).toHaveLength(0);
  });

  it('keeps a CROSS-day undo visible in the feed as honest history', async () => {
    const task = makeTask();
    await seedTask(task);
    // Award from a past day; the undo lands today → no same-day collapse.
    await testDb.db.insert(starActivityLog).values(ledgerRow(task.id, 12, 'l1', 'task_completed'));

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(12);
    const feed = await liveLedger();
    expect(feed.map((row) => row.action).sort()).toEqual(['completion_undone', 'task_completed']);
  });

  it('leaves subtask and triage stars untouched — only the completion award goes', async () => {
    const task = makeTask();
    await seedTask(task);
    await testDb.db
      .insert(starActivityLog)
      .values([
        ledgerRow(task.id, 10, 'l1', 'task_completed', new Date()),
        ledgerRow(task.id, 1, 'l2', 'subtask_completed'),
        ledgerRow(task.id, 1, 'l3', 'triage_confirmed'),
      ]);

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(10);
    const ledger = await liveLedger();
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
      const completionRows = (await liveLedger()).filter(
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
    await testDb.db
      .insert(starActivityLog)
      .values(ledgerRow(task.id, 10, 'l1', 'task_completed', new Date()));

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(10);
    expect(await taskStatus(task.id)).toBe('pending');
    expect(await liveLedger()).toHaveLength(0);
  });

  it('reverses only the outstanding credit; a balanced same-day legacy pair collapses from the feed', async () => {
    // An old same-day award+undo pair nets 0 and hides; a later award still
    // holds credit — undo reverses exactly that.
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
    // Raw ledger: all four rows, netting zero.
    const all = await testDb.db.select().from(starActivityLog);
    expect(all).toHaveLength(4);
    expect(all.reduce((sum, row) => sum + row.amount, 0)).toBe(0);
    // Feed: the old same-day pair is churn (hidden); the cross-day undo of
    // l3 stays visible as honest history.
    const feed = await liveLedger();
    expect(feed.map((row) => row.id).sort()).toEqual(
      ['l3', all.find((r) => r.amount === -12)!.id].sort(),
    );
  });

  it('writes ONE negative row for the outstanding credit (partial legacy retraction)', async () => {
    // Odd legacy state: award 12 but 2 already retracted — outstanding 10.
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
    // Completion-family rows now net zero — totals stay exact.
    const all = await testDb.db.select().from(starActivityLog);
    expect(all.reduce((sum, row) => sum + row.amount, 0)).toBe(0);
    expect(await taskStatus(task.id)).toBe('pending');
  });

  it('no outstanding credit → nothing deleted or inserted, but the status still flips', async () => {
    const task = makeTask();
    await seedTask(task);

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(0);
    expect(await taskStatus(task.id)).toBe('pending');
    expect(await liveLedger()).toHaveLength(0);
  });

  it('is a no-op on tasks that are not completed', async () => {
    const task = makeTask({ status: 'in_progress' });
    await seedTask(task);
    await testDb.db.insert(starActivityLog).values(ledgerRow(task.id, 10, 'l1', 'task_completed'));

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(0);
    expect(await taskStatus(task.id)).toBe('in_progress');
    expect(await liveLedger()).toHaveLength(1);
  });

  it('cut-loose undo removes the newest release award and restores pending', async () => {
    const task = makeTask({ status: 'pending' });
    await seedTask(task);
    await setStatus(task.id, 'cut_loose');
    const awarded = await awardCutLooseStars(testDb.db, { ...task, status: 'cut_loose' });

    const { starsRemoved } = await undoTaskCutLoose(testDb.db, task);

    expect(starsRemoved).toBe(awarded);
    expect(await taskStatus(task.id)).toBe('pending');
    expect(await liveLedger()).toHaveLength(0);
  });

  it('cut-loose undo is a no-op when the task is not cut loose', async () => {
    const task = makeTask({ status: 'completed' });
    await seedTask(task);
    await testDb.db.insert(starActivityLog).values(ledgerRow(task.id, 2, 'l1', 'task_cut_loose'));

    const { starsRemoved } = await undoTaskCutLoose(testDb.db, task);

    expect(starsRemoved).toBe(0);
    expect(await taskStatus(task.id)).toBe('completed');
    expect(await liveLedger()).toHaveLength(1);
  });

  it('cut-loose undo reverses ONE release (cut → undo → cut again nets a single award)', async () => {
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
    const all = await testDb.db.select().from(starActivityLog);
    expect(all).toHaveLength(3);
    expect(all.reduce((sum, row) => sum + row.amount, 0)).toBe(2);
    expect(all.find((row) => row.action === 'cut_loose_undone')?.amount).toBe(-2);
  });

  it("only the target task's award is reversed", async () => {
    const task = makeTask();
    const other = makeTask({ id: 'task-2', title: 'Other task' });
    await seedTask(task);
    await seedTask(other);
    await testDb.db
      .insert(starActivityLog)
      .values([
        ledgerRow(task.id, 10, 'l1', 'task_completed', new Date()),
        ledgerRow(other.id, 15, 'l2', 'task_completed', new Date()),
      ]);

    const { starsRemoved } = await undoTaskCompletion(testDb.db, task);

    expect(starsRemoved).toBe(10);
    expect(await taskStatus(other.id)).toBe('completed');
    const ledger = await liveLedger();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.taskId).toBe(other.id);
  });
});
