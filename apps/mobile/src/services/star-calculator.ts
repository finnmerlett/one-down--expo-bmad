import { STAR_WEIGHTS, type TaskData } from '@one-down/shared';

/**
 * Star reward calculator (Story 3.3) — pure, no React. All tuning lives in
 * the shared `STAR_WEIGHTS` constants (centralized, OTA-updatable later).
 *
 * Contract with Story 4.1: it adds `calculateCompletionStars(task,
 * activeTasks, now)` = the `potentialStars` components PLUS the
 * early-completion bonus, reusing `relativeUrgencyBonus` — one formula, so
 * the card-front preview never drifts from the awarded amount.
 */

/**
 * FR44 rank-based urgency bonus: among the deadline-bearing tasks in
 * `[task, ...activeTasks]` (deduped by id; callers pass the active =
 * pending/in_progress set), the soonest deadline earns the full
 * `urgencyBonusMax`, later deadlines a proportionally smaller share.
 * Deadline-free peers don't dilute the pool; a task without a deadline
 * earns 0.
 *
 * Deliberately relative (rank-based), NOT absolute proximity — rewards rank
 * against the user's own backlog. The curation service's `deadlineUrgency`
 * is the absolute-proximity counterpart for ORDERING; do not unify them.
 */
export function relativeUrgencyBonus(task: TaskData, activeTasks: TaskData[]): number {
  if (!task.deadline) return 0;
  const taskDeadline = task.deadline.getTime();

  const seen = new Set<string>([task.id]);
  let poolSize = 1; // deadline-bearing tasks, including this one
  let sooner = 0; // pool members with a strictly earlier deadline
  for (const other of activeTasks) {
    if (seen.has(other.id)) continue;
    seen.add(other.id);
    if (!other.deadline) continue;
    poolSize++;
    if (other.deadline.getTime() < taskDeadline) sooner++;
  }

  return Math.round((STAR_WEIGHTS.urgencyBonusMax * (poolSize - sooner)) / poolSize);
}

/**
 * Star value shown on the card front (FR11): what completing this task is
 * worth. Equals Story 4.1's award MINUS the early-completion bonus (which is
 * unknowable until the moment of completion). `_now` is reserved for
 * signature parity with 4.1's `calculateCompletionStars`.
 */
export function potentialStars(task: TaskData, activeTasks: TaskData[], _now: Date): number {
  return (
    STAR_WEIGHTS.completionBase +
    relativeUrgencyBonus(task, activeTasks) +
    (task.size ? STAR_WEIGHTS.sizeBonus[task.size] : 0)
  );
}
