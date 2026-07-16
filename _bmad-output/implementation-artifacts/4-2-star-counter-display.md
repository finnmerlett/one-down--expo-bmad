# Story 4.2: Star Counter Display

Status: ready-for-dev
Spec written: 2026-07-16 (wave-based full-completion run)

## Story

As a user, I want to see my star count at all times, So that I can track my progress and feel accomplished.

FRs: 48 · UX-DR: 9 · UX component: StarCounter (P1)

Local-only story — totals are computed from the `star_activity_log` table created in 4.1. No external services.

## Acceptance Criteria

1. On any screen with the top bar (currently: home), the star box (top second-to-left) shows a star icon with the grand total AND the daily amount displayed together (e.g. `42` + `+5 today`).
2. When stars are earned (task completed / cut loose), the counter updates in real time (live query — no refresh, no navigation needed) and briefly highlights to mark the increment.
3. The counter announces changes to screen readers: `accessibilityLiveRegion="polite"` on the updating text, accessibilityLabel of the form `42 stars, 5 earned today`, hint `Tap to view star activity log`.
4. With zero history the counter shows `0` / `+0 today` (never an error or blank).
5. The daily amount is the signed sum of today's transactions (device-local midnight boundary); the grand total is the signed sum of all transactions.

## Implementation Plan

### Pure totals logic

- `apps/mobile/src/services/star-totals.ts` (NEW, pure):
  - `startOfLocalDay(now: Date): Date` — device-timezone midnight (4.3 reuses this for its Today filter).
  - `computeStarTotals(rows: Pick<StarActivityData, 'amount' | 'createdAt'>[], now: Date): { total: number; today: number }` — signed sums; `today` counts rows with `createdAt >= startOfLocalDay(now)`.

### Live data

- `apps/mobile/src/hooks/use-star-totals.ts` (NEW): `useLiveQuery(db.select({ amount, createdAt }).from(starActivityLog))` → `computeStarTotals(rows ?? [], new Date())`. Recomputing on render is fine (rows are small; a midnight rollover corrects on next render). Follows the `use-tasks.ts` pattern.
- IMPORTANT jest constraint: hooks touching `db` must stay OUT of any component that has stories/portable tests (expo-sqlite can't run under Node). The hook is called ONLY in the screen (`app/index.tsx`) and prop-drilled down — same as `useTasks`.

### Components

- `apps/mobile/src/components/app-shell/star-counter.tsx` (NEW, presentational) + `star-counter.stories.tsx`:
  - Props: `{ total: number; today: number; onPress?: () => void }`.
  - Layout: `Pressable` (44pt target, same border/rounded styling as the placeholder) → `HStack`: `StarIcon` (warning-400) + total (`text-sm font-medium`) + `+N today` (`text-xs text-typography-500`).
  - A11y: `accessibilityRole="button"`, `aria-label={`${total} stars, ${today} earned today`}`, `accessibilityHint="Tap to view star activity log"`, `accessibilityLiveRegion="polite"` on the wrapping element so total changes are announced (AC3). NOTE: the Pressable's aria-label collapses inner text for Maestro — assert the full label, not the digits (1.3 lesson).
  - Increment highlight: `useEffect` watching `total` — when it increases (skip first render via ref), set a `highlighted` state for ~900ms (`setTimeout`, cleared on unmount) that swaps the background class (e.g. `bg-warning-100`). State-driven class swap = instant cut, inherently Reduce Motion-safe; no Reanimated needed.
  - Stories: `Zero` (0/0), `WithStars` (42/5). Portable tests come free via composeStories.
- `apps/mobile/src/components/app-shell/top-bar.tsx`: replace `StarBoxPlaceholder` with `StarCounter`; new props `starTotals?: { total: number; today: number }` (default `{ total: 0, today: 0 }`) and `onStarPress?: () => void` passed through. Update `top-bar.stories.tsx`.
- `apps/mobile/src/components/app-shell/app-shell.tsx`: pass `starTotals` + `onStarPress` through to TopBar. Update `app-shell.stories.tsx` / `app-shell.test.tsx` if they reference the placeholder.
- DELETE `star-box-placeholder.tsx` + `star-box-placeholder.stories.tsx` (then `bun run storybook:generate`).
- `apps/mobile/src/app/index.tsx`: `const starTotals = useStarTotals()` → `<AppShell starTotals={starTotals} ...>`. Leave `onStarPress` unwired (4.3 adds it with the overlay guard).

## Analytics

None. Display-only — no domain mutation; screen views and taps are PostHog built-ins (seam scope guard). Do not add events.

## Testing Plan

- **Unit** — `star-totals.test.ts`: mixed-day rows split correctly around a fixed `now`; a row at exactly local midnight counts as today; yesterday 23:59 does not; negative amounts subtract from both sums; empty rows → `{ total: 0, today: 0 }`.
- **Stories/portable** — `star-counter.stories.tsx` (`Zero`, `WithStars`) render crash-free; a11y label asserted via the portable test if a behavior check is added (optional — label is load-bearing for Maestro).
- **Integration** — none new: the hook is a thin `useLiveQuery` + pure function (don't test the framework); the pure part is unit-covered.
- **Maestro** — `.maestro/16-story-4-2-star-counter.yaml` (renumber to next free prefix): launch clean → assert `0 stars, 0 earned today` → quick-add "Counter task" → card back → Start → Done → back on home assert `10 stars, 10 earned today` (live update, AC2 — no relaunch between award and assert) → `takeScreenshot: 4-2-star-counter`. Amount deterministic per 4.1 AC6 (no size/deadline → base 10).

Gates: `bun run lint:check`, `bun run typecheck`, `bun run test`, `bun run storybook:generate`; E2E batched per wave.

## UX Notes

- Persistent context against "where was I?" disorientation — the counter is always visible on top-bar screens; achievement framing (show what's done, never what remains).
- Compact copy: total is primary, `+N today` secondary/smaller. Always show both (FR48 — "displayed together").
- Highlight is a brief, calm pulse — no confetti, no counting animation for MVP (`animationsDeferred: true`).
- Known accepted deviation (from 2.1): the task running screen renders no top bar, so the counter isn't visible mid-task. AC1 scopes to "screens with the top bar"; the award moment itself is covered by the 4.1 toast. Do not add the top bar to the running screen in this story.

## Dependencies

- **4.1 Star Earning System** (required): `star_activity_log` table, migration, and award writes must exist for live totals and the E2E flow.
- 2.3 (transitively, via 4.1) for the completion path used in the E2E flow.

## Out of Scope

- Tap → activity log navigation (4.3 wires `onStarPress`; this story only exposes the prop).
- The activity log screen itself (4.3).
- Fancy award animation / star-flying motion (post-MVP polish; animations deferred).
- Top bar on the task running screen (revisit only if user feedback demands it).
