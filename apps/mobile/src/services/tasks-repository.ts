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
  // Timestamps come from the schema's $defaultFn (Story 5.3 pre-work); the
  // returned row is the DB-authoritative shape, not a hand-built object.
  const [task] = await db
    .insert(tasks)
    .values({
      // expo-crypto, NOT global crypto.randomUUID() (unreliable under Hermes)
      id: randomUUID(),
      title,
      details: details ? details : null,
    })
    .returning();
  if (!task) {
    throw new Error('Task insert returned no row');
  }
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
  // updatedAt is stamped by the schema's $onUpdate (Story 5.3 pre-work).
  await db.update(tasks).set({ status }).where(eq(tasks.id, id));
}

export async function updateTask(db: TasksDb, id: string, patch: UpdateTaskPatch): Promise<void> {
  // updatedAt is stamped by the schema's $onUpdate (Story 5.3 pre-work).
  const values: Partial<TaskData> = {};
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
  // Nothing to write → true no-op: don't bump updatedAt (it would mark the
  // row as content-changed and trigger a pointless sync round).
  if (Object.keys(values).length === 0) {
    return;
  }
  await db.update(tasks).set(values).where(eq(tasks.id, id));
}
