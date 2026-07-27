import type { TaskContext, TaskSize } from '@one-down/shared';

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
  task_edited: { field: 'title' | 'details' | 'notes' | 'contexts' | 'size' | 'deadline' };
  /** Story 2.1 — first pending → in_progress transition (Continue taps don't re-emit). */
  task_started: { via: 'card_back_overlay' | 'list_detail' | 'task_running' };
  /** Story 2.3 — task marked completed (star earning is Epic 4's `stars_awarded`). */
  task_completed: { size: 'quick_win' | 'big_time' | null; had_notes: boolean };
  /** Story 2.4 — task archived guilt-free (7.3 adds the triage surface). */
  task_cut_loose: {
    via: 'card_back_overlay' | 'list_detail' | 'task_running' | 'triage';
    was_started: boolean;
  };
  /** Story 3.1 — a context filter button toggled on the home screen (enum names only). */
  context_toggled: { context: TaskContext; now_active: boolean; active_count: number };
  /** Story 3.2 — the mode segmented control toggled (`now_active: false` = re-press deactivated it). */
  mode_toggled: { mode: TaskSize; now_active: boolean };
  /** Story 3.4 — all filters reset atomically (a semantic mutation, not individual toggles). */
  stack_filters_cleared: { via: 'empty_state' };
  /** Story 4.1 — a star transaction was recorded (amounts only, never task text). */
  stars_awarded: {
    action:
      | 'task_completed'
      | 'task_cut_loose'
      | 'triage_confirmed'
      | 'subtask_completed'
      | 'subtask_deleted'
      | 'archive_retraction'
      | 'completion_undone';
    amount: number;
    base: number;
    urgency_bonus: number;
    size_bonus: number;
    early_bonus: number; // all zero except amount/base for cut_loose
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
  /** Story 5.2 — account created (success only; never the email, NFR-S3). */
  auth_signed_up: { method: 'email' };
  /** Story 5.2 — signed in (success only). */
  auth_signed_in: { method: 'email' };
  /** Story 5.2 — signed out (success only). */
  auth_signed_out: Record<string, never>;
  /** Story 5.3 — one sync round finished (counts and timings only, NFR-S3). */
  sync_completed: {
    pushed: number;
    pulled: number;
    duration_ms: number;
    trigger: 'local_change' | 'reconnect' | 'foreground' | 'sign_in';
  };
  /** Story 5.3 — a sync round failed; the next trigger retries. */
  sync_failed: {
    reason: 'network' | 'server' | 'unknown';
    trigger: 'local_change' | 'reconnect' | 'foreground' | 'sign_in';
  };
  /** Story 6.1 — a brain dump was sent for parsing (length only, never the text — NFR-S3). */
  brain_dump_submitted: { char_count: number };
  /** Story 6.1 — parse succeeded and local tasks were created. */
  brain_dump_parsed: {
    task_count: number;
    flagged_count: number;
    duration_ms: number;
    provider: 'gemini' | 'fake';
  };
  /** Story 6.1 — parse failed; the inline error offers retry / quick add. */
  brain_dump_failed: { reason: 'network' | 'server_error' };
  /** Story 6.2 — the info icon was tapped and the stack filtered to flagged cards. */
  review_mode_entered: { card_count: number };
  /** Story 6.2 — one review item confirmed (tick or edit-confirm; field name only). */
  review_item_confirmed: {
    field: 'size' | 'contexts' | 'deadline' | 'missing_deadline';
    via: 'tick' | 'edit';
  };
  /** Story 6.2 — a confirmation emptied a task's flags (per task, not per session). */
  review_completed: Record<string, never>;
  /** Story 6.3 — a breakdown was requested (surface + depth only, never task text). */
  breakdown_requested: { via: 'task_running' | 'card_back'; mode: 'first_steps' | 'full' };
  /** Story 6.3 — the server returned a proposal. */
  breakdown_generated: {
    step_count: number;
    mode: 'first_steps' | 'full';
    duration_ms: number;
    provider: 'gemini' | 'fake';
  };
  /** Story 6.3 — the breakdown request failed; inline retry offered. */
  breakdown_failed: { reason: 'network' | 'server_error' };
  /** Story 6.3 — proposal accepted and saved as subtasks (6.4 adds the refine leg). */
  breakdown_accepted: {
    step_count: number;
    mode: 'first_steps' | 'full';
    via: 'initial' | 'refine';
  };
  /** Story 6.3 — proposal rejected ("Not helpful"); nothing saved. */
  breakdown_rejected: { step_count: number; via: 'initial' | 'refine' };
  /** Story 6.3 — a subtask was ticked (or unticked — `reversed: true`). */
  subtask_completed: { source: 'ai' | 'micro'; reversed: boolean };
  /** Story 6.3 — a subtask row was deleted. */
  subtask_deleted: { was_completed: boolean };
  /** Story 6.4 — refine feedback sent (length only, never the text — NFR-S3). */
  breakdown_feedback_submitted: { char_count: number };
  /** Story 6.4 — the refined proposal arrived (counts and flags only). */
  breakdown_refined: {
    step_count: number;
    kept_completed_count: number;
    has_distillation: boolean;
    duration_ms: number;
    provider: 'gemini' | 'fake';
  };
  /** Story 6.4 — the micro-task proposal was shown (FR39 nudge). */
  micro_task_suggested: { skip_count: number };
  /** Story 6.4 — the micro step was saved as a subtask; skip counter reset. */
  micro_task_added: { skip_count: number };
  /** Story 6.4 — "No thanks"; quiet for another threshold's worth of skips. */
  micro_task_dismissed: { skip_count: number };
  /** Story 7.1 — a bulk archive landed (`warned` = the star warning dialog was confirmed). */
  tasks_archived: { count: number; stars_removed: number; warned: boolean };
  /** Story 7.1 — permanent delete from the recycle bin. */
  tasks_deleted_permanently: { count: number };
  /** Story 7.1 — a task returned to the active list. */
  task_restored: { from: 'recycle_bin' };
  /** Undo-complete (2026-07-27) — Done row or reward-toast Undo; completion stars retracted. */
  task_completion_undone: { stars_removed: number };
  /** Undo cut-loose (2026-07-27) — reward-toast Undo; the release award row is removed. */
  task_cut_loose_undone: { stars_removed: number };
  /** OTA update banner (2026-07-27) — a downloaded update is ready to apply. */
  update_prompt_shown: { surface: 'home' };
  /** OTA update banner — user restarted into the update or dismissed it. */
  update_prompt_actioned: { action: 'restart' | 'dismiss' };
  /** Story 7.2 — a flagged task's card back opened (once per open, ref-guarded). */
  task_health_prompt_shown: { flag: 'stale' | 'avoided' };
  /** Story 7.2 — a prompt option was chosen (flag + action enums only). */
  task_health_prompt_actioned: {
    flag: 'stale' | 'avoided';
    action: 'keep' | 'cut_loose' | 'break_down';
  };
  /** Story 7.3 — the welcome-back screen appeared (counts only, never task text). */
  welcome_back_shown: {
    days_away: number;
    tasks_waiting: number;
    deadlines_passed: number;
    stale_suggestions: number;
  };
  /** Story 7.3 — which door the user took off the welcome-back screen. */
  welcome_back_cta_tapped: { cta: 'triage' | 'main_deck' };
  /** Story 7.3 — a fast decision on a triage row ("later" is session-local only). */
  triage_task_actioned: {
    reason: 'deadline_passed' | 'stale' | 'avoided';
    action: 'keep' | 'cut_loose' | 'later';
  };
}>;

export type AnalyticsEventName = keyof AnalyticsEventMap;
