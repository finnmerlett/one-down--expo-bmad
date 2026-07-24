/**
 * Task-health detection dials (Story 7.2, FR32/33) — the single place to
 * tune stale/avoided thresholds during dogfooding. Deliberately separate
 * from MICRO_TASK_SKIP_THRESHOLD (ai-limits.ts): the 6.4 nudge and the 7.2
 * avoidance flag are independent interventions with independent dials.
 */

/** Days with no meaningful action (start/edit/note) before a pending task flags stale. */
export const STALE_AFTER_DAYS = 7;

/** Swipe-pasts within the window before a pending task flags avoided. */
export const AVOIDED_SKIP_THRESHOLD = 5;

/** Rolling window for avoidance skips — older skips stop counting. */
export const AVOIDED_WINDOW_DAYS = 7;
