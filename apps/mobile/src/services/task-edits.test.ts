import { tasks } from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { completeTask, createNotesAutosaver } from './task-edits';
import { createTask, setTaskStatus } from './tasks-repository';

// expo-crypto is a native module; under Node the equivalent is node:crypto.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));

// task-edits' fire-and-forget savers write against the module-scoped app db —
// swap in a REAL in-memory database running the exact on-device migration SQL
// (test the collaboration, not a mock).
jest.mock('@/lib/local-db', () => {
  const { createTestDb } =
    jest.requireActual<typeof import('../test-utils/db')>('../test-utils/db');
  const { loadLocalMigrationsSql } = jest.requireActual<typeof import('../test-utils/migrations')>(
    '../test-utils/migrations',
  );
  return { db: createTestDb(loadLocalMigrationsSql()).db };
});

jest.mock('@/lib/analytics/track', () => ({ track: jest.fn() }));

const trackMock = jest.mocked(track);

// The savers are fire-and-forget (void promises) — let their chains settle.
const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('createNotesAutosaver (Story 2.2)', () => {
  beforeEach(async () => {
    trackMock.mockClear();
    await db.delete(tasks);
  });

  it('writes every save for real but emits task_edited only once per instance', async () => {
    const task = await createTask(db, { title: 'Running task' });
    const saveNotes = createNotesAutosaver(task.id);

    saveNotes('First pass');
    await flushAsync();
    let [row] = await db.select().from(tasks);
    expect(row?.notes).toBe('First pass');
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('task_edited', { field: 'notes' });

    saveNotes('Second pass');
    await flushAsync();
    [row] = await db.select().from(tasks);
    expect(row?.notes).toBe('Second pass');
    // Still once — debounced pauses must not spam the event (spec rationale).
    expect(trackMock).toHaveBeenCalledTimes(1);

    saveNotes(null);
    await flushAsync();
    [row] = await db.select().from(tasks);
    expect(row?.notes).toBeNull();
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('a fresh saver instance (new screen session) emits again', async () => {
    const task = await createTask(db, { title: 'Running task' });

    createNotesAutosaver(task.id)('session one note');
    await flushAsync();
    createNotesAutosaver(task.id)('session two note');
    await flushAsync();

    const [row] = await db.select().from(tasks);
    expect(row?.notes).toBe('session two note');
    expect(trackMock).toHaveBeenCalledTimes(2);
  });
});

describe('completeTask (Story 2.3)', () => {
  beforeEach(async () => {
    trackMock.mockClear();
    await db.delete(tasks);
  });

  it('persists completed from in_progress and emits task_completed once', async () => {
    const task = await createTask(db, { title: 'Nearly there' });
    await setTaskStatus(db, task.id, 'in_progress');

    completeTask({ ...task, status: 'in_progress', size: 'quick_win', notes: 'scribbles' });
    await flushAsync();

    const [row] = await db.select().from(tasks);
    expect(row?.status).toBe('completed');
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('task_completed', {
      size: 'quick_win',
      had_notes: true,
    });
  });

  it('completes straight from pending (the startTask write may not have landed — 2.1 race)', async () => {
    const task = await createTask(db, { title: 'Fast finisher' });

    completeTask(task);
    await flushAsync();

    const [row] = await db.select().from(tasks);
    expect(row?.status).toBe('completed');
    expect(trackMock).toHaveBeenCalledWith('task_completed', { size: null, had_notes: false });
  });

  it('is a no-op (no write, no event) from completed and cut_loose', async () => {
    const task = await createTask(db, { title: 'Already settled' });
    await setTaskStatus(db, task.id, 'cut_loose');

    completeTask({ ...task, status: 'cut_loose' });
    completeTask({ ...task, status: 'completed' });
    await flushAsync();

    const [row] = await db.select().from(tasks);
    expect(row?.status).toBe('cut_loose');
    expect(trackMock).not.toHaveBeenCalled();
  });
});
