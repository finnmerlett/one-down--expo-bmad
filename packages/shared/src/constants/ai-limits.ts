/** Gemini model used for all AI parsing calls (server-side only, via tRPC). */
export const GEMINI_MODEL = 'gemini-2.5-flash';

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
