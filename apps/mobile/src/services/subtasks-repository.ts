import { asc, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import type { SubtaskData, SubtaskSource } from '@one-down/shared';
import { subtasks } from '@one-down/shared/schema-local';

import type { TasksDb } from './tasks-repository';

// Subtask persistence (Story 6.3) — db injected like tasks-repository so
// integration tests run the real migration SQL.

/** Highest existing orderIndex for a task, or -1 when it has none. */
async function maxOrderIndex(db: TasksDb, taskId: string): Promise<number> {
  const [top] = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId))
    .orderBy(desc(subtasks.orderIndex))
    .limit(1);
  return top?.orderIndex ?? -1;
}

/**
 * Insert accepted steps as subtasks in the given order. orderIndex continues
 * after the task's highest existing index, so a micro-task added later (6.4)
 * lands below an earlier breakdown. Blank titles are skipped.
 */
export async function createSubtasks(
  db: TasksDb,
  taskId: string,
  titles: string[],
  source: SubtaskSource,
): Promise<SubtaskData[]> {
  const cleaned = titles.map((title) => title.trim()).filter((title) => title.length > 0);
  if (cleaned.length === 0) return [];
  const start = (await maxOrderIndex(db, taskId)) + 1;
  const rows = await db
    .insert(subtasks)
    .values(
      cleaned.map((title, offset) => ({
        // expo-crypto, NOT global crypto.randomUUID() (unreliable under Hermes)
        id: randomUUID(),
        taskId,
        title,
        orderIndex: start + offset,
        source,
      })),
    )
    .returning();
  return rows;
}

/**
 * Tick/untick a subtask. Returns whether the stored state actually changed —
 * the no-op guard the star award/reversal logic keys on (a repeated write of
 * the same state must never double-award).
 */
export async function setSubtaskCompleted(
  db: TasksDb,
  id: string,
  completed: boolean,
): Promise<boolean> {
  const [row] = await db.select().from(subtasks).where(eq(subtasks.id, id));
  if (!row || row.completed === completed) return false;
  await db.update(subtasks).set({ completed }).where(eq(subtasks.id, id));
  return true;
}

/** Delete a subtask, returning the deleted row (null when already gone). */
export async function deleteSubtask(db: TasksDb, id: string): Promise<SubtaskData | null> {
  const [deleted] = await db.delete(subtasks).where(eq(subtasks.id, id)).returning();
  return deleted ?? null;
}

/** Ordered read used by the live-query hook (and tests). */
export async function listSubtasks(db: TasksDb, taskId: string): Promise<SubtaskData[]> {
  return db
    .select()
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId))
    .orderBy(asc(subtasks.orderIndex));
}
