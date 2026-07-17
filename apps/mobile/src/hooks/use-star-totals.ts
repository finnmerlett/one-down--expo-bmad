import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { starActivityLog } from '@one-down/shared/schema-local';

import { db } from '@/lib/local-db';
import { computeStarTotals } from '@/services/star-totals';

/**
 * Live star totals for the top-bar counter (Story 4.2). Called ONLY from
 * route screens (`app/`), never from components with stories — expo-sqlite
 * can't run under jest (same constraint as useTasks). Recomputing per render
 * is fine: rows are small and a midnight rollover corrects on next render.
 */
export function useStarTotals(): { total: number; today: number } {
  const { data } = useLiveQuery(
    db
      .select({ amount: starActivityLog.amount, createdAt: starActivityLog.createdAt })
      .from(starActivityLog),
  );
  return computeStarTotals(data ?? [], new Date());
}
