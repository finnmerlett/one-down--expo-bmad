import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'expo-crypto';

import {
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
import { tasks } from '@one-down/shared/schema-local';

// Repository functions take the db as first argument so integration tests can
// pass the better-sqlite3-backed test db (same schema, real SQL).
export type TasksDb = BaseSQLiteDatabase<'sync' | 'async', unknown, Record<string, unknown>>;

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
