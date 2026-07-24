import { WELCOME_BACK_ABSENCE_DAYS, type TaskData } from '@one-down/shared';

import { evaluateTaskHealth } from '@/services/task-health';

// Welcome-back / triage logic (Story 7.3, FR50-52) — all pure, injected
// clocks, no I/O. The absence-tracking side effects live in
// hooks/use-absence-check.ts; these functions decide and summarize.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isActive = (task: TaskData): boolean =>
  task.status === 'pending' || task.status === 'in_progress';

/** A deadline that came due while the user was away (lastActiveAt < deadline <= now). */
function deadlinePassedWhileAway(task: TaskData, lastActiveAt: number, now: Date): boolean {
  return (
    task.deadline !== null &&
    task.deadline.getTime() > lastActiveAt &&
    task.deadline.getTime() <= now.getTime()
  );
}

/**
 * AC1/AC5: show the screen when the app was last active
 * WELCOME_BACK_ABSENCE_DAYS or more ago. First launch (null) never greets —
 * there is nothing to come back to.
 */
export function shouldShowWelcomeBack(lastActiveAt: number | null, now: Date): boolean {
  if (lastActiveAt === null) return false;
  return now.getTime() - lastActiveAt >= WELCOME_BACK_ABSENCE_DAYS * MS_PER_DAY;
}

/** Factual, guilt-free numbers for the welcome-back screen (AC1). */
export interface WelcomeBackSummary {
  daysAway: number;
  tasksWaiting: number;
  deadlinesPassed: number;
  staleSuggestions: number;
}

export function buildWelcomeBackSummary(
  tasks: TaskData[],
  lastActiveAt: number,
  now: Date,
): WelcomeBackSummary {
  const active = tasks.filter(isActive);
  return {
    daysAway: Math.max(0, Math.floor((now.getTime() - lastActiveAt) / MS_PER_DAY)),
    tasksWaiting: active.length,
    deadlinesPassed: active.filter((task) => deadlinePassedWhileAway(task, lastActiveAt, now))
      .length,
    staleSuggestions: active.filter((task) => evaluateTaskHealth(task, now) === 'stale').length,
  };
}

export type AttentionReason = 'deadline_passed' | 'stale' | 'avoided';

export interface AttentionRow {
  task: TaskData;
  reason: AttentionReason;
}

/**
 * The triage list (AC3): one row per task needing attention, deduped with
 * reason precedence deadline_passed > avoided > stale (most concrete first).
 */
export function selectAttentionTasks(
  tasks: TaskData[],
  lastActiveAt: number,
  now: Date,
): AttentionRow[] {
  const rows: AttentionRow[] = [];
  for (const task of tasks.filter(isActive)) {
    const health = evaluateTaskHealth(task, now);
    const reason: AttentionReason | null = deadlinePassedWhileAway(task, lastActiveAt, now)
      ? 'deadline_passed'
      : health;
    if (reason) rows.push({ task, reason });
  }
  return rows;
}

/**
 * AC4: the first card after a welcome-back return is an achievable quick win.
 * Post-processes curation output (3.3's algorithm and signature untouched):
 * promotes the first quick win WITHOUT a passed deadline ("achievable" —
 * greeting someone back with an overdue task defeats the calm re-entry),
 * falling back to any quick win; no quick win → unchanged.
 */
export function promoteQuickWin(curated: TaskData[], now: Date): TaskData[] {
  const freshIndex = curated.findIndex(
    (task) =>
      task.size === 'quick_win' && !(task.deadline && task.deadline.getTime() < now.getTime()),
  );
  const index = freshIndex !== -1 ? freshIndex : curated.findIndex((t) => t.size === 'quick_win');
  if (index <= 0) return curated;
  const next = [...curated];
  const [quickWin] = next.splice(index, 1);
  if (quickWin) next.unshift(quickWin);
  return next;
}
