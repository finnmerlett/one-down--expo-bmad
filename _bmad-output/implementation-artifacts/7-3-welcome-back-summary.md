# Story 7.3: Welcome Back Summary

Status: ready-for-dev
Date: 2026-07-16 (spec written for wave-based full-completion run)

## Story

As a user, I want a gentle welcome-back screen after being away, So that I can re-engage without feeling guilty about missed tasks.

FRs: 50, 51, 52 · UX-DRs: 11

## Acceptance Criteria

1. When the app is opened after `WELCOME_BACK_ABSENCE_DAYS` (default 4, configurable constant in shared config) or more since it was last active, a welcome-back screen appears before the card stack. It shows a **factual** summary: number of tasks waiting, deadlines that passed while away, and how many stale tasks might be worth cutting loose. Tone is supportive and guilt-free.
2. Two CTAs: primary **"Let's see what's up"** (opens triage) and secondary **"Go to main deck"** (straight to the card stack).
3. "Let's see what's up" opens a focused triage view listing only tasks needing attention (passed deadlines, stale, avoided), each with fast decisions: **Keep** / **Cut loose** / **Later**. Empty attention list → "All caught up" state with a CTA to the deck.
4. The first card at the top of the stack after a welcome-back return is an achievable quick win (a `quick_win`-sized task is promoted to the front when one exists; otherwise the stack is unchanged).
5. The screen shows at most once per return (re-foregrounding the app minutes later does not re-trigger it); last-active time is tracked reliably across launches and backgrounding (architecture: false positives would break the calm UX).

## Implementation plan

### Absence tracking (state + hook)

- `apps/mobile/src/stores/app-store.ts` — the persisted Zustand store (created in 3.1 for last-used contexts; zustand `persist` + `@react-native-async-storage/async-storage`, already a dependency). Add:
  - `lastActiveAt: number | null` (epoch ms, persisted) + `setLastActiveAt`.
  - `welcomeBackPending: boolean` (NOT persisted — session flag driving quick-win promotion) + setter.
  - If 3.1 shipped the store without `persist`, wrap it now (partialize to the persisted fields so UI state stays out).
- New `apps/mobile/src/services/welcome-back.ts` (pure, injected clock):
  - `shouldShowWelcomeBack(lastActiveAt: number | null, now: Date): boolean` — null (first launch) → false; `now - lastActiveAt >= WELCOME_BACK_ABSENCE_DAYS` → true.
  - `buildWelcomeBackSummary(tasks: TaskData[], lastActiveAt: number, now: Date)` → `{ daysAway, tasksWaiting, deadlinesPassed, staleSuggestions }`: tasksWaiting = count of `pending` + `in_progress`; deadlinesPassed = active tasks with `lastActiveAt < deadline <= now`; staleSuggestions = active tasks where `evaluateTaskHealth(task, now) === 'stale'` (7.2).
  - `selectAttentionTasks(tasks, lastActiveAt, now)` → array of `{ task, reason: 'deadline_passed' | 'stale' | 'avoided' }` for triage (dedupe: one row per task, deadline_passed > avoided > stale precedence).
  - `promoteQuickWin(curated: TaskData[]): TaskData[]` — moves the first `quick_win` task without a passed deadline to index 0 (falls back to any quick win; no quick win → unchanged). Post-processes curation output so 3.3's algorithm and signature stay untouched.
