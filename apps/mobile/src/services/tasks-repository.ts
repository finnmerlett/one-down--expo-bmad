import { eq, inArray, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'expo-crypto';

import {
  AVOIDED_WINDOW_DAYS,
  hasReviewItems,
  parseReviewFlags,
  removeReviewFlag,
  type ParsedTaskDraft,
  type ReviewField,
  type ReviewItem,
  type TaskContext,
  type TaskData,
  type TaskReviewFlags,
  type TaskSize,
  type TaskStatus,
} from '@one-down/shared';
import { subtasks, tasks } from '@one-down/shared/schema-local';

// Repository functions take the db as first argument so integration tests can
// pass the better-sqlite3-backed test db (same schema, real SQL).
export type TasksDb = BaseSQLiteDatabase<'sync' | 'async', unknown, Record<string, unknown>>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CreateTaskInput {
  title: string;
  details?: string;
}

export class EmptyTitleError extends Error {
  constructor() {
    super('Task title is required');
    this.name = 'EmptyTitleError';
  }
}

export async function createTask(db: TasksDb, input: CreateTaskInput): Promise<TaskData> {
  const title = input.title.trim();
  if (!title) {
    throw new EmptyTitleError();
  }
  const details = input.details?.trim();
  // Timestamps come from the schema's $defaultFn (Story 5.3 pre-work); the
  // returned row is the DB-authoritative shape, not a hand-built object.
  const [task] = await db
    .insert(tasks)
    .values({
      // expo-crypto, NOT global crypto.randomUUID() (unreliable under Hermes)
      id: randomUUID(),
      title,
      details: details ? details : null,
    })
    .returning();
  if (!task) {
    throw new Error('Task insert returned no row');
  }
  return task;
}

/**
 * Turn AI brain-dump drafts into local tasks (Story 6.1). Per draft: fields
 * the AI inferred (non-null size, non-empty contexts, non-null deadline) are
 * recorded in `reviewFlags.inferred`; a time-sensitive draft with no concrete
 * date gets `missingDeadline`. `hasCheckNeeded` mirrors "any flags exist" —
 * Story 6.2's review mode consumes both. Empty-title drafts are skipped.
 */
export async function createTasksFromBrainDump(
  db: TasksDb,
  drafts: ParsedTaskDraft[],
): Promise<TaskData[]> {
  const created: TaskData[] = [];
  for (const draft of drafts) {
    const title = draft.title.trim();
    if (!title) continue;

    // Tolerant ISO decode — a malformed deadline degrades to null (and then
    // to a missingDeadline flag when the draft was time-sensitive).
    const parsedDeadline = draft.deadline ? new Date(draft.deadline) : null;
    const deadline =
      parsedDeadline && !Number.isNaN(parsedDeadline.getTime()) ? parsedDeadline : null;

    const inferred: ReviewField[] = [];
    if (draft.size !== null) inferred.push('size');
    if (draft.contexts.length > 0) inferred.push('contexts');
    if (deadline !== null) inferred.push('deadline');
    const flags: TaskReviewFlags = {};
    if (inferred.length > 0) flags.inferred = inferred;
    if (draft.timeSensitive && deadline === null) flags.missingDeadline = true;
    const reviewFlags = hasReviewItems(flags) ? JSON.stringify(flags) : null;

    const [task] = await db
      .insert(tasks)
      .values({
        // expo-crypto, NOT global crypto.randomUUID() (unreliable under Hermes)
        id: randomUUID(),
        title,
        details: normalizeText(draft.details),
        size: draft.size,
        contexts: draft.contexts.length > 0 ? JSON.stringify(draft.contexts) : null,
        deadline,
        reviewFlags,
        hasCheckNeeded: reviewFlags !== null,
      })
      .returning();
    if (task) created.push(task);
  }
  return created;
}

/**
 * Inline-edit patch (card back, Story 1.4). Only the fields present are
 * written. `contexts` comes in as an array and is stored as the JSON-encoded
 * column value (null when empty) — callers never hand-build the JSON.
 */
export interface UpdateTaskPatch {
  title?: string;
  details?: string | null;
  notes?: string | null;
  size?: TaskSize | null;
  contexts?: TaskContext[];
  /** Editable on the card back from Story 6.2 (chips + native picker). */
  deadline?: Date | null;
}

/**
 * What a patch write auto-confirmed (Story 6.2, AC5): editing a flagged
 * field's value clears its review flag — the caller awards/tracks per item.
 * `reviewCleared` marks the write that emptied the LAST flag (per-task
 * `review_completed` analytics).
 */
export interface UpdateTaskResult {
  confirmedItems: ReviewItem[];
  reviewCleared: boolean;
}

/** Normalize free-text fields the same way createTask does: trimmed, '' → null. */
function normalizeText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Status transitions (start/complete/cut-loose, Epic 2) are deliberate domain
 * actions, not inline edits — kept out of UpdateTaskPatch so the card back's
 * generic patch path can never change a task's lifecycle state.
 */
export async function setTaskStatus(db: TasksDb, id: string, status: TaskStatus): Promise<void> {
  // updatedAt is stamped by the schema's $onUpdate (Story 5.3 pre-work).
  await db.update(tasks).set({ status }).where(eq(tasks.id, id));
}

const NO_CONFIRMATIONS: UpdateTaskResult = { confirmedItems: [], reviewCleared: false };

export async function updateTask(
  db: TasksDb,
  id: string,
  patch: UpdateTaskPatch,
): Promise<UpdateTaskResult> {
  // updatedAt is stamped by the schema's $onUpdate (Story 5.3 pre-work).
  const values: Partial<TaskData> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) {
      throw new EmptyTitleError();
    }
    values.title = title;
  }
  if (patch.details !== undefined) {
    values.details = normalizeText(patch.details);
  }
  if (patch.notes !== undefined) {
    values.notes = normalizeText(patch.notes);
  }
  if (patch.size !== undefined) {
    values.size = patch.size;
  }
  if (patch.contexts !== undefined) {
    values.contexts = patch.contexts.length > 0 ? JSON.stringify(patch.contexts) : null;
  }
  if (patch.deadline !== undefined) {
    values.deadline = patch.deadline;
  }
  // Nothing to write → true no-op: don't bump updatedAt (it would mark the
  // row as content-changed and trigger a pointless sync round).
  if (Object.keys(values).length === 0) {
    return NO_CONFIRMATIONS;
  }

  // Every real patch is a meaningful edit (Story 7.2, AC4) — refresh the
  // staleness clock and zero the skip window in the same UPDATE.
  values.lastEngagedAt = new Date();
  values.skipCount = 0;
  values.skipWindowStartedAt = null;

  // Edit-confirm (Story 6.2, AC5): writing a flagged field's value clears its
  // review flag — deadline additionally answers the missing-deadline prompt.
  // Read-modify-write is fine: single-writer local SQLite (matching patterns
  // elsewhere in this file).
  const confirmedItems: ReviewItem[] = [];
  const editedReviewFields = (['size', 'contexts', 'deadline'] as const).filter(
    (field) => patch[field] !== undefined,
  );
  if (editedReviewFields.length > 0) {
    const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
    let flags = row ? parseReviewFlags(row.reviewFlags) : null;
    if (flags) {
      for (const field of editedReviewFields) {
        if (flags?.inferred?.includes(field)) {
          flags = removeReviewFlag(flags, field);
          confirmedItems.push(field);
        }
      }
      if (patch.deadline !== undefined && flags?.missingDeadline) {
        flags = removeReviewFlag(flags, 'missingDeadline');
        confirmedItems.push('missingDeadline');
      }
      if (confirmedItems.length > 0) {
        values.reviewFlags = flags ? JSON.stringify(flags) : null;
        values.hasCheckNeeded = hasReviewItems(flags);
      }
    }
  }

  await db.update(tasks).set(values).where(eq(tasks.id, id));
  return {
    confirmedItems,
    reviewCleared: confirmedItems.length > 0 && values.hasCheckNeeded === false,
  };
}

