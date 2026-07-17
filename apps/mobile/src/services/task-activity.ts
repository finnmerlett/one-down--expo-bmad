import type { TaskData } from '@one-down/shared';

import { db } from '@/lib/local-db';
import { incrementSkipCount, resetSkipCount } from '@/services/tasks-repository';

// Behavioral activity signals (Story 6.4, FR39) — fire-and-forget like
// task-edits.ts. Deliberately NO analytics here: a skip is a browse gesture,
// not a domain mutation (the nudge events carry skip_count when it matters).

/** A committed swipe past this card — bump its persistent skip counter. */
export function recordTaskSkipped(task: TaskData): void {
  void incrementSkipCount(db, task.id)
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Skip count bump failed', error));
}

/** Quiet the nudge (answered or dismissed) — the next 5 skips re-earn it. */
export function resetTaskSkips(taskId: string): void {
  void resetSkipCount(db, taskId)
    // oxlint-disable-next-line no-console
    .catch((error: unknown) => console.warn('Skip count reset failed', error));
}
