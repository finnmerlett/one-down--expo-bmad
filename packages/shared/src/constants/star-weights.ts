/**
 * Centralized star-reward weights (architecture: importable by both mobile
 * and server; OTA-tunable via sync in a future version).
 *
 * Values are provisional defaults — Epic 4 (Story 4.1) adds urgency/size/
 * deadline bonus weights and the real earning pipeline. Until then these are
 * display-only amounts shown in reward toasts (Stories 2.3/2.4).
 */
export const STAR_WEIGHTS = {
  taskCompletion: 5,
  /** Story 2.4 — must stay strictly less than taskCompletion. */
  cutLoose: 2,
  /** Epic 6. */
  subtaskCompletion: 1,
  /** Epic 6. */
  triageConfirmation: 1,
  // --- Story 3.3 / Epic 4 completion-award components (FR11/FR44). Used by
  // the card-front star preview now; Story 4.1 reuses the SAME keys for the
  // real award pipeline (one formula, no preview/award drift) and reconciles
  // the taskCompletion duplication when it rewires the reward toast.
  /** Base stars for completing any task. */
  completionBase: 10,
  /** Full bonus for the soonest-deadline active task (FR44, rank-based). */
  urgencyBonusMax: 5,
  /** Extra stars by declared size (unsized earns no size bonus). */
  sizeBonus: { quick_win: 0, big_time: 5 },
} as const;
