/**
 * Where a subtask came from (Story 6.3/6.4): 'ai' = accepted breakdown step,
 * 'micro' = accepted micro-task nudge suggestion, 'manual' = typed by hand
 * in steps edit mode (v1.5 D4).
 */
export const SUBTASK_SOURCES = ['ai', 'micro', 'manual'] as const;
export type SubtaskSource = (typeof SUBTASK_SOURCES)[number];

/**
 * Canonical subtask shape (Story 6.3) — the `subtasks` sqliteTable in
 * `schema-local` must conform exactly (AssertExact, same pattern as
 * TaskData). Local-only for now: Postgres mirroring/sync is a flagged
 * follow-up, deliberately out of Epic 6's scope.
 */
export interface SubtaskData {
  /** Client-generated UUID (expo-crypto randomUUID). */
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  /** Display order within the task — appended after the highest existing index. */
  orderIndex: number;
  source: SubtaskSource;
  createdAt: Date;
  updatedAt: Date;
}
