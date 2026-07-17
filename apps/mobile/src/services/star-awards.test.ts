import type { TaskData } from '@one-down/shared';
import { starActivityLog, tasks } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { awardCompletionStars, awardCutLooseStars } from './star-awards';

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
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

describe('star-awards (integration, real migration SQL)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  it('persists a completion transaction with the calculated total and a title snapshot', async () => {
    const task = makeTask({ id: 'done-1', title: 'Finish the report', size: 'big_time' });
    await testDb.db.insert(tasks).values(task);

    const breakdown = await awardCompletionStars(testDb.db, task, NOW);

    expect(breakdown).toEqual({
      base: 10,
      urgencyBonus: 0,
      sizeBonus: 5,
      earlyBonus: 0,
      total: 15,
    });

    const rows = await testDb.db.select().from(starActivityLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      taskId: 'done-1',
      taskTitle: 'Finish the report',
      action: 'task_completed',
      amount: breakdown.total,
    });
    expect(rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rows[0]?.createdAt).toEqual(NOW);
  });

  it('ranks urgency against ACTIVE db tasks only — completed siblings do not count', async () => {
    const task = makeTask({ id: 'due', deadline: new Date('2026-06-15T00:00:00Z') });
    // Sooner deadline, but completed — must not dilute the urgency pool.
    const completedSibling = makeTask({
      id: 'sibling',
      title: 'Already done',
      status: 'completed',
      deadline: new Date('2026-06-11T00:00:00Z'),
    });
    await testDb.db.insert(tasks).values([task, completedSibling]);

    const breakdown = await awardCompletionStars(testDb.db, task, NOW);

    // Sole active deadline task -> full urgency 5 (3 if the sibling counted).
    expect(breakdown.urgencyBonus).toBe(5);
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

    expect(breakdown.total).toBe(10);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
