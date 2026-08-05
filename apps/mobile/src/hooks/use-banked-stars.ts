import { eq, inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

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
 * TWO live queries joined in JS, not one SQL join: drizzle's expo-sqlite
 * useLiveQuery re-fires on changes to the query's PRIMARY table only, so a
 * joined query missed the task status flip at completion time and the banked
 * figure stuck (found on-device, D3). Separate queries subscribe to both
 * tables.
 *
 * Route-screen-only hook (expo-sqlite can't run under jest — same constraint
 * as useTasks/useStarTotals).
 */
export function useBankedStars(): number {
  const { data: completedSteps } = useLiveQuery(
    db.select({ taskId: subtasks.taskId }).from(subtasks).where(eq(subtasks.completed, true)),
  );
  const { data: activeTasks } = useLiveQuery(
    db
      .select({ id: tasks.id, size: tasks.size })
      .from(tasks)
      .where(inArray(tasks.status, ['pending', 'in_progress'])),
  );

  return useMemo(() => {
    if (!completedSteps?.length || !activeTasks?.length) return 0;
    const sizeById = new Map<string, TaskSize | null>(
      activeTasks.map((task) => [task.id, task.size]),
    );
    const countByTask = new Map<string, number>();
    for (const step of completedSteps) {
      if (!sizeById.has(step.taskId)) continue;
      countByTask.set(step.taskId, (countByTask.get(step.taskId) ?? 0) + 1);
    }
    let banked = 0;
    for (const [taskId, count] of countByTask) {
      banked += bankedForCount({ size: sizeById.get(taskId) ?? null }, count);
    }
    return banked;
  }, [completedSteps, activeTasks]);
}
