# Story 4.1: Star Earning System

Status: ready-for-dev
Spec written: 2026-07-16 (wave-based full-completion run)

## Story

As a user, I want to earn stars when I complete tasks, So that I feel rewarded and motivated to keep going.

FRs: 43, 44, 45, 46 (+66 wiring for the cut-loose amount) · UX-DR: 9 (centralized weights), 21 (toast)

Everything in this story is local-only (SQLite + pure functions) — no external services, no server. The PostHog seam stays no-op.

## Acceptance Criteria

1. When a task is marked complete (Done on the task running screen — the 2.3 path), a star award is calculated as: completion base + relative-urgency bonus (deadline proximity vs the user's other active tasks) + task-size bonus + early-completion bonus (days before deadline, capped), and persisted as a star transaction row in local SQLite.
2. The completion toast (created in 2.3) shows the actual amount earned, e.g. `+10 stars`, at the top of the screen.
3. Cutting a task loose (the 2.4 path) awards the smaller cut-loose amount, persists a transaction, and the "Released" toast includes the amount (e.g. `Released · +3 stars`).
4. All amounts come from centralized constants in `packages/shared/src/constants/star-weights.ts` — no magic numbers at call sites.
5. Star transactions store: `id` (uuid), `taskId`, `taskTitle` snapshot (so the log survives future task deletion), `action`, signed `amount` (negative supported for future reversals), `createdAt`.
6. A task with no size and no deadline earns exactly the base amount (deterministic — pinned by the E2E flow).
7. Award calculation is a pure, unit-tested function; persistence failures never block completion (log a warning, task still completes).

## Implementation Plan

### packages/shared (new star domain)

- `packages/shared/src/types/star.ts` (NEW):
  - `STAR_ACTIONS = ['task_completed', 'task_cut_loose', 'subtask_completed', 'subtask_deleted', 'triage_confirmed'] as const` + `StarAction` union (only the first two are emitted now; the rest reserve the type for Epics 6/7).
  - `StarActivityData` interface: `id: string; taskId: string | null; taskTitle: string; action: StarAction; amount: number; createdAt: Date`.
  - Re-export from `packages/shared/src/types/index.ts`.
- `packages/shared/src/constants/star-weights.ts` (NEW), re-exported from `constants/index.ts`:
  ```ts
  export const STAR_WEIGHTS = {
    completionBase: 10,
    urgencyBonusMax: 5,          // FR44 — relative deadline proximity
    sizeBonus: { quick_win: 0, big_time: 5 },  // FR45
    earlyBonusPerDay: 1,         // FR46
    earlyBonusMax: 3,            // FR46 "up to a limit"
    cutLoose: 3,                 // FR66 — deliberately < completionBase
    subtaskCompleted: 1,         // reserved, Epic 6
    triageConfirmed: 1,          // reserved, Epic 6
  } as const;
  ```
  Defaults are tunable in one place (UX-DR 9); OTA weight updates via sync are future scope.
- `packages/shared/src/schema-local/star-activity.ts` (NEW): `starActivityLog = sqliteTable('star_activity_log', ...)` mirroring `tasks.ts` conventions (`timestamp_ms` integers, `$type<StarAction>()`, AssertExact conformance check against `StarActivityData`). Export from `schema-local/index.ts` (NOT the `.` barrel).

### Migration

- From `apps/mobile`: `bunx drizzle-kit generate` → commits `drizzle/0002_*.sql` + `meta` updates + regenerated `migrations.js`. The app picks it up via the existing `useMigrations` gate; jest tests get it for free through `loadLocalMigrationsSql()`.
- `apps/mobile/src/lib/local-db.ts`: add `starActivityLog` to the drizzle `schema` object.

### Mobile services

- `apps/mobile/src/services/star-calculator.ts` (NEW, pure — architecture: most-testable layer):
  ```ts
  export interface StarBreakdown { base; urgencyBonus; sizeBonus; earlyBonus; total; }
  export function calculateCompletionStars(task: TaskData, activeTasks: TaskData[], now: Date): StarBreakdown
  ```
  - `base = STAR_WEIGHTS.completionBase`; `sizeBonus = task.size ? STAR_WEIGHTS.sizeBonus[task.size] : 0`.
  - Urgency (relative, FR44): let `D` = deadline-bearing tasks among `[task, ...activeTasks]` (dedupe by id; active = pending/in_progress). If the task has no deadline → 0. Else `sooner` = count in `D` with strictly earlier deadline; `urgencyBonus = Math.round(urgencyBonusMax * (D.length - sooner) / D.length)` — the soonest deadline on the list earns the full bonus.
  - Early (FR46): no deadline or `now > deadline` → 0 (no punishment, just no bonus). Else `min(floor((deadline - now) / 86_400_000) * earlyBonusPerDay, earlyBonusMax)`.
  - `total = base + urgencyBonus + sizeBonus + earlyBonus`.
- `apps/mobile/src/services/star-awards.ts` (NEW — follows the `task-edits.ts` service pattern, db injected for tests):
  - `awardCompletionStars(db: TasksDb, task: TaskData, now = new Date()): Promise<StarBreakdown>` — selects active tasks itself (callers don't need the full list), runs the calculator, inserts the transaction (`randomUUID()` from expo-crypto, `action: 'task_completed'`, `taskTitle: task.title`), `track('stars_awarded', ...)` after a successful write, returns the breakdown for the toast. Insert failure: `console.warn`, still return the breakdown (AC7).
  - `awardCutLooseStars(db: TasksDb, task: TaskData): Promise<number>` — flat `STAR_WEIGHTS.cutLoose`, `action: 'task_cut_loose'`, same shape.

### Wiring into Epic 2 paths

- Completion (2.3): in the Done handler (expected in `apps/mobile/src/app/task-running/[id].tsx` and/or a `completeTask` service in `services/task-edits.ts` — adapt to what 2.3 actually shipped): after `setTaskStatus(db, id, 'completed')`, `await awardCompletionStars(...)` and feed `breakdown.total` into the toast copy (`+${total} stars`). Order: complete first, award second — a failed award never blocks completion.
- Cut loose (2.4): in the cut-loose handler(s) (card back + running screen), award `awardCutLooseStars` and include the amount in the existing "Released" toast (`Released · +3 stars`). If 2.4 shipped a hardcoded placeholder amount or bare toast, replace it with this call — keep 2.4's toast mechanism, change only data flow + copy.
- Toast infra belongs to 2.3 (gluestack `Toast`, top placement). Do not build a second toast system; if it's somehow absent, install via `npx gluestack-ui add toast` (then restore configs — CLI damages them, see decisions log).

## Analytics

Add to `apps/mobile/src/lib/analytics/events.ts`:

```ts
/** Story 4.1 — a star transaction was recorded (amounts only, never task text). */
stars_awarded: {
  action: 'task_completed' | 'task_cut_loose';
  amount: number;
  base: number;
  urgency_bonus: number;
  size_bonus: number;
  early_bonus: number;   // all zero except amount/base for cut_loose
};
```

PII-safe: amounts and action only — `taskTitle` lives in the local row, never in the event (NFR-S3).

## Testing Plan

- **Unit** — `star-calculator.test.ts` (pure, non-trivial): base-only task (no size/deadline → exactly 10); big_time size bonus; urgency ranking with 3 deadline tasks (soonest → max, latest → smallest, no-deadline task → 0); early bonus per-day accrual + cap at `earlyBonusMax`; completion after deadline → early 0; total composition.
- **Integration** — `star-awards.test.ts` with `createTestDb(loadLocalMigrationsSql())`: `awardCompletionStars` inserts a row with correct action/amount/title snapshot/taskId; urgency uses only active tasks from the db (a completed sibling doesn't count); `awardCutLooseStars` row; returned breakdown matches the persisted amount.
- **Stories**: none — no new visual component (toast copy belongs to 2.3's surface).
- **Maestro** — `.maestro/15-story-4-1-star-earning.yaml` (renumber to next free prefix at implementation time; flows stay independent): `common/launch-app.yaml` → quick-add "Earn stars task" → open card back → Start → Done on the running screen → assert toast contains `+10 stars` (deterministic per AC6) → `takeScreenshot: 4-1-star-toast` at the toast moment → second leg: quick-add another task, cut loose from the card back, assert `Released` toast with `+3`.

Gates before commit: `bun run lint:check`, `bun run typecheck`, `bun run test`; E2E batched per wave.

## UX Notes

- Toast: brief (~2s), top of screen, factual and positive — `+10 stars` (completion), `Released · +3 stars` (cut loose). No breakdown in the toast; the log (4.3) is the detail view.
- Star awards should be announced to screen readers (UX a11y list) — gluestack Toast renders accessible text; verify with the toast's `accessibilityLiveRegion`/role rather than adding custom plumbing.
- Never negative framing: a post-deadline completion still earns base + size (just no early bonus).

## Dependencies

- **2.3 Complete a Task** (required): the Done → `completed` transition and the completion toast are the integration points.
- **2.4 Cut Loose a Task** (required for the cut-loose leg only): if scheduling forces 4.1 before 2.4, ship the completion leg + `awardCutLooseStars` unwired and note it; otherwise wire both.
- Epic 1 foundations (db, migrations, analytics seam) — done.

## Out of Scope

- Star counter display (4.2), activity log UI (4.3), done section (4.4).
- Card-front star value preview (Story 3.3 — it will reuse `calculateCompletionStars`; keep it pure and exported).
- Subtask/triage awards and reversals (Epic 6), star retraction on delete (Epic 7), server sync of `star_activity_log` (5.3), OTA weight updates.
