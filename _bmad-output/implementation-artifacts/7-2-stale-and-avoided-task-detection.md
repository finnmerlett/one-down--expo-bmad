# Story 7.2: Stale & Avoided Task Detection

Status: ready-for-dev
Date: 2026-07-16 (spec written for wave-based full-completion run)

## Story

As a user, I want the app to flag tasks I've been avoiding or neglecting, So that I can decide whether to keep, cut loose, or break them down.

FRs: 32, 33

## Acceptance Criteria

1. A task with no meaningful action (no start, no edit, no note change) for `STALE_AFTER_DAYS` (default 7) is flagged **stale**. The clock starts at creation.
2. A task swiped past `AVOIDED_SKIP_THRESHOLD` (default 5) or more times within `AVOIDED_WINDOW_DAYS` (default 7) is flagged **avoided**. Skips older than the window don't count (window resets when a new skip arrives after expiry).
3. Thresholds live as configurable constants in shared config (`packages/shared/src/constants/task-health.ts`) — single place to tune during dogfooding.
4. The skip count resets to zero when the user takes a meaningful action on the task: start, edit (any card-back field), or note change. Meaningful actions also refresh the staleness clock.
5. When the user encounters a flagged task (opens its card back — home overlay or list detail), a gentle prompt offers three options: **Keep it** (clears the flag by registering engagement), **Cut loose** (existing 2.4 action), **Break it down** (starts the task and opens the running screen, where Epic 6.3's "Help me with this" lives).
6. The card front shows a small, non-alarming indicator on flagged tasks so the prompt isn't a surprise.
7. Choosing "Keep it" clears the flag immediately (indicator and prompt disappear); the flag can re-trigger later if neglect/avoidance recurs.

## Implementation plan

### Data model (drizzle-kit migration required)

Add three columns to the canonical task shape — update **all three in lockstep** (the `AssertExact` check in `schema-local/tasks.ts` enforces this):

- `packages/shared/src/types/task.ts` — `TaskData` gains:
  - `lastEngagedAt: Date` — last meaningful action (start/edit/note); initialized to `createdAt`.
  - `skipCount: number` — swipe-pasts in the current window.
  - `skipWindowStartedAt: Date | null` — when the current skip window opened (null = no active window).
- `packages/shared/src/schema-local/tasks.ts` — `last_engaged_at` (`timestamp_ms`, notNull), `skip_count` (integer, notNull, default 0), `skip_window_started_at` (`timestamp_ms`, nullable).
- `packages/shared/src/schema/` (server pgTable, exists since Epic 5) — same columns; regenerate the server migration and extend the 5.3 sync field list so these columns round-trip (they're part of the 1:1 backup contract).
- Generate mobile migration: `drizzle-kit generate` in `apps/mobile` → new `apps/mobile/drizzle/0002_*.sql` (or next number). Backfill in the migration SQL: `last_engaged_at = updated_at` for existing rows (best available proxy). Integration tests pick the SQL up automatically via `loadLocalMigrationsSql`.
- **Why a dedicated `lastEngagedAt` instead of `updatedAt`:** skip-count writes and mechanical status writes bump `updatedAt` (especially with 5.3's `$onUpdate` schema-managed timestamps) — using it for staleness would let *avoiding* a task keep it "fresh". `lastEngagedAt` is bumped only by the three meaningful actions in AC4. Trustworthy timestamps from the 5.3 pre-work remain load-bearing for sync, not for health.
- Sync note for the 5.3-owning wave: `recordTaskSkip` writes will auto-bump `updatedAt` under `$onUpdate` and thus participate in last-content-changed-wins. Accepted for MVP (single-device reality); do NOT hand-suppress it.

### Constants

- New `packages/shared/src/constants/task-health.ts` (+ re-export from `constants/index.ts`):
  `STALE_AFTER_DAYS = 7`, `AVOIDED_SKIP_THRESHOLD = 5`, `AVOIDED_WINDOW_DAYS = 7`. (Story 7.3 adds `WELCOME_BACK_ABSENCE_DAYS` here.)

### Detection (pure) + repository

- New `apps/mobile/src/services/task-health.ts`:
  - `evaluateTaskHealth(task: TaskData, now: Date): 'avoided' | 'stale' | null` — pure, injected clock. Only `pending` tasks are flaggable (`in_progress` means the user IS engaging; completed/cut_loose/archived never flag). Avoided takes precedence over stale when both apply (it's the more specific signal). Avoided requires `skipWindowStartedAt` within the window AND `skipCount >= threshold`; stale requires `now - lastEngagedAt >= STALE_AFTER_DAYS`.
- `apps/mobile/src/services/tasks-repository.ts` — add:
  - `recordTaskSkip(db, task: TaskData, now: Date)` — if no window or window expired (`now - skipWindowStartedAt > AVOIDED_WINDOW_DAYS`): set `skipCount = 1`, `skipWindowStartedAt = now`; else increment `skipCount`. Never touches `lastEngagedAt`.
  - `markTaskEngaged(db, id, now)` — sets `lastEngagedAt = now`, `skipCount = 0`, `skipWindowStartedAt = null`.
  - Fold engagement into existing writes rather than double-writing: `updateTask` additionally sets the three engagement fields on every patch (all patches are meaningful edits per AC4 — title/details/notes/size/contexts), and `startTask` in `services/task-edits.ts` marks engagement alongside the `pending → in_progress` transition (one UPDATE).

### Skip recording (card stack)

- `apps/mobile/src/components/card-stack/card-stack.tsx` — add optional `onSwipedPast?: (task: TaskData) => void`, invoked from the existing `advance()` path for the task that was swiped away. Only user-initiated fly-offs call it (add/remove reshuffles and wrap-around bookkeeping must not).
- `apps/mobile/src/app/index.tsx` — wire `onSwipedPast={(task) => recordTaskSkip(db, task, new Date())}` fire-and-forget (catch + console.warn, same pattern as `task-edits.ts`). No analytics on skip (hot path — logging-best-practices).

### UI

- `apps/mobile/src/components/card-stack/task-card.tsx` (front) — small indicator chip when `evaluateTaskHealth(task, now) !== null` (compute in render with `new Date()`; cheap). Copy: "Been a while" (stale) / "Skipped a lot" (avoided). Include flag in the card a11y label.
- New `apps/mobile/src/components/card-stack/task-health-prompt.tsx` (+ stories) — gentle panel rendered by `card-back.tsx` above the action buttons when the task is flagged: one line of copy + three buttons (Keep it / Cut loose / Break it down). Presentational: `flag` + three callbacks.
- `apps/mobile/src/components/card-stack/card-back.tsx` — render the prompt for flagged tasks; wire:
  - Keep it → `markTaskEngaged` (flag + indicator clear reactively via live query).
  - Cut loose → existing 2.4 cut-loose service (same handler the card-back Cut Loose button uses; both surfaces — overlay and list detail — already wire it).
  - Break it down → existing `onStart` path (2.1: flush → start → push `/task-running/[id]`); the running screen's "Help me with this" (6.3) is the break-down affordance. No auto-trigger of the AI call (AC only requires offering the option).
- Both card-back surfaces get this for free (single CardBack component).

## Analytics (events.ts additions)

- `task_health_prompt_shown: { flag: 'stale' | 'avoided' }` — once per card-back open of a flagged task (guard with a ref, mirrors 2.1's once-per-focus pattern).
- `task_health_prompt_actioned: { flag: 'stale' | 'avoided'; action: 'keep' | 'cut_loose' | 'break_down' }`
No `task_skipped` event (high-volume hot path). Flat, PII-safe props only.

## Testing plan

- **Unit** (`task-health.test.ts` — pure logic, injected `now`):
  - stale boundary: 6d23h → null, exactly 7d → stale; fresh task → null.
  - avoided: 5 skips inside window → avoided; 5 skips with expired window start → null; precedence when both stale + avoided → avoided.
  - non-pending statuses never flag.
- **Integration** (createTestDb + real migration SQL, extend `tasks-repository.test.ts`):
  - `recordTaskSkip` increments; window expiry resets to count 1 with fresh window start.
  - `markTaskEngaged` zeroes skip fields and bumps `lastEngagedAt`.
  - `updateTask` patch and `startTask` refresh engagement (skip fields reset) — proves AC4 end to end.
  - migration backfill: pre-existing row gets `last_engaged_at = updated_at`.
- **Stories**: `task-health-prompt.stories.tsx` (stale + avoided variants); a flagged-task story added to `task-card.stories.tsx` (front indicator) and `card-back.stories.tsx` (prompt in situ).
- **Maestro** (one flow, `.maestro/NN-story-7-2-avoided-task-prompt.yaml`; DRY via `common/launch-app.yaml`) — avoided path only (stale needs 7 days; covered by unit/integration):
  1. Launch clean → quick-add two tasks A and B (stack cycles with 2 cards).
  2. Swipe the top card away 5 times — with a 2-card cycling stack the original top task accrues skips on alternating swipes, so swipe until task A has 5 skips (assert front indicator "Skipped a lot" appears on A's card — full a11y-label assertion per 1.3 convention).
  3. Tap A's card → back view shows the prompt → `takeScreenshot` at the prompt.
  4. Tap "Keep it" → prompt disappears, front indicator gone after flip-back.
  5. Regression leg: swipe past once more → no flag (count restarted).

## UX notes

- Tone (UX principles: gentle nudging, never demand, no shame): prompt copy — stale: "This one's been waiting a while. Still worth doing?"; avoided: "You keep skipping this one. No judgement — what would help?". Buttons: "Keep it" / "Cut loose" / "Break it down". Never modal — it's an inline panel; the user can ignore it entirely.
- Front indicator: muted chip next to size/context badges, not red/alarming (3:1 contrast, DR18). 44pt targets on prompt buttons.
- Cutting loose from the prompt behaves exactly like the Cut Loose button (star reward, "Released" toast, 2.4).

## Dependencies

- **1.3** card stack (swipe hook point), **1.4** card back, **2.1** start/running screen, **2.4** cut-loose service + toast, **5.3 pre-work** schema-managed timestamps (coordination: this story adds columns to the canonical `TaskData` — must land against the post-5.3 schema and extend the sync column list; conflicts with any concurrent tasks-schema change), **6.3** "Help me with this" on the running screen (soft — Break it down just routes there; button exists as disabled placeholder since 2.1 regardless).
- 7.3 consumes `evaluateTaskHealth`, `markTaskEngaged`, and the constants file — land 7.2 first.

## Out of scope

- Stale detection UI beyond the card surfaces (no list badges, no notifications — 8.1 territory).
- Proactive micro-task suggestions for frequently-skipped tasks (6.4).
- Auto-triggering the AI breakdown from the prompt; any AI calls at all.
- Threshold settings UI (constants only, tuned by dogfooding).
- Welcome-back/triage surfacing of these flags (7.3).
