# Story 3.1: Context Toggle Bar

Status: ready-for-dev
Date: 2026-07-16
Mode: spec for wave-based autonomous run (see decisions-log 2026-07-16)

## Story

As a user, I want to select my current context to filter tasks, So that I only see tasks I can act on right now.

FRs: 13, 14, 16, 18 · UX-DR: 4

## Acceptance Criteria

1. The main card view (home screen) shows a ContextToggleBar with five icon buttons: Home, Out & About, Phone, Laptop, Internet (the `TASK_CONTEXTS` enum in `packages/shared`).
2. Tapping a context button marks it active and the card stack immediately re-filters to tasks matching that context (tasks with NO contexts are doable anywhere and always pass — existing `curateTasks` semantics).
3. Multi-select: several contexts can be active at once; the stack shows tasks matching ANY active context. Zero active contexts = unfiltered stack.
4. A context with no matching browsable tasks (`pending`/`in_progress`) renders greyed-out/disabled — UNLESS it is currently active (UX rule: an empty context stays enabled while ON so the user can see/leave the empty result, but cannot be re-selected once switched OFF).
5. The selection persists across app restarts (Zustand + AsyncStorage persist).
6. Each button is ≥44x44pt, has `accessibilityRole="button"`, `accessibilityState={{ selected, disabled }}`, and label `Filter context: <Label>` — deliberately DISTINCT from the card back's `Context: <Label>` toggles (Maestro full-string selectors must not collide).

## Implementation Plan

No DB/schema change — this is pure UI state + filtering. No drizzle migration.

**New: `apps/mobile/src/stores/stack-filters-store.ts`**
- Zustand store `useStackFiltersStore` with `persist` middleware + `createJSONStorage(() => AsyncStorage)` (`@react-native-async-storage/async-storage@2.2.0` is already a dependency; storage key `stack-filters`).
- State: `activeContexts: TaskContext[]`. Action (verb-first): `toggleContext(context)` — add/remove from the array.
- UI state only — never mirror task data. Story 3.2 adds `mode`; 3.4 adds `clearFilters()` — leave a comment marking both extension points.
- Rehydration is async: the first frame may render unfiltered/default. Accepted (<1s local filter NFR); do not gate rendering on hydration.

**New: `apps/mobile/src/components/stack-filters/context-toggle-bar.tsx`** (+ `.stories.tsx`, `.test.tsx`)
- Presentational: `{ activeContexts: TaskContext[]; availableContexts: ReadonlySet<TaskContext>; onToggle: (c: TaskContext) => void }`. No store access inside — stories stay trivial.
- Layout: `HStack` of five icon `Pressable`s (h-11 w-11, `hitSlop={8}`, rounded-full, active bg like `top-bar.tsx`), evenly spaced, horizontal padding consistent with TopBar (`px-4`). Sits directly under the TopBar, above the stack (matches UX focus order: top bar → context toggles → card).
- Icons: add `lucide-react-native@^1.17.0` (architecture-pinned icon package; `react-native-svg` already installed) and pass to gluestack `Icon` via `as`. Mapping: Home→`House`, Out & About→`MapPin`, Phone→`Smartphone`, Laptop→`Laptop`, Internet→`Globe`. Reuse `CONTEXT_LABELS` from `task-card.tsx` for a11y labels.
- Visual states: active = filled/primary tint (e.g. `bg-primary-100` circle + `text-primary-700` icon); inactive = `text-typography-500`; disabled = `text-typography-300` + `disabled` on Pressable. `disabled = !available && !active` (AC4).
- Story 3.3 later adds an `urgentContexts` prop (indicator dot) — keep the button a small internal sub-component so the dot slots in.

**Modify: `apps/mobile/src/services/curation.ts`** (+ `curation.test.ts`)
- Add pure helper `availableContexts(tasks: TaskData[]): Set<TaskContext>` — contexts having ≥1 browsable (`pending`/`in_progress`) matching task. A browsable task with NO contexts matches every context (consistent with `curateTasks`), so if any untagged browsable task exists, all five are available.
- `curateTasks(tasks, activeContexts?)` already implements the filter — no signature change this story (3.2 evolves it).

