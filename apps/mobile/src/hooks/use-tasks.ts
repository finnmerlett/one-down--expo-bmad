import { desc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { tasks } from '@one-down/shared/schema-local';

import { db } from '@/lib/local-db';

// Reactive list of all LIVE tasks, newest first (tombstoned rows are
// invisible everywhere — Story 9.7). Curation/filtering lands in 1.3+.
export function useTasks() {
  // id tiebreaker: same-millisecond saves (rapid capture) keep a stable order.
  const { data } = useLiveQuery(
    db
      .select()
      .from(tasks)
      .where(isNull(tasks.deletedAt))
      .orderBy(desc(tasks.createdAt), desc(tasks.id)),
  );
  return data ?? [];
}
