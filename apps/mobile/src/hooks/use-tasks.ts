import type { LocalTask } from '@one-down/shared/schema-local';
import type { TaskContext } from '@one-down/shared/schema-local';
import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { useLocalDb } from '@/hooks/use-local-db';
import { curateTasks } from '@/services/curation';
import { getMostRecentTaskQuery, listTasksQuery } from '@/services/tasks-repository';

export function useTasks(): LocalTask[] {
  const db = useLocalDb();
  const { data } = useLiveQuery(listTasksQuery(db));
  return (data ?? []) as LocalTask[];
}

export function useCuratedTasks(activeContexts?: TaskContext[]): LocalTask[] {
  const tasks = useTasks();
  return useMemo(() => curateTasks(tasks, activeContexts), [tasks, activeContexts]);
}

export function useMostRecentTask(): LocalTask | undefined {
  const db = useLocalDb();
  const { data } = useLiveQuery(getMostRecentTaskQuery(db));
  const rows = (data ?? []) as LocalTask[];
  return rows[0];
}
