import type { TaskData } from '@one-down/shared';
import { starActivityLog, subtasks, taskOffers, tasks } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import {
  awardCompletionStars,
  awardCutLooseStars,
  awardSubtaskStars,
  maybeAwardTriageQueueCleared,
} from './star-awards';

// expo-crypto is a native module; under Node the equivalent is node:crypto.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));

const NOW = new Date('2026-06-10T12:00:00Z');

function makeTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: 'task-1',
    title: 'Sample task',
    details: null,
    notes: null,
    status: 'pending',
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

function makeSubtask(taskId: string, index: number, completed: boolean) {
  return {
    id: `sub-${taskId}-${index}`,
    taskId,
    title: `Step ${index}`,
    completed,
    orderIndex: index,
    source: 'ai' as const,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe('star-awards (integration, real migration SQL — v1.5 economy)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  it('completion pays the size value (★20 big time) with a title snapshot', async () => {
    const task = makeTask({ id: 'done-1', title: 'Finish the report', size: 'big_time' });
    await testDb.db.insert(tasks).values(task);

    const breakdown = await awardCompletionStars(testDb.db, task, NOW);

    expect(breakdown).toEqual({ value: 20, bonus: 0, banked: 0, total: 20 });

    const rows = await testDb.db.select().from(starActivityLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      taskId: 'done-1',
      taskTitle: 'Finish the report',
      action: 'task_completed',
      amount: 20,
    });
    expect(rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rows[0]?.createdAt).toEqual(NOW);
  });

  it('completion converts the banked steps — pays value minus banked', async () => {
    const task = makeTask({ id: 'banked-1', size: 'big_time' });
    await testDb.db.insert(tasks).values(task);
    await testDb.db
      .insert(subtasks)
      .values([makeSubtask('banked-1', 0, true), makeSubtask('banked-1', 1, true)]);
    // Bank both completed steps through the real delta path (2★ each on a
    // big time card — both calls see count=2/before=1, delta 2). Total 4★.
    await awardSubtaskStars(testDb.db, task, { title: 'Step 0' }, 'subtask_completed', 1);
    await awardSubtaskStars(testDb.db, task, { title: 'Step 1' }, 'subtask_completed', 1);

    const breakdown = await awardCompletionStars(testDb.db, task, NOW);

    expect(breakdown).toEqual({ value: 20, bonus: 0, banked: 4, total: 16 });
    // Task total across the ledger = the card's stated value.
    const rows = await testDb.db.select().from(starActivityLog);
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(20);
  });

  it('completion inside the bonus window adds the badge on top of the value', async () => {
    // Deadline 3 days out — inside the [4d, 2d) window; quick win badge +3.
    const task = makeTask({
      id: 'windowed',
      size: 'quick_win',
      createdAt: new Date('2026-06-01T10:00:00Z'),
      deadline: new Date('2026-06-13T12:00:00Z'),
    });
    await testDb.db.insert(tasks).values(task);

    const breakdown = await awardCompletionStars(testDb.db, task, NOW);

    expect(breakdown).toEqual({ value: 5, bonus: 3, banked: 0, total: 8 });
  });

  it('completion consumes a live offer: pays it and clears the row', async () => {
    const task = makeTask({ id: 'offered', size: 'quick_win' });
    await testDb.db.insert(tasks).values(task);
    await testDb.db.insert(taskOffers).values({
      taskId: 'offered',
      amount: 3,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const breakdown = await awardCompletionStars(testDb.db, task, NOW);

    expect(breakdown).toEqual({ value: 5, bonus: 3, banked: 0, total: 8 });
    expect(await testDb.db.select().from(taskOffers)).toHaveLength(0);
  });

  it('over-banked tasks floor at zero — never negative (guilt-free)', async () => {
    const task = makeTask({ id: 'over', size: 'quick_win' });
    await testDb.db.insert(tasks).values(task);
    // Legacy/odd ledger state: more banked than the value.
    await testDb.db.insert(starActivityLog).values({
      id: '00000000-0000-4000-8000-000000000001',
      taskId: 'over',
      taskTitle: 'Step',
      action: 'subtask_completed',
      amount: 7,
      createdAt: NOW,
    });

    const breakdown = await awardCompletionStars(testDb.db, task, NOW);

    expect(breakdown.total).toBe(0);
    expect(breakdown.banked).toBe(7);
  });

  it('banking is size-aware and capped: quick win banks 1★/step up to 5', async () => {
    const task = makeTask({ id: 'qw', size: 'quick_win' });
    await testDb.db.insert(tasks).values(task);
    // Complete 6 steps one at a time — the 6th is past the cap, banks 0.
    for (let index = 0; index < 6; index++) {
      await testDb.db.insert(subtasks).values(makeSubtask('qw', index, true));
      const amount = await awardSubtaskStars(
        testDb.db,
        task,
        { title: `Step ${index}` },
        'subtask_completed',
        1,
      );
      expect(amount).toBe(index < 5 ? 1 : 0);
    }
    const rows = await testDb.db.select().from(starActivityLog);
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(5);
  });

  it('unticking writes the signed reverse delta', async () => {
    const task = makeTask({ id: 'undo-step', size: 'big_time' });
    await testDb.db.insert(tasks).values(task);
    await testDb.db.insert(subtasks).values(makeSubtask('undo-step', 0, true));
    await awardSubtaskStars(testDb.db, task, { title: 'Step 0' }, 'subtask_completed', 1);

    // Untick: the row is now incomplete; the delta reverses the 2★.
    await testDb.db.update(subtasks).set({ completed: false });
    const amount = await awardSubtaskStars(
      testDb.db,
      task,
      { title: 'Step 0' },
      'subtask_completed',
      -1,
    );

    expect(amount).toBe(-2);
    const rows = await testDb.db.select().from(starActivityLog);
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(0);
  });

  it('triage queue-clear pays 5 only when the queue is empty, once per day', async () => {
    const flagged = makeTask({ id: 'flagged', hasCheckNeeded: true });
    await testDb.db.insert(tasks).values(flagged);

    // Queue non-empty → gated.
    expect(await maybeAwardTriageQueueCleared(testDb.db, NOW)).toBe(0);

    // Clear the flag: queue empty → pays once...
    await testDb.db.update(tasks).set({ hasCheckNeeded: false });
    expect(await maybeAwardTriageQueueCleared(testDb.db, NOW)).toBe(5);
    // ...and not twice the same local day.
    expect(await maybeAwardTriageQueueCleared(testDb.db, NOW)).toBe(0);
  });

  it('persists the flat cut-loose transaction', async () => {
    const task = makeTask({ id: 'released-1', title: 'Let this one go' });
    await testDb.db.insert(tasks).values(task);

    const amount = await awardCutLooseStars(testDb.db, task);

    expect(amount).toBe(3);
    const rows = await testDb.db.select().from(starActivityLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      taskId: 'released-1',
      taskTitle: 'Let this one go',
      action: 'task_cut_loose',
      amount: 3,
    });
  });

  it('still returns the breakdown when the insert fails (AC7 — award never blocks completion)', async () => {
    const task = makeTask();
    await testDb.db.insert(tasks).values(task);
    // Sabotage the ledger table so the insert throws.
    testDb.sqlite.exec('DROP TABLE star_activity_log');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const breakdown = await awardCompletionStars(testDb.db, task, NOW);

    expect(breakdown.total).toBe(5);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
