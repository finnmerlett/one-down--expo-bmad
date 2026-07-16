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
} as const;
