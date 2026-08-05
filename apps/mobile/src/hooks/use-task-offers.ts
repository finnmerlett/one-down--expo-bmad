import { gt } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { taskOffers } from '@one-down/shared/schema-local';

import { db } from '@/lib/local-db';

/**
 * Live don't-skip offers as taskId → amount (v1.5 Row E). Drives the gold
 * `+N TO START IT NOW` band on deck cards and list rows. Route-screen-only
 * hook (expo-sqlite jest constraint).
 */
export function useTaskOffers(): Map<string, number> {
  const { data } = useLiveQuery(db.select().from(taskOffers).where(gt(taskOffers.amount, 0)));
  return useMemo(() => new Map((data ?? []).map((row) => [row.taskId, row.amount])), [data]);
}
