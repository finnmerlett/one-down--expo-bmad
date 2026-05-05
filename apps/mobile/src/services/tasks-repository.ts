import { type LocalTask, type NewLocalTask, tasks } from '@one-down/shared/schema-local';
import { randomUUID } from 'expo-crypto';
import { desc, eq } from 'drizzle-orm';

import type { AppDatabase } from '@/lib/local-db';

export type CreateTaskInput = {
  title: string;
  details?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createTask(db: AppDatabase, input: CreateTaskInput): LocalTask {
  const trimmedTitle = input.title.trim();
  if (trimmedTitle.length === 0) {
    throw new Error('Task title is required');
  }

  const trimmedDetails =
    typeof input.details === 'string' && input.details.trim().length > 0
      ? input.details.trim()
      : null;

  const id = randomUUID();
  if (!UUID_RE.test(id)) {
    throw new Error('Generated task id is not a valid UUID');
  }

  const now = new Date();
  const row: NewLocalTask = {
    id,
    title: trimmedTitle,
    details: trimmedDetails,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(tasks).values(row).run();
  const inserted = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!inserted) {
    throw new Error('Task insert succeeded but row was not retrievable');
  }
  return inserted;
}

export function listTasksQuery(db: AppDatabase) {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export function listTasks(db: AppDatabase): LocalTask[] {
  return listTasksQuery(db).all();
}

export function getMostRecentTaskQuery(db: AppDatabase) {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(1);
}

export function getMostRecentTask(db: AppDatabase): LocalTask | undefined {
  return getMostRecentTaskQuery(db).get();
}
