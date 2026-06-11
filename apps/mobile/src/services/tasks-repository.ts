import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'expo-crypto';

import type { TaskContext, TaskData, TaskSize, TaskStatus } from '@one-down/shared';
import { tasks } from '@one-down/shared/schema-local';

// Repository functions take the db as first argument so integration tests can
// pass the better-sqlite3-backed test db (same schema, real SQL).
export type TasksDb = BaseSQLiteDatabase<'sync' | 'async', unknown, Record<string, unknown>>;

export interface CreateTaskInput {
  title: string;
  details?: string;
}

export class EmptyTitleError extends Error {
  constructor() {
    super('Task title is required');
    this.name = 'EmptyTitleError';
  }
}

export async function createTask(db: TasksDb, input: CreateTaskInput): Promise<TaskData> {
  const title = input.title.trim();
  if (!title) {
    throw new EmptyTitleError();
  }
  const details = input.details?.trim();
  const now = new Date();
  const task: TaskData = {
    // expo-crypto, NOT global crypto.randomUUID() (unreliable under Hermes)
    id: randomUUID(),
    title,
    details: details ? details : null,
    notes: null,
    status: 'pending',
    size: null,
    contexts: null,
    deadline: null,
    hasCheckNeeded: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(tasks).values(task);
  return task;
}

/**
 * Inline-edit patch (card back, Story 1.4). Only the fields present are
 * written. `contexts` comes in as an array and is stored as the JSON-encoded
 * column value (null when empty) — callers never hand-build the JSON.
 */
export interface UpdateTaskPatch {
  title?: string;
  details?: string | null;
  notes?: string | null;
  size?: TaskSize | null;
  contexts?: TaskContext[];
}

/** Normalize free-text fields the same way createTask does: trimmed, '' → null. */
function normalizeText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Status transitions (start/complete/cut-loose, Epic 2) are deliberate domain
 * actions, not inline edits — kept out of UpdateTaskPatch so the card back's
 * generic patch path can never change a task's lifecycle state.
 */
export async function setTaskStatus(db: TasksDb, id: string, status: TaskStatus): Promise<void> {
  await db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, id));
}

export async function updateTask(db: TasksDb, id: string, patch: UpdateTaskPatch): Promise<void> {
  const values: Partial<TaskData> = { updatedAt: new Date() };
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) {
      throw new EmptyTitleError();
    }
    values.title = title;
  }
  if (patch.details !== undefined) {
    values.details = normalizeText(patch.details);
  }
  if (patch.notes !== undefined) {
    values.notes = normalizeText(patch.notes);
  }
  if (patch.size !== undefined) {
    values.size = patch.size;
  }
  if (patch.contexts !== undefined) {
    values.contexts = patch.contexts.length > 0 ? JSON.stringify(patch.contexts) : null;
  }
  await db.update(tasks).set(values).where(eq(tasks.id, id));
}
