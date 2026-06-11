export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cut_loose'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_SIZES = ['quick_win', 'big_time'] as const;
export type TaskSize = (typeof TASK_SIZES)[number];

export const TASK_CONTEXTS = ['home', 'out_and_about', 'phone', 'laptop', 'internet'] as const;
export type TaskContext = (typeof TASK_CONTEXTS)[number];

/**
 * Canonical task shape — the source of truth BOTH table definitions must
 * conform to: `schema-local` (sqliteTable, mobile) and `schema` (pgTable,
 * server, Epic 5). Same shape, no subset: the server copy is a 1:1 backup
 * of local data (plus userId on the server side).
 */
export interface TaskData {
  /** Client-generated UUID (expo-crypto randomUUID) — permanent, never reassigned. */
  id: string;
  title: string;
  details: string | null;
  status: TaskStatus;
  size: TaskSize | null;
  /** JSON-encoded array of TaskContext values, e.g. '["home","phone"]'. */
  contexts: string | null;
  deadline: Date | null;
  hasCheckNeeded: boolean;
  createdAt: Date;
  updatedAt: Date;
}
