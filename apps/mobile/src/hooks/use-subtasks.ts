import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { subtasks } from '@one-down/shared/schema-local';

import { db } from '@/lib/local-db';

// Reactive subtask list for one task, in display order (Story 6.3).
export function useSubtasks(taskId: string) {
  const { data } = useLiveQuery(
    db.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(asc(subtasks.orderIndex)),
    [taskId],
  );
  return data ?? [];
}
