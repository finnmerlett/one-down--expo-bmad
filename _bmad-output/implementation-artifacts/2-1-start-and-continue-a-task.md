# Story 2.1: Start & Continue a Task

Status: done
Date: 2026-06-11
Mode: BMad-lite autonomous run (routine tier: single reviewer)

## Story

As a user, I want to start working on a task and see a dedicated task running screen, So that I can focus on one thing at a time.

## Acceptance Criteria

1. Tapping Start on a card's back view gives the task "started" status (local enum: `in_progress`) and opens the task running screen: title, description, editable notes area, Done button, "Help me with this" button (disabled placeholder — Epic 6), Cut Loose button
2. A previously started task's card front shows "Continue" instead of "Start"
3. Tapping Continue reopens the running screen with previous notes and progress preserved

FRs: 19, 20, 21 · UX-DRs: 6

## Implementation decisions

- **`setTaskStatus` is a dedicated repository function**, deliberately kept out of `UpdateTaskPatch` — the card back's generic inline-edit path can never change lifecycle state. 2.3 (completed) and 2.4 (cut_loose) reuse it.
- **`startTask(task, via)` service**: only the first `pending → in_progress` transition writes and emits `task_started { via }` — Continue taps are no-ops (no re-emit; screen views are PostHog built-ins). Fire-and-forget like `applyTaskPatch`; the running screen never reads status, so the racing write is harmless.
- **Curation now keeps `in_progress` browsable** (UX flow 4: started tasks stay in the stack showing "Continue"); completed/cut_loose drop out when they arrive in 2.3/2.4.
- **Card front**: solid success "Continue" badge when in progress; **card back**: primary action relabels Start → Continue, enabled via optional `onStart` prop (omitted = disabled placeholder, both surfaces wire it).
- **CardBack flushes its own drafts before reporting Start** (`handleStart`) — navigation gives no blur guarantee; order (persist, then leave) is unit-tested via `invocationCallOrder`.
- **`TaskRunningView` is presentational** (task + onPatch + flush handle): title, details, notes with the same draft/blur/flush auto-save, Done (primary, wired 2.3) / Help me with this (Epic 6) / Cut loose (2.4) as disabled placeholders. Subtask list lands above notes in Epic 6.
- **`/task-running/[id]` route** mirrors `/task/[id]`: live-query lookup, null while loading, `beforeRemove` flush, once-guarded pop, back arrow labeled "Pause and go back" (leaving keeps in_progress — UX: no guilt).
- **Start from the home overlay unmounts the overlay BEFORE pushing** — its BackHandler stays live under pushed routes and would swallow hardware back (1.5 landmine). Contract animation is skipped on this path (accepted: push covers it).
- **Top bar is not rendered on the running screen** (UX spec says it persists there) — deferred: AC doesn't require it and the back header matches the list/detail pattern. Revisit if star counter (4.2) needs to be visible mid-task.

## Tasks

- [x] `setTaskStatus` + `startTask` + `task_started { via }` event; curation includes in_progress (+ updated unit test)
- [x] CardBack `onStart` (flush-then-start, Continue label) + overlay pass-through; card front Continue badge; InProgress stories
- [x] `TaskRunningView` + 2 stories + 4 portable-story tests
- [x] `/task-running/[id]` route; Start wired from home overlay and `/task/[id]`
- [x] Maestro `07-story-2-1-start-task.yaml` (both surfaces, flush-path-pinned, blocker regression leg)
- [x] Gates: lint:check, typecheck, test (49/49); storybook:generate
- [x] Review (single reviewer, fresh context): changes requested → blocker + should-fixes applied (below)
- [x] E2E: full suite green on fresh release build (incl. new flow 07)
- [x] Screenshot `2-1-task-running.png`

## Dev Notes

- **Routes beneath a pushed screen keep their mount-time text drafts** — any screen holding `useState` drafts that stays in the stack while another screen writes the same fields will flush stale values over the new ones. First fix attempt (remount via `key` bumped on re-focus) FAILED on-device: the live-query emit with the new value can land *after* the focus event, so the remounted component snapshots stale data — remount-style fixes are inherently racy. Correct pattern: **draft-or-stored values** (`draft ?? stored`, draft null = not editing; an effect drops the draft whenever the stored value changes). Resync is then timing-independent: during normal editing the drop is our own write landing (same text, no flicker); cross-screen, stored truth wins and blur/flush of an untouched field is a no-op. Applied to CardBack (title/details/notes) and TaskRunningView (notes). The home overlay path was never affected (unmounts before pushing).
- **Once-per-focus guard for push triggers**: a plain once-guard on Start would leave Continue dead after returning; re-arm it in a `useFocusEffect`.
- Maestro: leaving the running screen is done WITHOUT `hideKeyboard` so persistence is proven via the `beforeRemove` flush, not the `onBlur` save.

### Review findings & resolutions (single reviewer: changes requested → all applied)

Applied:

1. (BLOCKER) `/task/[id]` stays mounted under the running screen; its CardBack's stale notes draft would flush `{ notes: null }` (or old text) over notes written on the running screen — focusing+blurring the untouched field sufficed to wipe. → draft-or-stored values in CardBack + TaskRunningView (see Dev Notes; the first remount-on-refocus fix was caught racy by the E2E run itself). Maestro leg + portable test added that reproduce exactly this (external notes update → field follows; blur of untouched field patches nothing).
2. (should-fix) No once-guard on detail-route Start → double push + duplicate `task_started` → once-per-focus guard.
3. (should-fix) `TaskRunningView` has the same mount-snapshot pattern (benign until Epic 6 adds concurrent writers) → documented inline; revisit with 6.x.
4. (should-fix) Maestro `hideKeyboard` before leaving meant the flush path might go untested → removed; flow also gained the list-detail surface leg.
5. (nit) Flush-before-start test asserted calls, not order → `invocationCallOrder` assertion. (nit) Stale "unreachable until Epic 2" comment in index.tsx → updated.

Accepted / not done:

6. (nit) Disabled-placeholder Start branch (`isDisabled={!onStart}`) has no story — accepted; it disappears in 2.4 when both surfaces wire everything.
7. (nit) Overlay Start skips the contract animation — accepted; the pushed screen covers it.

Confirmed correct by review (no action): BackHandler landmine handling (unmount-before-push), flush coverage on all pop paths, startTask idempotence + write/read serialization, NFR-S3 (flat props, no task text), curation semantics + test quality, `setTaskStatus` isolation from the patch path, Maestro full-string selector non-collision ('Continue' badge vs 'Continue task' label).