**Modify: `apps/mobile/src/app/index.tsx`**
- Read `activeContexts`/`toggleContext` from the store; `const curated = useMemo(() => curateTasks(tasks, activeContexts), [tasks, activeContexts])`.
- `const available = useMemo(() => availableContexts(tasks), [tasks])`.
- Render `<ContextToggleBar />` as first child inside AppShell content (above the stack / empty states), wiring `onToggle` to `toggleContext` + analytics. Bar stays visible in every home state (user must always be able to un-filter). The CardBackOverlay already paints over it when open.
- The existing "Nothing to browse right now" branch is now REACHABLE via filters (its "unreachable until 2.3/2.4" comment is stale) — update the copy to mention trying another context (full empty-state treatment is Story 3.4; keep this minimal).

## Analytics

Add to `apps/mobile/src/lib/analytics/events.ts`:
- `context_toggled: { context: TaskContext; now_active: boolean; active_count: number }` — emitted from the home screen `onToggle` handler after the store update. Context enum names only, PII-safe. (No event for stack re-computation — passive; screen views are PostHog built-ins.)

## Testing Plan

- **Unit (`curation.test.ts`):** `availableContexts` — tagged tasks map to their contexts; untagged browsable task ⇒ all contexts available; completed/cut_loose tasks contribute nothing; empty input ⇒ empty set. (Multi-context OR-filtering of `curateTasks` is already covered.)
- **Portable stories (`context-toggle-bar.stories.tsx` + `.test.tsx`, composeStories pattern per `app-shell.test.tsx`):** stories for AllInactive, TwoActive, SomeDisabled, ActiveButEmpty (active + not available ⇒ still enabled). Test presses reach `onToggle` and disabled buttons don't. RNTL v14: `await render(...)`, await fireEvent.
- **No integration test:** no DB interaction beyond existing repository paths; store toggle logic is a trivial array flip (don't test the framework).
- **Maestro `⁠.maestro/11-story-3-1-context-toggle-bar.yaml`** (renumber to next free sequence at implementation time — Epic 2 stories 2.2–2.4 are expected to take 08–10):
  1. `runFlow: common/launch-app.yaml`; quick-add "Water plants" and "Email plumber".
  2. Tag via card back: open card, `tapOn: 'Context: Home'`, `'Back to card front'`; open other card, tag `'Context: Phone'`.
  3. `tapOn: 'Filter context: Home'` → assert `'Task: Water plants. Card 1 of 1'` (immediate re-filter, AC2). **takeScreenshot** here (key moment: active button + filtered single-card stack).
  4. Add `'Filter context: Phone'` → both cards back (`Card . of 2` — assert via the top-card full label after the known curation order, or assert both titles reachable by one swipe).
  5. Untap Home → only "Email plumber". Assert `'Filter context: Laptop'` visible but disabled (`enabled: false` selector, AC4).
  6. Persistence (AC5): plain `launchApp` (NO clearState) → assert stack still filtered to "Email plumber".
  7. Standard `assertNotVisible: 'Unhandled'` / `'error occurred'` tail.
- Gates: `bun run lint:check`, `bun run typecheck`, `bun run test`, `bun run storybook:generate` (commit `storybook.requires.ts`).

## UX Notes

- Icon-only buttons (epics: "icon buttons"); labels live in a11y only. Calm styling — no badges/counts on buttons (ADHD principle: no overwhelm). Active state must read at a glance (filled circle, not just tint).
- Immediate re-filter, no spinner (<1s local filter target; live already via `useMemo`).
- No confirmation, no toast — context switching is a browsing gesture, not a mutation.

## Dependencies

- Epic 1 complete (card stack, card back context editing, quick add) — done.
- Epic 2 (2.3/2.4) should land first per epic ordering: they edit the same home surface (`app/index.tsx`, card-back wiring) and finalize which statuses drop out of the stack. Functionally 3.1 only *requires* 2.1's status semantics (already in `curateTasks`).
- Conflicts to watch: `app/index.tsx` is touched by 2.3/2.4 and every Epic 3 story — serialize.

## Out of Scope

- Mode/size filtering (3.2), urgent-context indicator dot (3.3), empty-state guidance copy/CTAs (3.4).
- Any change to `curateTasks` ordering (3.3).
- Editing task contexts (exists, card back 1.4).
