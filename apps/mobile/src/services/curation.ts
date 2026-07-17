import {
  parseTaskContexts,
  TASK_CONTEXTS,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

function isBrowsable(task: TaskData): boolean {
  return task.status === 'pending' || task.status === 'in_progress';
}

/**
 * Stack filter inputs (Stories 3.1/3.2). Signature is stable from here on —
 * Story 3.3 adds a separate options argument, not more filter fields.
 */
export interface StackFilters {
  /** Story 3.1 multi-select contexts — empty/undefined = all contexts. */
  contexts?: TaskContext[];
  /** Story 3.2 mode — null/undefined = both sizes. */
  size?: TaskSize | null;
}

// Unsized tasks (manual sizing is optional until Epic 6 AI sizing) pass BOTH
// modes — filtering them out would make tasks silently unreachable, violating
// "the app does the worrying". Mode filters *to* a size only among tasks that
// declare one.
function matchesSize(task: TaskData, size: TaskSize | null | undefined): boolean {
  return !size || task.size === size || task.size === null;
}

// Tasks with NO contexts are doable anywhere and always pass.
function matchesContexts(task: TaskData, active: readonly string[] | undefined): boolean {
  if (!active?.length) return true;
  const contexts = parseTaskContexts(task.contexts);
  return contexts.length === 0 || contexts.some((c) => active.includes(c));
}

/**
 * Contexts that have at least one browsable (`pending`/`in_progress`)
 * matching task — used to grey out empty context filter buttons (Story 3.1
 * AC4). A browsable task with NO contexts is doable anywhere (consistent
 * with `curateTasks`), so any untagged browsable task makes all five
 * contexts available. The optional `size` argument (Story 3.2) makes the
 * buttons grey out honestly under the current mode.
 */
export function availableContexts(tasks: TaskData[], size?: TaskSize | null): Set<TaskContext> {
  const available = new Set<TaskContext>();
  for (const task of tasks) {
    if (!isBrowsable(task) || !matchesSize(task, size)) continue;
    const contexts = parseTaskContexts(task.contexts);
    if (contexts.length === 0) {
      return new Set(TASK_CONTEXTS);
    }
    for (const context of contexts) {
      if ((TASK_CONTEXTS as readonly string[]).includes(context)) {
        available.add(context as TaskContext);
      }
    }
  }
  return available;
}

/**
 * Pure curation function — decides which tasks enter the card stack and in
 * what order. Story 3.3 replaces the sort with weighted scoring; the
 * signature stays stable so callers never change.
 *
 * Rules:
 * - `pending` and `in_progress` tasks are browsable (started tasks stay in
 *   the stack showing "Continue" — UX flow 4); completed/cut-loose drop out
 * - context and size filters combine with AND semantics; within contexts,
 *   multi-select is OR (any active context matches)
 * - order: deadline soonest first (no deadline sorts last), then newest
 *   created first
 */
export function curateTasks(tasks: TaskData[], filters?: StackFilters): TaskData[] {
  const matching = tasks.filter(
    (task) =>
      isBrowsable(task) &&
      matchesContexts(task, filters?.contexts) &&
      matchesSize(task, filters?.size),
  );

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
