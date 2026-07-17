import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { starActivityLog } from '@one-down/shared/schema-local';

import { db } from '@/lib/local-db';

/**
 * Reactive star transaction history, newest first (Story 4.3). id tiebreaker
 * keeps same-millisecond awards stable. Called ONLY from the route screen —
 * components with stories never touch `db` (jest/expo-sqlite constraint).
 */
export function useStarActivity() {
  const { data } = useLiveQuery(
    db
      .select()
      .from(starActivityLog)
      .orderBy(desc(starActivityLog.createdAt), desc(starActivityLog.id)),
  );
  return data ?? [];
}
