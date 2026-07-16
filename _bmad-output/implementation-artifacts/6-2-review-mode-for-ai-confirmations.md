# Story 6.2: Review Mode for AI Confirmations

Status: ready-for-dev
Date: 2026-07-16
Mode: wave-based autonomous run (spec-first; fresh-context review before commit)

## Story

As a user, I want to review and confirm AI-inferred task information in a dedicated review mode, So that my tasks are accurate before I rely on them.

FRs: 12, 37, 38, 47 · UX-DRs: 8 · Mobile-only (no server changes).

## Acceptance Criteria

1. Cards whose task has `hasCheckNeeded` show an info icon on the card FRONT (Lucide `InfoIcon`, a11y label "Needs review"); it is a separate tap target that does NOT flip the card.
2. Tapping the info icon enters review mode: the stack filters to only tasks with review items (`hasCheckNeeded`), swipe/browse works as normal, and a banner above the stack reads "Reviewing N task(s)" with an "Exit review" button. Exiting restores the full stack.
3. On a review card's BACK, each flagged item is visually highlighted (amber/warning outline + "AI guessed" hint) with a tick/confirm button beside it (`CheckIcon`, a11y "Confirm <field>"). Flags come from `reviewFlags` (Story 6.1): `inferred: ['size'|'contexts'|'deadline']` and/or `missingDeadline`.
4. Tapping a confirm tick marks that item confirmed: the flag is removed, highlight + tick disappear; when the last flag clears, `hasCheckNeeded` flips false and the card drops out of the review stack (and its front icon disappears).
5. Editing a flagged field's value directly (title-row edits don't count — only size/contexts/deadline) auto-confirms it: same flag-clearing as the tick, no extra tap.
6. `missingDeadline` renders as a highlighted deadline prompt: "Needs a deadline — when?" with quick chips **Today / Tomorrow / Next week / Pick a date…** (native date picker). Setting a deadline clears `missingDeadline` (and `deadline`'s inferred flag if present). Deadline becomes editable on the card back for ALL tasks (chips + picker + "Clear" when set and unflagged).
7. Each confirmation (tick or edit-confirm, including supplying the missing deadline) earns a small star reward via the Story 4.1 star service (weight: triage/review confirmation). One award per flag, ever — clearing an already-cleared flag is impossible by construction.
8. Review mode with zero remaining cards shows "Nothing left to review" + auto-offers Exit; entering is impossible when no task is flagged (icon absent).

## Implementation plan

### Data / repository (`apps/mobile`, `packages/shared`)

- No schema change (column shipped in 6.1). Add to `packages/shared/src/types/task.ts` if not present: `removeReviewFlag(flags, item)` pure helper (`item: ReviewField | 'missingDeadline'`; returns `TaskReviewFlags | null`, null when emptied).
- `src/services/tasks-repository.ts`:
  - Add `deadline?: Date | null` to `UpdateTaskPatch` + handling in `updateTask` (card back can now edit it; status stays excluded as ever).
  - `updateTask` gains flag-clearing: when a patch writes `size`/`contexts`/`deadline` and the row has matching `reviewFlags`, clear them (deadline write clears both `deadline` inferred flag and `missingDeadline`); recompute `hasCheckNeeded`. Return `{ confirmedItems: ('size'|'contexts'|'deadline'|'missingDeadline')[] }` (empty array when nothing was flagged) so callers can award/track. Read-modify-write is fine (single-writer local SQLite, matching existing patterns).
  - `confirmReviewItem(db, id, item)` — tick path: clears the flag WITHOUT touching the value; returns whether it actually cleared (guards double-taps).
- `src/services/task-edits.ts`:
  - `applyTaskPatch` consumes `confirmedItems` from `updateTask`: for each, award the confirmation star (4.1 service) and `track('review_item_confirmed', { field, via: 'edit' })`.
  - New `confirmReviewItem(task, item)` service fn: repo call → star award → `track('review_item_confirmed', { field, via: 'tick' })`. Fire-and-forget like `startTask`.
  - Star wiring: use Story 4.1's award service (`services/star-*.ts`) with `STAR_WEIGHTS` entry for review/triage confirmation from `packages/shared/src/constants/star-weights.ts` — **add the constant there if 4.1 hasn't defined it** (architecture lists "triage confirmation" as a core star event).

### UI

- `src/components/card-stack/task-card.tsx`: info icon top-right on the front when `task.hasCheckNeeded` — a `Pressable` (`hitSlop`, ≥44pt) with `onReviewPress` prop; stack passes taps through without flipping (mirror how `onCardPress` is wired in `card-stack.tsx`, which needs a prop pass-through only).
- `src/stores/review-mode-store.ts` (new zustand, UI state only): `{ isReviewing, enter(), exit() }`.
- `src/app/index.tsx`: when `isReviewing`, `curateTasks(tasks).filter(t => t.hasCheckNeeded)`; render review banner (`"Reviewing N tasks"` + "Exit review" button) above the stack; empty-review state per AC8; auto-`exit()` guard if the user leaves review with the store still on (e.g. last card confirmed → offer Exit, don't force). Info icon tap → `enter()`.
- `src/components/card-stack/card-back.tsx`:
  - Section-level review treatment: wrap the Size / Contexts / Deadline sections with a highlight style + inline tick button when the matching flag is set (new small `ReviewFlagRow` helper component inside the file; props stay presentational — `onConfirm(item)` callback added to `CardBack` props, wired by both surfaces: home overlay + `/task/[id]`).
  - Deadline editor replaces the read-only text: current value (or "No deadline"), chips Today/Tomorrow/Next week (compute with `date-fns`, 18:00 local), "Pick a date…" opening `@react-native-community/datetimepicker` (install via `npx expo install @react-native-community/datetimepicker`; native module → fresh APK for E2E, which the wave build does anyway), "Clear deadline" when set. Emits `onPatch({ deadline })` — auto-save, no save button.
  - `missingDeadline` copy above the editor: "Needs a deadline — when?" (calm, factual).
- `src/app/task/[id].tsx` + `src/components/card-stack/card-back-overlay.tsx`: pass `onConfirm` through to `CardBack` (both surfaces get review UI for free).

## Analytics (extend `events.ts`)

- `review_mode_entered: { card_count: number }`
- `review_item_confirmed: { field: 'size' | 'contexts' | 'deadline' | 'missing_deadline', via: 'tick' | 'edit' }`
- `review_completed: { }` — emitted when a confirmation empties a task's flags (per task, not per session). Props stay flat/PII-safe; star events themselves come from 4.1's instrumentation.

## Testing plan

- **Unit (pure):** `removeReviewFlag` / `hasReviewItems` edge cases (unknown keys tolerated, emptied → null).
- **Mobile integration** (`createTestDb`, real migration SQL): `updateTask` clears flags + recomputes `hasCheckNeeded` + returns `confirmedItems` (edit-confirm); deadline write clears both deadline flags; `confirmReviewItem` clears without changing the value and is idempotent (second call reports no-op → no double star); unflagged-field edits return empty `confirmedItems`.
- **Stories:** `card-back.stories.tsx` — add `WithReviewFlags` (all three inferred + missingDeadline) and `MissingDeadlineOnly`; `task-card.stories.tsx` — add `NeedsReview` front. Portable tests come free.
- **Maestro E2E** (`NN-story-6-2-review-mode.yaml`): server in fake mode. Seed via brain dump (`"Call the dentist soon.\nPonder the universe quietly for a while"` → task 1 flagged: phone context inferred + missingDeadline (no date word → no deadline, `soon` → timeSensitive); task 2 unflagged — avoid fake-provider keywords). Assert info icon ("Needs review") on card 1 only → tap → banner "Reviewing 1 task" and 'Ponder…' not visible → open card back → **screenshot** (flagged sections + ticks) → tap 'Confirm contexts' tick → tick gone → tap 'Tomorrow' deadline chip → "Needs a deadline" prompt gone → back to front → "Nothing left to review" → 'Exit review' → both cards browsable, info icon gone. Use full-string a11y labels (project convention).

## UX notes

- TriageCard "blueprint aesthetic" (UX-DR8: lighter background, dashed border) is scoped down to section-level highlights on the standard card back — the epics ACs for 6.2 describe normal-looking cards with an info icon and highlighted items, which this matches; the dedicated blueprint triage stack belongs to Epic 7's return-triage surface. Record as an accepted deviation in the story file if review flags it.
- Highlights use warning/amber tones, never red (no negative feedback). Copy: "AI guessed", "Needs a deadline — when?".
- Confirm ticks ≥44pt; `accessibilityState={{ checked }}` not needed (they disappear on confirm); announce via label change.

## Dependencies

- **6.1** (reviewFlags data + brain-dump seeding for E2E) — hard.
- **4.1** (star award service + weights; toast/counter feedback comes from 4.1/4.2) — hard for AC7. If scheduled before 4.1 lands, stub the award call behind the 4.1 service signature and mark AC7 pending — prefer scheduling after 4.1.
- Touches `app/index.tsx`, `task-card.tsx`, `card-stack.tsx` (prop pass-through) — **conflicts with Epic 3 (context bar/mode toggle/curation) and 2.3/2.4 (card-back buttons)**; serialize with those stories.

## Out of scope

- Dedicated triage-mode stack / TriageCard blueprint styling (Epic 7 return experience).
- AI re-prompting for better descriptions (only confirm/edit of existing inferences).
- Any server change. Star weight VALUES (4.1 owns tuning).
