import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { subtasks } from '@one-down/shared/schema-local';

import { db } from '@/lib/local-db';

// Reactive LIVE subtask list for one task, in display order (Story 6.3;
// tombstone-filtered since 9.7).
export function useSubtasks(taskId: string) {
  const { data } = useLiveQuery(
    db
      .select()
      .from(subtasks)
      .where(and(eq(subtasks.taskId, taskId), isNull(subtasks.deletedAt)))
      .orderBy(asc(subtasks.orderIndex)),
    [taskId],
  );
  return data ?? [];
}
