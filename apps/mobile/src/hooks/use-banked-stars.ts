import { and, eq, inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { subtasks, tasks } from '@one-down/shared/schema-local';

import { db } from '@/lib/local-db';

/**
 * Stars banked on still-active tasks (v1.5 spec §2/§3): the hollow-star half
 * of the counter. Banked = completed steps of pending/in_progress tasks —
 * once a task completes (or is cut loose) its banked stars leave this figure
 * (conversion folds them into the completion payout).
 *
 * D1: one star per completed step. Story D2 makes this size-aware
 * (1 quick win / 2 big time, capped at 5/10 banking steps per task).
 *
 * Route-screen-only hook (expo-sqlite can't run under jest — same constraint
 * as useTasks/useStarTotals).
 */
export function useBankedStars(): number {
  const { data } = useLiveQuery(
    db
      .select({ id: subtasks.id })
      .from(subtasks)
      .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
      .where(and(eq(subtasks.completed, true), inArray(tasks.status, ['pending', 'in_progress']))),
  );
  return data?.length ?? 0;
}
