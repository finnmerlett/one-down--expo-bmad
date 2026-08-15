/**
 * Where a subtask came from (Story 6.3/6.4): 'ai' = accepted breakdown step,
 * 'micro' = accepted micro-task nudge suggestion, 'manual' = typed by hand
 * in steps edit mode (v1.5 D4).
 */
export const SUBTASK_SOURCES = ['ai', 'micro', 'manual'] as const;
export type SubtaskSource = (typeof SUBTASK_SOURCES)[number];

/**
 * Canonical subtask shape (Story 6.3) — BOTH table definitions must conform
 * exactly (AssertExact, same pattern as TaskData): the `subtasks` sqliteTable
 * in `schema-local` and the pg mirror in `schema` (synced since Story 9.7).
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
  /** Tombstone (Story 9.7): non-null = deleted; reads filter `deletedAt is null`. */
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
