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

/** Story 3.3 scoring inputs — defaults: `new Date()`, seed 0. */
export interface CurationOptions {
  now?: Date;
  seed?: number;
}

// --- Dogfooding dials (Story 3.3) — the curation algorithm is an initial
// best-guess, refined via dogfooding. Tune ONLY here.
export const URGENCY_HORIZON_DAYS = 14;
export const URGENT_WINDOW_HOURS = 48;
export const WEIGHT_URGENCY = 0.55;
export const WEIGHT_IMPORTANCE = 0.2;
export const WEIGHT_JITTER = 0.25;
export const SIZE_IMPORTANCE: Record<TaskSize | 'unsized', number> = {
  big_time: 1,
  quick_win: 0.35,
  unsized: 0.5,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Absolute deadline proximity in [0,1]: 0 without a deadline (or beyond the
 * horizon), 1 when due/overdue. Deliberately separate from star-calculator's
 * rank-based `relativeUrgencyBonus`: ORDERING uses absolute proximity,
 * REWARDS use relative rank against the backlog (FR44) — do not unify them.
 */
export function deadlineUrgency(deadline: Date | null, now: Date): number {
  if (!deadline) return 0;
  const daysUntil = (deadline.getTime() - now.getTime()) / MS_PER_DAY;
  return clamp01(1 - daysUntil / URGENCY_HORIZON_DAYS);
}

// Controlled randomness (FNV-1a over `${seed}:${id}`, mapped to [0,1)):
// a pure function of (seed, task.id), so the same seed always produces the
// same order, and adding/removing a task never re-jitters the others (no
// reshuffle under the user's fingers mid-browse). No Math.random anywhere.
function jitter(seed: number, id: string): number {
  let hash = 0x811c9dc5;
  const input = `${seed}:${id}`;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 4294967296;
}

function sizeKey(task: TaskData): TaskSize | 'unsized' {
  return task.size ?? 'unsized';
}

// Variety pass: greedy rebuild — when the last two emitted cards share a
// size and a differently-sized task remains, emit the nearest different-size
// task next (never 3 consecutive same-size cards while variety is possible).
function varietyPass(ordered: TaskData[]): TaskData[] {
  const remaining = [...ordered];
  const result: TaskData[] = [];
  while (remaining.length > 0) {
    let pickIndex = 0;
    const last = result[result.length - 1];
    const beforeLast = result[result.length - 2];
    if (last && beforeLast && sizeKey(last) === sizeKey(beforeLast)) {
      const runSize = sizeKey(last);
      const differentIndex = remaining.findIndex((task) => sizeKey(task) !== runSize);
      if (differentIndex !== -1) pickIndex = differentIndex;
    }
    const [picked] = remaining.splice(pickIndex, 1);
    if (picked) result.push(picked);
  }
  return result;
}

/**
 * Contexts of browsable tasks with a deadline within `URGENT_WINDOW_HOURS`
 * or overdue (FR15) — drives the context bar's urgent-indicator dots.
 */
export function urgentContexts(tasks: TaskData[], now: Date): Set<TaskContext> {
  const urgent = new Set<TaskContext>();
  const windowMs = URGENT_WINDOW_HOURS * 60 * 60 * 1000;
  for (const task of tasks) {
    if (!isBrowsable(task) || !task.deadline) continue;
    if (task.deadline.getTime() - now.getTime() > windowMs) continue;
    for (const context of parseTaskContexts(task.contexts)) {
      if ((TASK_CONTEXTS as readonly string[]).includes(context)) {
        urgent.add(context as TaskContext);
      }
    }
  }
  return urgent;
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
 * what order (Story 3.3 weighted scoring — purposeful, momentum-building,
 * never a strict deadline sort).
 *
 * Rules:
 * - `pending` and `in_progress` tasks are browsable (started tasks stay in
 *   the stack showing "Continue" — UX flow 4); completed/cut-loose drop out
 * - context and size filters combine with AND semantics; within contexts,
 *   multi-select is OR (any active context matches)
 * - score = urgency + size importance + controlled per-task jitter; fully
 *   deterministic for a given (now, seed)
 * - momentum: if any quick win passes the filters, the TOP card is the
 *   highest-scoring quick win (7.3 reuses this: first card after an absence
 *   is a quick win)
 * - variety: never 3 consecutive same-size cards while a differently-sized
 *   task remains
 */
export function curateTasks(
  tasks: TaskData[],
  filters?: StackFilters,
  options?: CurationOptions,
): TaskData[] {
  const now = options?.now ?? new Date();
  const seed = options?.seed ?? 0;

  const matching = tasks.filter(
    (task) =>
      isBrowsable(task) &&
      matchesContexts(task, filters?.contexts) &&
      matchesSize(task, filters?.size),
  );

  const ordered = matching
    .map((task) => ({
      task,
      score:
        WEIGHT_URGENCY * deadlineUrgency(task.deadline, now) +
        WEIGHT_IMPORTANCE * SIZE_IMPORTANCE[sizeKey(task)] +
        WEIGHT_JITTER * jitter(seed, task.id),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.task.createdAt.getTime() - a.task.createdAt.getTime() ||
        (a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0),
    )
    .map((entry) => entry.task);

  // Momentum pass: surface the best quick win as the top card.
  const firstQuickWin = ordered.findIndex((task) => task.size === 'quick_win');
  if (firstQuickWin > 0) {
    const [quickWin] = ordered.splice(firstQuickWin, 1);
    if (quickWin) ordered.unshift(quickWin);
  }

  return varietyPass(ordered);
}