/**
 * Bulk archive (Story 7.1). Status write only — star retraction and analytics
 * are orchestrated by services/task-archive.ts. updatedAt bumps via $onUpdate
 * (a deliberate content change: archived tasks must sync).
 */
export async function archiveTasks(db: TasksDb, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.update(tasks).set({ status: 'archived' }).where(inArray(tasks.id, ids));
}

/**
 * Restore from the recycle bin (Story 7.1, AC6): back to `pending`, whether
 * the task was archived or cut loose. Stars are deliberately NOT restored
 * (no reverse tracking). Single-task restore is enough for MVP.
 * Restoring counts as engagement (Story 7.2): a task that sat in the bin
 * past STALE_AFTER_DAYS must not re-enter the deck already flagged stale.
 */
export async function restoreTask(db: TasksDb, id: string): Promise<void> {
  await db
    .update(tasks)
    .set({ status: 'pending', lastEngagedAt: new Date(), skipCount: 0, skipWindowStartedAt: null })
    .where(eq(tasks.id, id));
}

/**
 * Permanent delete from the recycle bin (Story 7.1, AC5). Cascades to the
 * task's subtasks (no FK in the schema — Epic 7 owns the cascade decision,
 * resolved: orphan rows are useless once the parent is gone). The star
 * ledger is deliberately KEPT — it is the historical record; `taskId` is
 * nullable there precisely so the log survives task deletion.
 */
