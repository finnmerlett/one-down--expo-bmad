import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'expo-crypto';

import type { TaskData } from '@one-down/shared';
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
