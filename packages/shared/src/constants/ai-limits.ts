/** Gemini model used for all AI parsing calls (server-side only, via tRPC). */
export const GEMINI_MODEL = 'gemini-2.5-flash';

/** Server rejects brain dumps longer than this (BAD_REQUEST); client enforces it too. */
export const MAX_BRAIN_DUMP_CHARS = 2000;

/** Hard cap on tasks extracted from a single brain dump (both providers clamp). */
export const MAX_PARSED_TASKS = 20;
