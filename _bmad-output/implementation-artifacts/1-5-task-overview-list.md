# Story 1.5: Task Overview List

Status: done
Date: 2026-06-11
Mode: BMad-lite autonomous run (routine tier: single reviewer)

## Story

As a user, I want to see all my tasks in a scrollable list, So that I can get a complete view of my task backlog.

## Acceptance Criteria

1. Tapping the task list icon in the top bar opens the task list view: all active tasks in a scrollable list
2. A placeholder "done" section header sits at the top (populated in Epic 4)
3. Tapping a task in the list opens the card back view in an isolated full-screen view with a back button to return to the list
4. With no tasks, an empty state guides the user to add tasks

FRs: 30 · UX-DRs: 14 (basic list view)

## Implementation decisions

- **Real routes, not overlays**: `/task-list` and `/task/[id]` are Expo Router screens (first push routes in the app) — the navigator gives hardware back, iOS swipe-back, and the isolated full-screen detail (AC3) for free.
- **`TaskListView` is presentational** (tasks + onTaskPress in, no router/db) — portable-story testable like every other component. Routes stay thin.
- **Done placeholder always frames the list** (AC2): `ListHeaderComponent` renders the "Done" header + "Completed tasks will land here." note plus the "To do" header; `ListEmptyComponent` renders the add-tasks guidance (AC4) under it.
- **Rows**: title + muted meta line (size · contexts · deadline, same locale date format as the card back), chevron affordance, a11y label `Open task: ${title}` — deliberately distinct from the card front's `Task: X. Card N of M` so Maestro selectors can't collide.
- **Detail screen reuses CardBack directly** (per the 1.4 design note — it's overlay-agnostic). New optional `backLabel` prop gives it a contextual a11y label ('Back to task list') without touching overlay behavior.
- **Flush-on-pop via `beforeRemove`** (review fix): the navigation listener fires synchronously before removal for the back button, Android hardware back, AND iOS swipe-back — one flush path for all three. `applyTaskPatch` is module-scoped fire-and-forget, so the write survives the unmount.
- **`applyTaskPatch` extracted** to `services/task-edits.ts` — the inline auto-save + `task_edited` tracking previously inline in HomeScreen, now shared by both card-back surfaces (home overlay + list detail). No new analytics event: screen views are PostHog built-ins (per the analytics seam), and the list adds no new mutations.
- **TopBar/AppShell stay navigation-free**: `onListPress` threads through props; HomeScreen owns the `router.push`. List icon goes inert while the home overlay is open (same guard as the FAB) — review fix; pushing a route over the open overlay would leave its BackHandler swallowing hardware back from the pushed screen.
- Newest-first ordering straight from `useTasks` (matches capture order; curation only shapes the stack, not the backlog list).
- `useTasks` returns `[]` before the live query's first emit, so the detail screen renders null while loading; a genuinely missing id can't happen until Epic 7 (no deletes) and no deep links are exposed.

## Tasks

- [x] `TaskListView` component (done-section placeholder, task rows, empty state) + 2 stories + 4 portable-story tests
- [x] `app/task-list.tsx` route (live query, header with back)
- [x] `app/task/[id].tsx` full-screen detail reusing CardBack (flush-on-pop, double-pop guard, contextual back label)
- [x] TopBar list icon wired (`onListPress` through AppShell, navigation-free components)
- [x] Analytics: none needed (screen views are PostHog built-ins; no new mutations)
- [x] Maestro `06-story-1-5-task-list.yaml` (empty state → add → list → detail edit persists → system back)
- [x] Gates: lint:check, typecheck, test (43/43); storybook:generate
- [x] Review (single reviewer, fresh context): approve-with-fixes, fixes applied (below)
- [x] E2E: full suite 6/6 green on fresh release build (incl. new flow 06)
- [x] Screenshot `1-5-task-list.png` — done placeholder, To do rows newest-first, meta line (Quick win · Home) proving detail edits persist

## Dev Notes

- **`beforeRemove` > BackHandler for route screens**: a screen that must do work before it pops (flush, confirm) should use `navigation.addListener('beforeRemove', ...)` — it covers back button, hardware back, and iOS swipe-back in one synchronous hook. BackHandler-style interception is only right for non-route overlays (1.4's card back) that the navigator doesn't know about.
- **Pushed routes don't unmount the screens beneath** (native stack detaches views, keeps the React tree): any global subscription on a lower screen (the overlay's BackHandler) stays live. Don't allow navigation away while such an overlay is open — guard the triggers.
- **Maestro full-string regex semantics**: `assertNotVisible: 'First listed task'` passes against 'Renamed listed task' (no full match); prefixed row labels (`Open task: X`) keep list selectors from colliding with card-front labels.
- Story 4.4 populates the Done section; the header + note in `TaskListView`'s `ListHeaderComponent` is where it lands.

### Review findings & resolutions (single reviewer: approve-with-fixes, no blockers)

Applied:

1. (should-fix) List icon active while the home card-back overlay is open — pushed screen's hardware back got swallowed by the overlay's still-mounted BackHandler → `onListPress` now inert while open (mirrors FAB guard).
2. (should-fix) iOS swipe-back / programmatic pop skipped `flush()` (BackHandler is Android-only) → replaced with a `beforeRemove` listener; flush is the listener's job, close() just pops.
3. (should-fix) Double tap on 'Back to task list' double-popped (detail + list) → once-guard in `close()`.

Accepted / not done:

4. (nit) Deadline formatting duplicated between card back and list row — left inline; extract a shared helper when the third surface arrives (Epic 6 triage).
5. (nit) Malformed deep link to `/task/<bad-id>` renders a blank screen — accepted: no deep links are exposed pre-Epic 8, and loading vs missing can't be distinguished without changing `useTasks`. Revisit with Epic 7 deletes.

Confirmed correct by review (no action): flush-then-pop write safety (module-scoped patch), faithful extraction of `applyTaskPatch`, Maestro selector/label matching incl. regex edge cases, stable header/empty components (no remount churn), AC coverage, conventions.
