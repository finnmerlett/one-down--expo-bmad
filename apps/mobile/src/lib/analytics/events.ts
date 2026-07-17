// Event taxonomy for custom domain events routed through track().
// Grows story-by-story ("instrument as built" — NFR-L1). Names are
// snake_case past-tense (logging-best-practices skill).
//
// Props MUST be PII-safe by construction: never raw task text — no titles,
// details, or notes (NFR-S3). The before_send sanitizer is the hard backstop,
// but shapes here should never rely on it.
//
// Scope guard (docs/posthog-integration.md): ONLY app-semantic domain events
// belong here. Screen views, taps, lifecycle, identity, and flags use PostHog
// built-ins directly — never add them to this map.
// Props are constrained to FLAT primitive values: no nested objects means no
// place for task content to hide, and PostHog ingests them as plain columns.
export type AnalyticsProperties = Record<string, string | number | boolean | null>;

type EnforceFlatProps<T extends Record<string, AnalyticsProperties>> = T;

export type AnalyticsEventMap = EnforceFlatProps<{
  /** Story 1.2 — a task is saved from the quick-add sheet. */
  task_created: { source: 'quick_add'; has_details: boolean };
  /** Story 1.4 — a field was edited inline on the card back (field NAME only, never the value). */
  task_edited: { field: 'title' | 'details' | 'notes' | 'contexts' | 'size' };
  /** Story 2.1 — first pending → in_progress transition (Continue taps don't re-emit). */
  task_started: { via: 'card_back_overlay' | 'list_detail' };
  /** Story 2.3 — task marked completed (star earning is Epic 4's `stars_awarded`). */
  task_completed: { size: 'quick_win' | 'big_time' | null; had_notes: boolean };
  /** Story 2.4 — task archived guilt-free (recycle bin restore is Epic 7). */
  task_cut_loose: {
    via: 'card_back_overlay' | 'list_detail' | 'task_running';
    was_started: boolean;
  };
  /** Story 8.1 — a notification preference changed (new SETTING value only, never task content). */
  notification_pref_changed: { pref: 'deadline_urgency' | 'challenges'; value: string };
  /** Story 8.1 — the system notification permission request resolved. */
  notification_permission_resolved: { granted: boolean };
  /** Story 8.1 — user tapped a delivered notification (opens home). */
  notification_opened: { type: 'deadline_urgency' | 'challenge' };
  /** Story 8.2a — monetization-funnel entry: a premium sparkle was tapped. */
  premium_sparkle_tapped: { feature: 'ai_breakdown' | 'ai_brain_dump' };
  /** Story 8.2b — purchase flow opened (structural data only, never payment details). */
  purchase_initiated: { product: 'premium_monthly' };
  /** Story 8.2b — entitlement granted. */
  purchase_completed: { product: 'premium_monthly' };
  /** Story 8.2b — user backed out of the billing sheet (NOT a failure). */
  purchase_cancelled: { product: 'premium_monthly' };
  /** Story 8.2b — purchase failed; reason is the provider's coarse bucket. */
  purchase_failed: {
    product: 'premium_monthly';
    reason: 'network' | 'payment_declined' | 'unknown';
  };
  /** Story 8.2b — restore-purchases outcome (restored = an entitlement was found). */
  purchases_restored: { restored: boolean };
}>;

export type AnalyticsEventName = keyof AnalyticsEventMap;
