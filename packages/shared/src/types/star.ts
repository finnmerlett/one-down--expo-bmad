/**
 * Star transaction actions (Story 4.1). Only the first two are emitted today;
 * the rest reserve the union for Epic 6 (subtasks, triage) so rows written
 * later render in the 4.3 activity log without a schema change.
 */
export const STAR_ACTIONS = [
  'task_completed',
  'task_cut_loose',
  'subtask_completed',
  'subtask_deleted',
  'triage_confirmed',
] as const;
export type StarAction = (typeof STAR_ACTIONS)[number];

/**
 * Canonical star transaction shape — the `star_activity_log` sqliteTable in
 * `schema-local` must conform exactly (AssertExact, same pattern as TaskData).
 */
export interface StarActivityData {
  /** Client-generated UUID (expo-crypto randomUUID). */
  id: string;
  /** Nullable so the log survives future task deletion (Epic 7). */
  taskId: string | null;
  /** Title snapshot at award time — display only, never enters analytics (NFR-S3). */
  taskTitle: string;
  action: StarAction;
  /** Signed — negative supported for future reversals. */
  amount: number;
  createdAt: Date;
}
