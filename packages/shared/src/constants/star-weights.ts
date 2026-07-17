/**
 * Centralized star-reward weights (UX-DR 9; architecture: importable by both
 * mobile and server; OTA-tunable via sync in a future version). No magic
 * numbers at call sites — every award amount derives from these.
 *
 * Story 4.1 reconciled the provisional 2.3/2.4 display-only amounts into the
 * real earning pipeline: `completionBase` (+ bonuses) replaced the old flat
 * `taskCompletion`.
 */
export const STAR_WEIGHTS = {
  /** FR43 — base stars for completing any task. */
  completionBase: 10,
  /** FR44 — full bonus for the soonest-deadline active task (rank-based). */
  urgencyBonusMax: 5,
  /** FR45 — extra stars by declared size (unsized earns no size bonus). */
  sizeBonus: { quick_win: 0, big_time: 5 },
  /** FR46 — stars per full day the task is completed before its deadline. */
  earlyBonusPerDay: 1,
  /** FR46 — "up to a limit": cap on the early-completion bonus. */
  earlyBonusMax: 3,
  /** FR66 — deliberately < completionBase (release is rewarded, not equal). */
  cutLoose: 3,
  /** Reserved, Epic 6. */
  subtaskCompleted: 1,
  /** Reserved, Epic 6. */
  triageConfirmed: 1,
} as const;
