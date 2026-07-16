# Story 4.3: Star Activity Log

Status: ready-for-dev
Spec written: 2026-07-16 (wave-based full-completion run)

## Story

As a user, I want to see a history of all my star transactions, So that I can see what I've accomplished and feel proud.

FRs: 49 (star log) · UX-DR: 10 · UX component: StarActivityLog (P2)

Local-only story — reads the `star_activity_log` table (4.1). No external services.

## Acceptance Criteria

1. Tapping the star counter in the top bar opens the star activity log (full-screen pushed route, matching the task-list pattern).
2. The log shows a chronological list (newest first) of ALL star transactions; each entry shows: timestamp, action type label ("Completed" / "Cut loose"), task name, and signed star amount (`+10` / `−2`).
3. A "Today" / "All time" filter toggle switches the list between today's transactions (device-local midnight boundary, same rule as 4.2's daily total) and everything. Default on open: All time (AC2 — "all star transactions"). The active option is visually distinct and exposed via `accessibilityState={{ selected }}`.
4. With no transactions (in the active filter), a helpful empty state shows instead of a blank list — different copy for "no stars yet at all" vs "none today yet".
5. While the card-back overlay is open on home, the star counter is inert (same guard as the list icon — pushing a route under a live BackHandler overlay swallows hardware back).
6. Back arrow (and hardware back) returns to home.

## Implementation Plan

### Data

- `apps/mobile/src/hooks/use-star-activity.ts` (NEW, `use-tasks.ts` pattern): `useLiveQuery(db.select().from(starActivityLog).orderBy(desc(starActivityLog.createdAt), desc(starActivityLog.id)))` → `StarActivityData[]`. id tiebreaker keeps same-millisecond awards stable. Called ONLY from the route screen (jest constraint: components with stories never touch `db`).
- Today filtering happens in JS in the screen using `startOfLocalDay` from `services/star-totals.ts` (4.2) — row counts are small; no second query needed.

### Components

- `apps/mobile/src/components/star-log/star-activity-log.tsx` (NEW, presentational) + `star-activity-log.stories.tsx`:
  - Props: `{ entries: StarActivityData[]; filter: 'today' | 'all_time'; onFilterChange: (f) => void }`.
  - Filter bar: two `Pressable` segments ("Today" / "All time"), `accessibilityRole="button"`, `accessibilityState={{ selected }}`, active segment filled (e.g. `bg-background-100` + `font-semibold`), 44pt targets.
  - List: `FlatList` (styling parity with `task-list-view.tsx`: rounded rows, `gap-2 px-4 pb-8`). Row content (NOT wrapped in a labeled Pressable — rows aren't tappable, so inner text stays visible to Maestro):
    - Left `VStack`: action label + task title (`numberOfLines={1}`), below it the timestamp (`text-sm text-typography-500`).
    - Right: amount — `+10` in success-600 for positive; negative amounts (future reversals) neutral `text-typography-500`, never red/error (no negative framing).
  - Action labels: `task_completed` → "Completed", `task_cut_loose` → "Cut loose" (map covers all `STAR_ACTIONS`; reserved ones get sensible labels now so Epic 6 rows render without a code change: "Subtask done", "Subtask removed", "Info confirmed").
  - Timestamp format: today → time only (`toLocaleTimeString` short, e.g. `14:32`); older → `12 Jun, 14:32` (matches task-list deadline formatting conventions).
  - Empty states (AC4): `filter === 'all_time'` → "No stars yet" / "Complete or release a task and your stars will show up here."; `filter === 'today'` → "None today yet" / "Stars you earn today will appear here.".
  - Stories: `Empty`, `WithEntries` (mixed actions + an older-day entry), `TodayEmpty` (today filter, older entries exist).
- `apps/mobile/src/app/star-log.tsx` (NEW route, mirror `task-list.tsx`): `SafeAreaView` + header row (back arrow `aria-label="Back to home"`, title "Star activity") + filter state (`useState<'today' | 'all_time'>('all_time')`) + `useStarActivity()` + filtered entries → `<StarActivityLog />`.

### Wiring the tap target

- `apps/mobile/src/components/app-shell/star-counter.tsx` / `top-bar.tsx` / `app-shell.tsx`: `onStarPress` prop plumbing exists from 4.2 — no changes expected beyond wiring.
- `apps/mobile/src/app/index.tsx`: `onStarPress={openTask ? undefined : () => router.push('/star-log')}` (AC5 — identical inert-while-overlay guard as `onListPress`).

## Analytics

None. Opening the log is a screen view (PostHog built-in); the filter toggle is UI interaction, not a domain mutation — per project precedent (1.5: "only mutations get domain events"), no new events.

## Testing Plan

- **Unit** — none new: the today-filter reuses `startOfLocalDay` (unit-tested in 4.2); action-label/timestamp mapping is a trivial lookup (don't test pass-throughs).
- **Stories/portable** — the three stories render crash-free via composeStories; `WithEntries` doubles as the visual reference for row layout.
- **Integration** — none new: the hook is a thin ordered `useLiveQuery` (framework); ordering desc is drizzle's `orderBy` (framework).
- **Maestro** — `.maestro/17-story-4-3-star-log.yaml` (renumber to next free prefix): launch clean → tap star counter (a11y label `0 stars, 0 earned today`) → assert "Star activity" + "No stars yet" empty state → back → quick-add "Log me task" → card back → Start → Done → tap star counter → assert "Completed", "Log me task", `+10` visible → tap "Today" → entry still visible → `takeScreenshot: 4-3-star-log` → back → home intact.

Gates: `bun run lint:check`, `bun run typecheck`, `bun run test`, `bun run storybook:generate`; E2E batched per wave.

## UX Notes

- Simple scrollable list — full-screen push (chosen over bottom sheet: matches the existing task-list route pattern and keeps navigation uniform: system back always works).
- Achievement framing: this screen is the "feel proud" surface — earned rows lead with the action + task name; amounts are the accent, not the headline.
- Task name in rows comes from the `taskTitle` snapshot stored on the transaction (4.1) — the log stays intact if tasks are later deleted (Epic 7). Local display only; titles never enter analytics (NFR-S3).
- No grouping, search, pagination, or pull-to-refresh (live query keeps it current) for MVP.

## Dependencies

- **4.1 Star Earning System** (required): table + award writes (E2E needs a real transaction).
- **4.2 Star Counter Display** (required): the tap target (`StarCounter` + `onStarPress` plumbing) and `startOfLocalDay`.
- 2.3 (transitively) for the completion path used in the E2E flow.

## Out of Scope

- Spend/negative transactions UI beyond rendering signed amounts (star shop is post-MVP).
- Subtask/triage entries actually appearing (Epic 6 emits them; labels are pre-mapped here).
- Filtering by action type, date ranges beyond today/all-time.
- Any change to the done section or task list (4.4).
