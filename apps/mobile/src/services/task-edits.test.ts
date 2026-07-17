import { tasks } from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import {
  appendDistillationToNotes,
  completeTask,
  createNotesAutosaver,
  cutLooseTask,
  startTask,
} from './task-edits';
import { createTask, incrementSkipCount, setTaskStatus } from './tasks-repository';

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

describe('cutLooseTask (Story 2.4)', () => {
  beforeEach(async () => {
    trackMock.mockClear();
    await db.delete(tasks);
  });

  it('persists cut_loose from pending and emits task_cut_loose once', async () => {
    const task = await createTask(db, { title: 'Not happening' });

    cutLooseTask(task, 'card_back_overlay');
    await flushAsync();

    const [row] = await db.select().from(tasks);
    expect(row?.status).toBe('cut_loose');
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('task_cut_loose', {
      via: 'card_back_overlay',
      was_started: false,
    });
  });

  it('archives an in_progress task with was_started true', async () => {
    const task = await createTask(db, { title: 'Started then dropped' });
    await setTaskStatus(db, task.id, 'in_progress');

    cutLooseTask({ ...task, status: 'in_progress' }, 'task_running');
    await flushAsync();

    const [row] = await db.select().from(tasks);
    expect(row?.status).toBe('cut_loose');
    expect(trackMock).toHaveBeenCalledWith('task_cut_loose', {
      via: 'task_running',
      was_started: true,
    });
  });

  it('is a no-op (no write, no event) from completed and cut_loose', async () => {
    const task = await createTask(db, { title: 'Already done' });
    await setTaskStatus(db, task.id, 'completed');

    cutLooseTask({ ...task, status: 'completed' }, 'list_detail');
    cutLooseTask({ ...task, status: 'cut_loose' }, 'list_detail');
    await flushAsync();

    const [row] = await db.select().from(tasks);
    expect(row?.status).toBe('completed');
    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe('startTask skip reset (Story 6.4)', () => {
  beforeEach(async () => {
    trackMock.mockClear();
    await db.delete(tasks);
  });

  it('the pending → in_progress transition resets a positive skip count', async () => {
    const task = await createTask(db, { title: 'Avoided task' });
    await incrementSkipCount(db, task.id);
    await incrementSkipCount(db, task.id);

    startTask({ ...task, skipCount: 2 }, 'card_back_overlay');
    await flushAsync();

    const [row] = await db.select().from(tasks);
    expect(row?.status).toBe('in_progress');
    expect(row?.skipCount).toBe(0);
  });

  it('Continue (already started) neither writes nor resets', async () => {
    const task = await createTask(db, { title: 'Already running' });
    await setTaskStatus(db, task.id, 'in_progress');
    await incrementSkipCount(db, task.id);

    startTask({ ...task, status: 'in_progress', skipCount: 1 }, 'list_detail');
    await flushAsync();

    const [row] = await db.select().from(tasks);
    expect(row?.skipCount).toBe(1);
    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe('appendDistillationToNotes (Story 6.4, pure)', () => {
  it('covers null notes, null distillation, and both present', () => {
    expect(appendDistillationToNotes(null, 'Approach note: go physical')).toBe(
      'Approach note: go physical',
    );
    expect(appendDistillationToNotes('existing notes', null)).toBe('existing notes');
    expect(appendDistillationToNotes(null, null)).toBeNull();
    expect(appendDistillationToNotes('existing notes', 'Approach note: go physical')).toBe(
      'existing notes\n\nApproach note: go physical',
    );
  });
});
