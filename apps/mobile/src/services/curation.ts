import { parseTaskContexts, type TaskData } from '@one-down/shared';

/**
 * Pure curation function — decides which tasks enter the card stack and in
 * what order. Story 3.3 replaces the sort with weighted scoring; the
 * signature stays stable so callers never change.
 *
 * Rules:
 * - `pending` and `in_progress` tasks are browsable (started tasks stay in
 *   the stack showing "Continue" — UX flow 4); completed/cut-loose drop out
 * - with active contexts: keep tasks whose contexts overlap the active set;
 *   tasks with NO contexts are doable anywhere and always pass
 * - order: deadline soonest first (no deadline sorts last), then newest
 *   created first
 */
export function curateTasks(tasks: TaskData[], activeContexts?: string[]): TaskData[] {
  const browsable = tasks.filter(
    (task) => task.status === 'pending' || task.status === 'in_progress',
  );

  const matching = activeContexts?.length
    ? browsable.filter((task) => {
        const contexts = parseTaskContexts(task.contexts);
        return contexts.length === 0 || contexts.some((c) => activeContexts.includes(c));
      })
    : browsable;

  return [...matching].sort((a, b) => {
    if (a.deadline && b.deadline) {
      const byDeadline = a.deadline.getTime() - b.deadline.getTime();
      if (byDeadline !== 0) return byDeadline;
    } else if (a.deadline) {
      return -1;
    } else if (b.deadline) {
      return 1;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