- New `apps/mobile/src/hooks/use-absence-check.ts` (mounted once in `app/index.tsx`):
  - On mount, after store hydration (gate on zustand persist's hydration flag — do NOT decide on the pre-hydration null), evaluate `shouldShowWelcomeBack`; if true: set `welcomeBackPending`, `router.push('/welcome-back')`. Then stamp `lastActiveAt = now` either way. Once-guard per app launch (module/ref flag).
  - Subscribe to `AppState`: on `background`, stamp `lastActiveAt = now`; on return to `active`, re-evaluate absence (someone can background the app for 4+ days) with the same once-per-return guard.
  - `constants/task-health.ts` (from 7.2) gains `WELCOME_BACK_ABSENCE_DAYS = 4`.

### Screens

- New route `apps/mobile/src/app/welcome-back.tsx` — resolves tasks via `useTasks()`, reads `lastActiveAt`, renders the presentational summary; emits `welcome_back_shown` once on mount. CTAs: "Let's see what's up" → `router.replace('/triage')`; "Go to main deck" → `router.back()` (or `dismissTo` index). Deep-link/dev entry (see Maestro) must also set `welcomeBackPending` on mount so promotion is exercised. Handle a degenerate `daysAway` of 0 gracefully (copy simply omits the days line) — keeps the deep-link seam honest.
- New `apps/mobile/src/components/welcome-back/welcome-back-summary.tsx` (+ stories) — presentational: summary object + two callbacks.
- New route `apps/mobile/src/app/triage.tsx` + `apps/mobile/src/components/triage/triage-list.tsx` (+ stories) — the welcome-back triage (architecture file tree names this route; it is NOT Epic 6.2's review mode). FlatList of attention rows: title, reason chip ("Deadline passed" / "Been a while" / "Skipped a lot"), and three actions:
  - **Keep** → `markTaskEngaged` (7.2) — clears health flags; row leaves the list (deadline_passed rows: Keep just removes the row for this session — the deadline stays, editing it is Epic 6 triage territory).
  - **Cut loose** → 2.4 cut-loose service (star reward + "Released" toast).
  - **Later** → removes the row from this session's list only (local state), no write.
  - Rows removed with a plain state update; when the list empties (or was empty on entry): "All caught up" + "Go to your deck" CTA → back to index. Back navigation always works (no trap).
- `apps/mobile/src/app/index.tsx` — mount `useAbsenceCheck()`; when `welcomeBackPending` is set, render the stack from `promoteQuickWin(curated)` and clear the flag on first stack render with tasks (useEffect keyed on the flag + non-empty curated list). The promotion is one-shot — subsequent re-curations behave normally.

## Analytics (events.ts additions)

- `welcome_back_shown: { days_away: number; tasks_waiting: number; deadlines_passed: number; stale_suggestions: number }`
- `welcome_back_cta_tapped: { cta: 'triage' | 'main_deck' }`
- `triage_task_actioned: { reason: 'deadline_passed' | 'stale' | 'avoided'; action: 'keep' | 'cut_loose' | 'later' }`
Counts and enums only — never task text (NFR-S3). Screen views of the new routes are PostHog built-ins (no manual events).

## Testing plan

- **Unit** (`welcome-back.test.ts` — all pure fns, injected clock):
  - `shouldShowWelcomeBack`: null → false; 3d23h → false; exactly 4d → true.
  - `buildWelcomeBackSummary`: deadline inside/outside the absence window; completed/cut_loose/archived tasks excluded from all counts; stale count delegates to `evaluateTaskHealth`.
  - `selectAttentionTasks`: dedupe + reason precedence.
  - `promoteQuickWin`: promotes; prefers non-overdue quick win; no quick win → identity; already-first → stable.
- **Integration**: none beyond 7.2's (triage actions reuse `markTaskEngaged`/cut-loose, already integration-tested; don't re-test pass-throughs).
- **Stories**: `welcome-back-summary.stories.tsx` (typical, zero-deadlines, singular/plural copy variants); `triage-list.stories.tsx` (populated with all three reasons, empty "All caught up").
- **Maestro** (one flow, `.maestro/NN-story-7-3-welcome-back.yaml`; DRY via `common/launch-app.yaml`). Real 4-day absence can't elapse in E2E, so the flow enters via deep link — the app's scheme is `onedown` (app.json): `openLink: onedown://welcome-back`. Stale/passed-deadline items also can't be fabricated via UI (deadline editing is display-only until Epic 6), so the flow pins the summary counts + CTA wiring + quick-win promotion:
  1. Launch clean → quick-add "Quick one", set its size to Quick win via card back (1.4 size selector); quick-add "Big one" second, set size Big time (created later → naturally on top of the stack).
  2. `openLink` `onedown://welcome-back` → assert factual summary ("2 tasks waiting", no guilt copy) → `takeScreenshot` at the summary.
  3. Tap "Let's see what's up" → triage shows "All caught up" empty state → tap its deck CTA → home.
  4. `openLink` again → tap "Go to main deck" → assert the top card is "Quick one" (full a11y-label assertion, 1.3 convention: 'Task: Quick one. Card 1 of 2') — proves promotion, since "Big one" is newest and would otherwise be on top.
- The absence-detection path itself (AppState stamps, threshold, once-guard) is covered by the unit tests on `shouldShowWelcomeBack` + code review of the hook — accepted E2E gap, noted here deliberately.

## UX notes

- Copy (factual, zero guilt — UX spec journey: "This app isn't mad at me"): headline "Welcome back!"; body lines built from the summary, e.g. "3 tasks are waiting for you." / "1 deadline passed while you were away." / "2 tasks might be worth cutting loose." Omit any zero-count line; never "you haven't…" phrasing. No streaks, no red badges.
- Primary button full-width "Let's see what's up"; secondary/ghost "Go to main deck" beneath (DR: one primary action per screen).
- Triage rows: same visual language as the task list (1.5 rows) with a reason chip; actions as compact buttons, 44pt targets, TalkBack labels like "Keep task" (row context gives the title — avoid embedding title in multiple labels).
- Motion: none required (no-polish v1); screen transitions use the default stack push.

## Dependencies

- **7.2** (hard): `evaluateTaskHealth`, `markTaskEngaged`, avoided/stale data columns, `constants/task-health.ts` — land 7.2 first.
- **2.4** cut-loose service + toast; **1.4/3.2** size selector so quick-win tasks exist; **3.1** persisted app store (extend it; create the persist wrapper here if 3.1 shipped without it); **1.3/3.3** curation (consumed as-is via post-processing).
- Coordination: touches `app/index.tsx` (promotion + hook mount) — schedule after 3.x stories that also modify the home screen to avoid conflicts.

## Out of scope

- Blueprint-style TriageCard stack with AI prompts (Epic 6.2 review mode / UX flow 4) — this triage is a plain fast-decision list.
- Editing/extending deadlines from triage; "defer" that reschedules anything (Later is session-local only).
- Star rewards for triage decisions beyond what cut-loose already awards (triage-confirmation rewards belong to 6.2).
- Notifications about absence (never — anti-goal; 8.1 handles notifications).
- Settings UI for the absence threshold (constant only).
