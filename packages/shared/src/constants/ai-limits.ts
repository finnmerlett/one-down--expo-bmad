/**
 * Gemini model used for all AI parsing calls (server-side only, via tRPC).
 * gemini-2.5-flash is retired for new API projects (404 "no longer available
 * to new users", 2026-07) — pin the newest GA flash instead.
 */
export const GEMINI_MODEL = 'gemini-3.6-flash';

/** Server rejects brain dumps longer than this (BAD_REQUEST); client enforces it too. */
export const MAX_BRAIN_DUMP_CHARS = 2000;

/** Hard cap on tasks extracted from a single brain dump (both providers clamp). */
export const MAX_PARSED_TASKS = 20;

/**
 * Breakdown request title cap (Story 6.3). The server TRUNCATES over-length
 * titles instead of rejecting — task fields are unbounded on mobile, and a
 * BAD_REQUEST would permanently break "Help me with this" for that task.
 * The client should clamp to this too (payload hygiene).
 */
export const MAX_BREAKDOWN_TITLE_CHARS = 200;

/**
 * Breakdown request details/notes cap (Story 6.3). Same rule as the title:
 * server truncates (never rejects) — these are prompt context only.
 */
export const MAX_BREAKDOWN_CONTEXT_CHARS = 2000;

/** Hard cap on steps in a single task breakdown (Story 6.3 — server clamps). */
export const MAX_BREAKDOWN_STEPS = 10;

/** Breakdown steps longer than this are truncated server-side. */
export const MAX_BREAKDOWN_STEP_CHARS = 140;

/**
 * Refine feedback cap (Story 6.4). Unlike task fields, feedback comes from a
 * BOUNDED input the client owns — over-length is REJECTED (BAD_REQUEST), and
 * the client should enforce this as the input maxLength.
 */
export const MAX_REFINE_FEEDBACK_CHARS = 500;

/** Hard cap on the current-subtasks array sent to `ai.refineBreakdown`. */
export const MAX_REFINE_SUBTASKS = 20;

/** Notes distillations longer than this are truncated server-side (Story 6.4). */
export const MAX_NOTES_DISTILLATION_CHARS = 200;

/** General-learning lines longer than this are truncated server-side (9-5 item 4). */
export const MAX_GENERAL_LEARNING_CHARS = 200;

/** The user's editable general AI notes are clamped to this length locally
 *  (9-5 item 4) — oldest bullets fall off first when a learning lands. */
export const MAX_AI_GENERAL_NOTES_CHARS = 2000;

/**
 * Swipes-past before the micro-task nudge appears (Story 6.4, FR39). Starting
 * the task or answering the nudge resets the count. Epic 7 avoidance
 * detection should REUSE `skipCount` + this constant (planning: "avoided" =
 * 5 skips) rather than invent a parallel signal.
 *
 * OWNERSHIP: the persisted `skipCount` field itself (TaskData + schema-local
 * tasks + pg schema tasks + drizzle migrations on both sides) is NOT added by
 * the server half — it lands with the MOBILE half of Story 6.4, which owns
 * the client migration chain. This constant is shared here so both halves
 * agree on the threshold.
 */
export const MICRO_TASK_SKIP_THRESHOLD = 5;
