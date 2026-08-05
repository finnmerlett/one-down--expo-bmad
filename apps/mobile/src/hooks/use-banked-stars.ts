import { and, eq, inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import type { TaskSize } from '@one-down/shared';
import { subtasks, tasks } from '@one-down/shared/schema-local';

import { db } from '@/lib/local-db';
import { bankedForCount } from '@/services/star-calculator';

/**
 * Stars banked on still-active tasks (v1.5 spec §2/§3): the hollow-star half
 * of the counter. Size-aware — each completed step banks 1 (quick win) or 2
 * (big time), capped so a card's banked stars never exceed its value. Once a
 * task completes (or is cut loose) its banked stars leave this figure — the
 * conversion folds them into the completion payout.
 *
 * Route-screen-only hook (expo-sqlite can't run under jest — same constraint
 * as useTasks/useStarTotals).
 */
export function useBankedStars(): number {
  const { data } = useLiveQuery(
    db
      .select({ taskId: subtasks.taskId, size: tasks.size })
      .from(subtasks)
      .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
      .where(and(eq(subtasks.completed, true), inArray(tasks.status, ['pending', 'in_progress']))),
  );
  if (!data || data.length === 0) return 0;
  const byTask = new Map<string, { size: TaskSize | null; count: number }>();
  for (const row of data) {
    const entry = byTask.get(row.taskId) ?? { size: row.size, count: 0 };
    entry.count += 1;
    byTask.set(row.taskId, entry);
  }
  let banked = 0;
  for (const entry of byTask.values()) {
    banked += bankedForCount({ size: entry.size }, entry.count);
  }
  return banked;
}
