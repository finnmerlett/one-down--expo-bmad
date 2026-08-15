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
  // Story 7.1 — negative row retracting a task's net stars at archive time.
  'archive_retraction',
  // Undo-complete (2026-07-27) — negative row returning a completion's award
  // when the task is flipped back to To do from the Done list.
  'completion_undone',
  // Undo cut-loose (Story 9.7 convention pass) — negative row returning the
  // release award; same compensating-entry pattern as completion_undone.
  'cut_loose_undone',
] as const;
export type StarAction = (typeof STAR_ACTIONS)[number];

/**
 * Canonical star transaction shape — BOTH table definitions must conform
 * exactly (AssertExact, same pattern as TaskData): the `star_activity_log`
 * sqliteTable in `schema-local` and the pg mirror in `schema` (synced since
 * Story 9.7).
 *
 * IMMUTABLE by convention (9.7 convention pass): rows are never edited or
 * deleted; every correction is a new compensating (negative) row. That makes
 * the ledger an insert-only sync entity — conflicts are impossible — and the
 * "undo leaves no trace" UX lives in the DISPLAY layer (same-local-day
 * do/undo pairs collapse; cross-day pairs stay visible as honest history).
 */
export interface StarActivityData {
  /** Client-generated UUID (expo-crypto randomUUID). */
  id: string;
  /** Nullable so the log survives future task deletion (Epic 7). */
  taskId: string | null;
  /** Title snapshot at award time — display only, never enters analytics (NFR-S3). */
  taskTitle: string;
  action: StarAction;
  /** Signed — negative for reversals (compensating entries). */
  amount: number;
  createdAt: Date;
}
