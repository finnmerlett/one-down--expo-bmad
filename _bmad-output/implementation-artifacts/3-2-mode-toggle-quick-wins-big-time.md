# Story 3.2: Mode Toggle (Quick Wins / Big Time)

Status: done
Date: 2026-07-16
Mode: spec for wave-based autonomous run (see decisions-log 2026-07-16)

## Story

As a user, I want to toggle between Quick Wins and Big Time modes, So that I can match my current energy level to task size.

FRs: 34, 35, 36 · UX-DR: 5

## Acceptance Criteria

1. The main card view shows a ModeToggle: a two-option control labeled "Quick wins" / "Big time".
2. Tapping "Quick wins" activates it and the stack re-curates to only `size === 'quick_win'` tasks.
3. Tapping "Big time" activates it and the stack re-curates to only `size === 'big_time'` tasks.
4. Tapping the currently active option deactivates it — no mode active — and the stack shows both sizes again (plus unsized tasks; see plan note).
5. Mode combines with the context filter from 3.1 (AND semantics: context match AND size match).
6. The mode persists across restarts alongside the context selection (same persisted store).
7. Options meet 44pt targets, use `accessibilityRole="button"` + `accessibilityState={{ selected }}`, labels `Mode: Quick wins` / `Mode: Big time` (distinct from card-back's `Size: Quick win` selectors — Maestro collision guard).

**Decision (flagged in readiness report — "Switch vs FR34's 3-state re-press toggle, resolve at 3.2"):** a two-button segmented control, NOT a gluestack `Switch`. A Switch cannot express the three states (quick wins / big time / neither). Record this as the resolution.

**Unsized tasks:** tasks with `size === null` (manual sizing is optional until Epic 6 AI sizing) are shown in BOTH modes — filtering them out would make tasks silently unreachable, violating "the app does the worrying". Mode filters *to* a size only among tasks that declare one; `null` always passes. Note this in code comments and tests.

## Implementation Plan

No DB/schema change, no migration.

**Modify: `apps/mobile/src/stores/stack-filters-store.ts`**
- Add `mode: TaskSize | null` (persisted) and `toggleMode(size: TaskSize)` — sets `mode = (mode === size ? null : size)`.

**New: `apps/mobile/src/components/stack-filters/mode-toggle.tsx`** (+ `.stories.tsx`, `.test.tsx`)
- Presentational: `{ mode: TaskSize | null; onToggle: (size: TaskSize) => void }`.
- Segmented control from two `Pressable`s in a pill `HStack` (rounded-full border, selected half filled `bg-primary-100` / `text-primary-700`, unselected `text-typography-600`), centered, compact height (min 44pt touch). Reuse `SIZE_LABELS`-style copy but plural display text: "Quick wins" / "Big time".

**Modify: `apps/mobile/src/services/curation.ts`** (+ `curation.test.ts`)
- Evolve the signature ONCE to an options bag (3.3 keeps it stable afterwards):
  ```ts
  export interface StackFilters {
    contexts?: TaskContext[];      // 3.1 multi-select; empty/undefined = all
    size?: TaskSize | null;        // mode; null/undefined = both
  }
  export function curateTasks(tasks: TaskData[], filters?: StackFilters): TaskData[]
  ```
  Size filter: `filters.size ? task.size === filters.size || task.size === null : true`. Update the two existing callers (home screen, tests).
- Extend `availableContexts(tasks, size?: TaskSize | null)` so context buttons grey out honestly under the current mode (a context whose only tasks are big_time has "no matching tasks" while Quick wins is on). Active-context stays enabled per the 3.1 UX rule.

**Modify: `apps/mobile/src/app/index.tsx`**
- Read `mode`/`toggleMode`; pass `{ contexts: activeContexts, size: mode }` to `curateTasks` and `mode` to `availableContexts`.
- Render `<ModeToggle />` directly below the ContextToggleBar (shared chrome block above the stack; keep the two in one `VStack` with tight gap so the stack loses minimal height).

## Analytics

Add to `events.ts`:
- `mode_toggled: { mode: TaskSize; now_active: boolean }` — emitted from the home handler after the store update (`now_active: false` = the re-press that deactivated it). Enum values only, PII-safe.

## Testing Plan

- **Unit (`curation.test.ts`):** size filter keeps matching + unsized, drops the other size; `size` undefined/null keeps everything; combined contexts+size filtering (AC5) — one test with a 4-task matrix; `availableContexts` respects the size argument.
- **Portable stories (`mode-toggle.stories.tsx` + `.test.tsx`):** Neither / QuickWinsActive / BigTimeActive stories; test both presses reach `onToggle` with the right size and `accessibilityState.selected` is correct.
- **No integration test** — no DB surface change.
- **Maestro `.maestro/12-story-3-2-mode-toggle.yaml`** (renumber to next free sequence at implementation time):
  1. Launch clean; quick-add "Tiny chore" and "Giant project".
  2. Via card back set `Size: Quick win` on Tiny chore, `Size: Big time` on Giant project (selectors from flow 05).
  3. `tapOn: 'Mode: Quick wins'` → assert `'Task: Tiny chore. Card 1 of 1'` (AC2). **takeScreenshot** (key moment: active segment + filtered stack).
  4. `tapOn: 'Mode: Big time'` → assert `'Task: Giant project. Card 1 of 1'` (AC3).
  5. Re-tap `'Mode: Big time'` → both cards return (assert a `Card . of 2` label, AC4).
  6. Combined (AC5): card back → tag Tiny chore `'Context: Home'`; `tapOn: 'Filter context: Home'` + `'Mode: Quick wins'` → assert `'Task: Tiny chore. Card 1 of 1'`.
  7. Standard error-free tail.
  - Note: if Story 3.3 has already landed when this flow is (re)run, card labels include `Worth N stars` — 3.3's spec owns updating all flow selectors; write this flow against the current label format at implementation time.
- Gates: `bun run lint:check`, `bun run typecheck`, `bun run test`, `bun run storybook:generate`.

## UX Notes

- One control, two options, three states — segmented pill, centered under the context bar (UX flow 5: "Mode switch flow").
- Stack re-curates instantly (<1s local). No toast/confirmation.
- Copy: "Quick wins" / "Big time" exactly (matches PRD vocabulary). Calm styling, no counts.

## Dependencies

- **3.1 (hard):** shares `stack-filters-store.ts`, the home chrome block in `app/index.tsx`, and the `availableContexts` interplay. Implement after 3.1.
- Manual sizing on the card back (1.4, done) makes tasks eligible without AI sizing (FR67 resolution).
- Conflicts: `app/index.tsx` + `curation.ts` touched by every Epic 3 story — serialize within the epic.

## Out of Scope

- Curation ordering/scoring, star previews, urgent indicators (3.3).
- Empty-state guidance when mode+context yields nothing (3.4) — until then the existing minimal "nothing to browse" branch shows.
- AI size assignment (Epic 6).
