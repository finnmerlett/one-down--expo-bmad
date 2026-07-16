# Story 3.4: Empty State Guidance

Status: ready-for-dev
Date: 2026-07-16
Mode: spec for wave-based autonomous run (see decisions-log 2026-07-16)

## Story

As a user, I want helpful guidance when there are no tasks to show, So that I know what to do next instead of seeing a blank screen.

FR: 17 · UX-DRs: 13, 22

## Acceptance Criteria

1. When context + mode filters produce zero cards (but tasks exist), the home screen shows a contextual empty state: message names the active filter(s) and suggests checking other contexts / adjusting the mode; a "Show all tasks" action clears all filters and the stack reappears.
2. When the user has zero tasks globally, the home empty state guides them to add tasks with an "Add a task" CTA that opens the quick-add sheet (brain-dump CTA replaces this once Epic 6 lands — leave a pointer comment).
3. When tasks exist but none are browsable with no filters active (everything completed/cut loose — reachable after 2.3/2.4), the home empty state is a calm "all clear" message with an "Add a task" CTA (achievement framing, never guilt).
4. The task list view's empty state guides the user to add tasks, with the same "Add a task" CTA (opens quick-add on home).
5. Empty states are calm and factual (no red, no sad-face guilt, ADHD copy principles); CTA meets 44pt; message text is accessible (plain `Text`, announced naturally).

## Implementation Plan

No DB/schema change, no migration.

**New: `apps/mobile/src/components/empty-state/empty-state.tsx`** (+ `.stories.tsx`, `.test.tsx`)
- Presentational (UX P1 component "EmptyState"): `{ title: string; body: string; actionLabel?: string; onAction?: () => void }`.
- Centered `VStack` (flex-1, items-center, justify-center, px-8): title `text-typography-900 font-medium`, body `text-typography-500 text-center`, optional gluestack `Button` below (`aria-label` = actionLabel, gluestack creator components need `aria-label` not `accessibilityLabel` — run-notes gotcha).

**New: `apps/mobile/src/components/empty-state/empty-stack-copy.ts`** (+ `.test.ts`)
- Pure helper `emptyStackCopy(activeContexts: TaskContext[], mode: TaskSize | null): { title: string; body: string }` building the contextual message from `CONTEXT_LABELS`/mode:
  - one context: `Nothing here for Home` · several: `Nothing for these contexts`
  - mode only: `No quick wins right now` / `No big time tasks right now`
  - both: `No quick wins for Home` (etc.)
  - body always: `Try another context or switch mode.` (drop the irrelevant half when only one filter type is active).

**Modify: `apps/mobile/src/stores/stack-filters-store.ts`**
- Add `clearFilters()` — resets `activeContexts: []` and `mode: null` (single action so the CTA is atomic).

**Modify: `apps/mobile/src/app/index.tsx`**
- Replace both placeholder `<Text>` branches with `<EmptyState>`:
  - `tasks.length === 0` → title `No tasks yet`, body `Get things out of your head — add your first task.`, action `Add a task` → `open()` (quick-add store; disabled while card-back overlay open, same guard as the FAB).
  - `curated.length === 0` and any filter active → `emptyStackCopy(...)`, action `Show all tasks` → `clearFilters()` + `track('stack_filters_cleared', { via: 'empty_state' })`.
  - `curated.length === 0`, no filters → title `All clear`, body `Nothing waiting right now. Add a task or check your list.`, action `Add a task`.
- The ContextToggleBar/ModeToggle stay visible above the empty state (3.1 UX rule: an empty active context stays ON so the user sees this state and can leave it).

**Modify: `apps/mobile/src/components/task-list/task-list-view.tsx`** (+ story), **`apps/mobile/src/app/task-list.tsx`**
- Swap the local `EmptyState` function for the shared component: title `No tasks yet`, body `Tasks you add will show up here.`, action `Add a task`.
- CTA wiring: `useQuickAddStore.getState().open()` (global UI store) then `router.back()` — the sheet is mounted on the home screen, so it opens as home regains focus. Pass the handler down from the route (view stays presentational; stories keep a no-op).

## Analytics

Add to `events.ts`:
- `stack_filters_cleared: { via: 'empty_state' }` — the CTA is a semantic filter mutation not expressible as individual `context_toggled`/`mode_toggled` events.
- No event for empty-state *display* (it's a derived view — screen views/impressions are PostHog built-ins territory) and none for the add-task CTA (`task_created` already fires if a task is actually added; button taps are autocapture).

## Testing Plan

- **Unit (`empty-stack-copy.test.ts`):** the copy matrix — one context / several / mode-only (both modes) / combined / body composition. Real branching, worth testing; everything else in this story is presentational.
- **Portable stories:** `empty-state.stories.tsx` — WithAction / MessageOnly; test the action press reaches the handler and no-action renders without a button. Update `task-list-view` empty story to the shared component.
- **No integration test** — no new DB paths.
- **Maestro `.maestro/14-story-3-4-empty-states.yaml`** (renumber to next free sequence):
  1. Launch clean → home global empty state: assert `'No tasks yet'` + `'Add a task'` (AC2).
  2. Task list leg (AC4): open task list → assert `'Tasks you add will show up here.'` → tap `'Add a task'` → lands back on home with the quick-add sheet open (assert `'Task title'` visible). Add "Solo task"; close sheet.
  3. Card back: tag `'Context: Home'` + `'Size: Quick win'`, close.
  4. Filtered empty (AC1): tap `'Filter context: Home'` (card visible), then `'Mode: Big time'` → assert `'No big time tasks for Home'` + `'Try another context or switch mode.'`. **takeScreenshot** (key moment).
  5. Tap `'Show all tasks'` → card label visible again (filters cleared; assert Home filter no longer selected via the card count label `Card 1 of 1`).
  6. Standard error-free tail.
  - Card-label selectors: use whatever format is current when implemented (3.3 adds `Worth N stars` — flows must match the landed format).
- Gates: `bun run lint:check`, `bun run typecheck`, `bun run test`, `bun run storybook:generate`.

## UX Notes

- DR13/DR22 copy patterns: per-context ("Nothing here for Home — try another context") and global/new-user ("No tasks yet — add something"). Factual, zero guilt, achievement framing for the all-clear state. "Tap navigates to relevant action" — every empty state carries exactly one CTA (one primary action per screen).
- No illustration/animation (barebones-functional spec; polish deferred).
- Never show "no tasks" copy when tasks merely fail the filter — the two states must stay distinct (regression of the 1.3 AC8 guard).

## Dependencies

- **3.1 + 3.2 (hard):** filter state, `clearFilters`, filter-aware copy, and the E2E path to a filtered-empty stack (mode toggle is the only reachable route while contexts auto-disable when empty).
- **3.3 (ordering only):** independent functionally, but both edit `app/index.tsx` and Maestro card-label selectors — implement sequentially (either order; whoever lands second reconciles).
- 2.3/2.4 make the "all clear" branch reachable; the branch ships regardless.

## Out of Scope

- Brain-dump CTA + AI parsing (Epic 6 swaps the global-empty CTA target).
- Triage "All done!" stamp (Epic 6), recycle-bin empty state ("Nothing here — everything's active", Epic 7 bulk/bin work).
- Any change to which tasks are browsable or how they order (3.3).
