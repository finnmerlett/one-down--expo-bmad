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
/**
 * Decode the JSON-encoded `contexts` column. Tolerant of nulls and malformed
 * values (returns []) — the column is free-form text at the SQLite level.
 */
export function parseTaskContexts(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export interface TaskData {
  /** Client-generated UUID (expo-crypto randomUUID) — permanent, never reassigned. */
  id: string;
  title: string;
  details: string | null;
  /** Free-form working notes, editable on the card back and while running a task. */
  notes: string | null;
  status: TaskStatus;
  size: TaskSize | null;
  /** JSON-encoded array of TaskContext values, e.g. '["home","phone"]'. */
  contexts: string | null;
  deadline: Date | null;
  hasCheckNeeded: boolean;
  /** JSON-encoded TaskReviewFlags (Story 6.1) — null when nothing needs review. */
  reviewFlags: string | null;
  /**
   * Swipes past this card since it was last started/nudged (Story 6.4, FR39).
   * Behavioral metadata: increments deliberately do NOT bump `updatedAt`, so
   * skip counting can never win a 5.3 last-content-changed sync conflict.
   * Epic 7 avoidance detection reuses this + MICRO_TASK_SKIP_THRESHOLD.
   */
  skipCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Task fields the AI can infer from a brain dump (each inference needs review — Story 6.2). */
export const REVIEW_FIELDS = ['size', 'contexts', 'deadline'] as const;
export type ReviewField = (typeof REVIEW_FIELDS)[number];

/**
 * Decoded shape of the `reviewFlags` column (Story 6.1): which fields the AI
 * inferred, plus whether a time-sensitive task is missing a concrete deadline.
 * Story 6.2's review mode consumes and clears these.
 */
export interface TaskReviewFlags {
  inferred?: ReviewField[];
  missingDeadline?: boolean;
}

/**
 * Decode the JSON-encoded `reviewFlags` column. Tolerant like
 * parseTaskContexts: malformed values, unknown keys/fields, and empty flag
 * sets all normalize to null (= nothing to review).
 */
export function parseReviewFlags(value: string | null): TaskReviewFlags | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const inferred = Array.isArray(record.inferred)
      ? record.inferred.filter((item): item is ReviewField =>
          (REVIEW_FIELDS as readonly unknown[]).includes(item),
        )
      : [];
    const flags: TaskReviewFlags = {};
    if (inferred.length > 0) flags.inferred = inferred;
    if (record.missingDeadline === true) flags.missingDeadline = true;
    return hasReviewItems(flags) ? flags : null;
  } catch {
    return null;
  }
}

/** True when at least one review item remains (drives `hasCheckNeeded`). */
export function hasReviewItems(flags: TaskReviewFlags | null): boolean {
  return flags !== null && ((flags.inferred?.length ?? 0) > 0 || flags.missingDeadline === true);
}

/** One confirmable review item (Story 6.2): an inferred field or the missing-deadline prompt. */
export type ReviewItem = ReviewField | 'missingDeadline';

/**
 * Remove one confirmed review item (Story 6.2). Pure — returns the next flag
 * set, or null when the last item was cleared (the caller flips
 * `hasCheckNeeded` off that null).
 */
export function removeReviewFlag(
  flags: TaskReviewFlags | null,
  item: ReviewItem,
): TaskReviewFlags | null {
  if (flags === null) return null;
  const next: TaskReviewFlags = {};
  const inferred = (flags.inferred ?? []).filter((field) => field !== item);
  if (inferred.length > 0) next.inferred = inferred;
  if (flags.missingDeadline === true && item !== 'missingDeadline') next.missingDeadline = true;
  return hasReviewItems(next) ? next : null;
}
