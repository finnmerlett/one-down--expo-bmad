import type { LocalTask } from '@one-down/shared/schema-local';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { useLocalDb } from '@/hooks/use-local-db';
import { getMostRecentTaskQuery, listTasksQuery } from '@/services/tasks-repository';

export function useTasks(): LocalTask[] {
  const db = useLocalDb();
  const { data } = useLiveQuery(listTasksQuery(db));
  return (data ?? []) as LocalTask[];
}

export function useMostRecentTask(): LocalTask | undefined {
  const db = useLocalDb();
  const { data } = useLiveQuery(getMostRecentTaskQuery(db));
  const rows = (data ?? []) as LocalTask[];
  return rows[0];
}