export async function deleteTasksPermanently(db: TasksDb, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(subtasks).where(inArray(subtasks.taskId, ids));
  await db.delete(tasks).where(inArray(tasks.id, ids));
}

/**
 * Skip counting (Story 6.4, FR39; windowed since Story 7.2, AC2). Behavioral
 * metadata, NOT content: the explicit `updatedAt = updatedAt` self-assignment
 * defeats the schema's $onUpdate stamp (explicit values win — the 5.3
 * pre-work pin), so a skip can never mark the row content-changed and win a
 * sync conflict. Window rule: no window or an expired one restarts at count
 * 1 with a fresh window start; otherwise the count increments in place.
 * Read-modify-write is fine — single-writer local SQLite (updateTask pattern).
 */
export async function recordTaskSkip(db: TasksDb, id: string, now = new Date()): Promise<void> {
  const [row] = await db
    .select({ skipCount: tasks.skipCount, skipWindowStartedAt: tasks.skipWindowStartedAt })
    .from(tasks)
    .where(eq(tasks.id, id));
  if (!row) return;
  const windowExpired =
    row.skipWindowStartedAt === null ||
    now.getTime() - row.skipWindowStartedAt.getTime() > AVOIDED_WINDOW_DAYS * MS_PER_DAY;
  await db
    .update(tasks)
    .set({
      skipCount: windowExpired ? 1 : row.skipCount + 1,
      skipWindowStartedAt: windowExpired ? now : row.skipWindowStartedAt,
      updatedAt: sql`${tasks.updatedAt}`,
    })
    .where(eq(tasks.id, id));
}

/** Same no-updatedAt-bump contract as recordTaskSkip (6.4 nudge quieting). */
export async function resetSkipCount(db: TasksDb, id: string): Promise<void> {
  await db
    .update(tasks)
    .set({ skipCount: 0, skipWindowStartedAt: null, updatedAt: sql`${tasks.updatedAt}` })
    .where(eq(tasks.id, id));
}

/**
 * Meaningful engagement (Story 7.2, AC4): start, edit, or note change —
 * refreshes the staleness clock and zeroes the skip window. Also the "Keep
 * it" action on the health prompt. A REAL content signal, so updatedAt bumps
 * via $onUpdate (other devices must learn the task was kept).
 */
export async function markTaskEngaged(db: TasksDb, id: string, now = new Date()): Promise<void> {
  await db
    .update(tasks)
    .set({ lastEngagedAt: now, skipCount: 0, skipWindowStartedAt: null })
    .where(eq(tasks.id, id));
}

/**
 * Tick-confirm (Story 6.2, AC4): clear one review flag WITHOUT touching the
 * field's value. Returns what happened so the caller can award/track exactly
 * once — a double tap finds the flag already gone and reports a no-op.
 */
export async function confirmReviewItem(
  db: TasksDb,
  id: string,
  item: ReviewItem,
): Promise<{ confirmed: boolean; reviewCleared: boolean }> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  const flags = row ? parseReviewFlags(row.reviewFlags) : null;
  const flagged =
    flags !== null &&
    (item === 'missingDeadline'
      ? flags.missingDeadline === true
      : (flags.inferred ?? []).includes(item));
  if (!flagged) {
    return { confirmed: false, reviewCleared: false };
  }
  const next = removeReviewFlag(flags, item);
  await db
    .update(tasks)
    .set({ reviewFlags: next ? JSON.stringify(next) : null, hasCheckNeeded: hasReviewItems(next) })
    .where(eq(tasks.id, id));
  return { confirmed: true, reviewCleared: next === null };
}
