import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { tasks } from '@one-down/shared/schema-local';

import { db } from '@/lib/local-db';

// Reactive list of all tasks, newest first. Curation/filtering lands in 1.3+.
export function useTasks() {
  // id tiebreaker: same-millisecond saves (rapid capture) keep a stable order.
  const { data } = useLiveQuery(
    db.select().from(tasks).orderBy(desc(tasks.createdAt), desc(tasks.id)),
  );
  return data ?? [];
}
