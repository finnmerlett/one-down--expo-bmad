# Story 1.4: Card Front/Back & Inline Editing

Status: done
Date: 2026-06-11
Mode: BMad-lite autonomous run (routine tier: single reviewer)

## Story

As a user, I want to tap a card to see its details and edit properties in place, So that I can manage task information without leaving the card view.

## Acceptance Criteria

1. Tap a card in the stack → view switches to the back; card expands to fill more of the screen (not full screen)
2. Back shows: title, description, deadline, notes area, context requirement toggles, task size selector (quick win / big time / unset), placeholder Start + Cut Loose buttons (wired in Epic 2)
3. Back button appears in the top-left corner
4. Text fields auto-save to local storage (no save button), instantaneous (no network)
5. Context toggles (Home, Out & About, Phone, Laptop, Internet) update immediately and persist
6. Size set/change/clear updates immediately, persists, and reflects on the front size tag (eligible for Story 3.2 filter without AI sizing)
7. Back button or tapping around the edges → card contracts to stack size, front view, front reflects changes

## Implementation decisions

- **Schema: `notes` column added** (canonical `TaskData` + `schema-local` sqliteTable → drizzle-kit migration `0001_green_rocket_racer.sql`, a nullable ADD COLUMN — safe on existing installs). AssertExact conformance check keeps type/table in lockstep; all fixtures gained `notes: null`.
- **`updateTask(db, id, patch)`** in tasks-repository: partial patch of title/details/notes/size/contexts; bumps `updatedAt`; title trimmed + EmptyTitleError on blank (writes nothing); details/notes trim→null; `contexts` accepted as `TaskContext[]`, JSON-encoded, `[]`→null (matches createTask conventions).
- **Flip state lives in HomeScreen** (`openTaskId`), NOT the stack — the recorded 1.3 watch-out (depth promotion remounts cards) never bites. The open task re-resolves from the live query each render, so the back always shows fresh data and the front reflects edits via `useLiveQuery` (change listener confirmed enabled).
- **CardBackOverlay**: absolutely positioned over the content area (top bar stays visible — UX: it persists across screens). `progress` shared value interpolates insets 24→12; 24 == the stack's `p-6`, so the back grows out of the resting top-card frame exactly and contracts back into it. Crossfade via opacity on the same progress. Backdrop Pressable = "tap around the edges" (AC7).
- **Flush-on-close**: fields save on blur; CardBack exposes `flush()` via imperative handle (React 19 ref-as-prop) and the overlay flushes before the contract animation — blur is not guaranteed on unmount. Blank title on blur reverts to the stored value (titles can't be blanked); patches are emitted ONLY when a value actually changed (no spurious writes/events).
- **Tap-to-flip**: `Gesture.Exclusive(pan, tap)` — pan keeps priority (activates on movement), tap activates only after pan FAILS (release without drag), so a swipe can never also flip and the pan gains no activation delay.
- Context toggles: switch-role chips (checked state); size selector: button-role chips (selected state); re-tap on the active size clears to unset. Stored contexts JSON rebuilt in canonical union order.
- Deadline display-only ("No deadline" / locale-formatted date) — no AC requires editing it here; date editing arrives with triage (Epic 6).
- Start / Cut Loose: disabled gluestack Buttons, wired in Epic 2.
- FAB hidden while the back is open (AppShell renders it only when given a handler — it would float above the overlay otherwise).
- Analytics: `task_edited { field }` (field name only, PII-safe), tracked after a successful write.

## Tasks

- [x] Schema: `notes` on TaskData + sqliteTable, drizzle-kit migration 0001, fixtures updated
- [x] `updateTask` repository fn + 5 integration tests (partial patch, trim/null rules, contexts JSON, updatedAt bump vs back-dated row, blank-title write-nothing)
- [x] `card-back.tsx` + 2 stories + 7 portable-story interaction tests (draft/flush semantics, revert, toggle order, size clear)
- [x] `card-back-overlay.tsx` (expand/contract, backdrop edge-tap, flush-before-close, BackHandler)
- [x] CardStack: tap-to-flip via Gesture.Exclusive, `onCardPress` prop
- [x] HomeScreen wiring: openTaskId state, updateTask + task_edited tracking
- [x] Analytics: `task_edited` event in taxonomy
- [x] Maestro `05-story-1-4-card-back.yaml` — full suite 5/5 green on-device (twice: pre- and post-review-fixes)
- [x] Gates: lint:check, typecheck, test (39/39); storybook:generate
- [x] Review (single reviewer): approve-with-fixes, fixes applied (below)
- [x] Screenshot `1-4-card-back.png` — expanded back, all sections, top bar visible

## Dev Notes

- **RNTL v14: `fireEvent` is async too** — un-awaited fireEvent after `await render` throws "overlapping act() calls" and poisons every later query in the file. Await ALL of: render, fireEvent, fireEvent.press/changeText. (Extends the 1.0a note that `render()` is async.)
- **Keyboard on the card back**: same edge-to-edge Android issue as the quick-add sheet — `KeyboardAvoidingView behavior="padding"` wraps the ScrollView (review find: notes field was keyboard-occluded with no scroll room). `keyboardShouldPersistTaps="handled"` so a chip tap with the keyboard up blurs (saves) AND registers.
- **System back closes the overlay**: it's a plain view, not a Modal — without a `BackHandler` subscription the Android back gesture exits the app from the detail view (review find). Closes via the same flush-then-contract path; covered by Maestro (`- back` step).
- **Accepted deviation (recorded, reviewer-rated nit)**: toggles/size/title-revert compute "next" from the live `task` prop while writes are fire-and-forget — two interactions inside the ~30ms live-query refresh window can act on stale state (effectively needs two-finger taps). Revisit if Story 3.1's context bar shares the pattern.
- **Story 1.5 reuse**: CardBack is overlay-agnostic (it doesn't know about the animation) — the list view's isolated full-screen detail can mount it directly with a different container.
- Maestro: card-back field labels ('Task title', 'Task details') deliberately match the quick-add sheet's — never visible simultaneously (Modal unmounts its tree). Chip labels are prefixed ('Context: Home', 'Size: Quick win') so front-badge assertions ('Home', 'Quick win') can't match back elements.

### Review findings & resolutions (single reviewer: approve-with-fixes, no blockers)

Applied:

1. (should-fix) Keyboard occlusion on the back — no KAV/inset, lower fields unreachable while editing → KeyboardAvoidingView added.
2. (should-fix) Android hardware back fell through to the navigator (app exit from detail view) → BackHandler closes the card; Maestro flow 05 now closes via `- back` once.
3. (nit) `updatedAt` bump test couldn't fail (same-ms `>=`) → row back-dated, strict `>`.
4. (nit) Context toggles were button-role → switch-role with checked state (size selector stays button+selected).

Accepted (recorded above): read-modify-write window on toggle/size/revert paths.

Confirmed correct by review (no action): inset-match math (24 == stack p-6), Exclusive gesture semantics, double-close idempotence, flush-vs-unmount ordering, stale-flush comparisons vs trimmed stored text, migration safety + journal wiring, label-collision analysis, PII-safe analytics, strict TS.
