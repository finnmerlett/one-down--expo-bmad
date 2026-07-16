# Story 3.3: Stack Curation Algorithm

Status: ready-for-dev
Date: 2026-07-16
Mode: spec for wave-based autonomous run (see decisions-log 2026-07-16)

## Story

As a user, I want the card stack to intelligently surface a mix of tasks, So that I see what matters without the stack feeling repetitive or overwhelming.

FRs: 7, 11, 15 · Epics note: the algorithm is an initial best-guess, refined via dogfooding; it lives in `services/curation.ts` as a pure, testable function. QA baseline: purposeful, momentum-building (quick wins early), urgent/important surfacing in the mix; randomness expected, never arbitrary.

## Acceptance Criteria

1. With multiple tasks matching the current filters, the stack order comes from weighted scoring (urgency + importance + controlled randomness) with a variety pass — NOT a strict deadline sort. Concretely (all thresholds are exported tunables):
   a. **Momentum:** if any `quick_win` task passes the filters, the TOP card is the highest-scoring quick win (deterministic, E2E-testable; also pre-satisfies 7.3's "first card after absence is a quick win").
   b. **Urgency surfaces:** a task with a deadline within 48h always ranks in the top 3 (weights make urgency dominate jitter; asserted by test, not by special-case code).
   c. **Variety:** never 3 consecutive same-`size` cards when a differently-sized task is available later in the order.
   d. **Controlled randomness:** per-task jitter is a pure function of `(seed, task.id)` — same seed ⇒ identical order (testable); new app session ⇒ new seed ⇒ fresh mix; adding/removing a task does NOT re-jitter the others (no reshuffle under the user's fingers mid-browse).
2. Every card front shows its potential star value (star icon + number); more urgent/larger ⇒ higher value (FR11). Value = `potentialStars(task, activeTasks, now)` from the new star-calculator service, weights from shared `star-weights.ts`. The preview must equal what 4.1 later awards MINUS the early-completion bonus (unknowable until completion) — preview and award share one formula.
3. Context buttons that are NOT currently active show a subtle indicator dot when they have urgent matching tasks (deadline within 48h or overdue) — only while a context filter is active (unfiltered stack already shows urgent tasks) (FR15).
4. `curateTasks` stays a pure function; existing behaviors preserved: statuses browsable = `pending`/`in_progress`; context/size filter semantics from 3.1/3.2; CardStack's id-tracked wrap-around and keyed top-card remount untouched (architecture: Story 3.3 must preserve both).

## Implementation Plan

No DB/schema change, no migration.

**Modify: `apps/mobile/src/services/curation.ts`** (+ `curation.test.ts`)
```ts
export interface CurationOptions { now?: Date; seed?: number }   // defaults: new Date(), 0
export function curateTasks(tasks, filters?: StackFilters, options?: CurationOptions): TaskData[]
```
- Filter step unchanged (status, contexts, size).
- Exported tunables (SCREAMING_SNAKE_CASE, one block, commented "dogfooding dials"): `URGENCY_HORIZON_DAYS = 14`, `URGENT_WINDOW_HOURS = 48`, `WEIGHT_URGENCY = 0.55`, `WEIGHT_IMPORTANCE = 0.2`, `WEIGHT_JITTER = 0.25`, size-importance map `{ big_time: 1, quick_win: 0.35, unsized: 0.5 }`.
- `deadlineUrgency(deadline, now): number` — no deadline ⇒ 0; else `clamp01(1 - daysUntil / URGENCY_HORIZON_DAYS)` (overdue clamps to 1). Deliberately separate from star-calculator's rank-based `relativeUrgencyBonus`: ordering uses absolute proximity, rewards use relative rank (FR44) — comment this so nobody "unifies" them.
- `jitter(seed, id)` — tiny string hash (e.g. FNV-1a over `` `${seed}:${id}` ``) mapped to [0,1). No Math.random anywhere.
- `score = WEIGHT_URGENCY*urgency + WEIGHT_IMPORTANCE*sizeImportance + WEIGHT_JITTER*jitter`; sort desc, tiebreak `createdAt` desc then `id` (fully deterministic).
- Post-passes in order: (1) momentum — move best quick win to front if slot 0 isn't one; (2) variety — greedy rebuild: when the last two emitted share a size and a different-size task remains, emit the nearest different-size task next.
- Add `urgentContexts(tasks, now): Set<TaskContext>` — union of contexts of browsable tasks with deadline within `URGENT_WINDOW_HOURS` or overdue.

**New: `apps/mobile/src/services/star-calculator.ts`** (+ `.test.ts`)
- Pure, no React (architecture). Exports:
  - `relativeUrgencyBonus(task, activeTasks): number` — 4.1's FR44 formula, implemented here first: `D` = deadline-bearing tasks among `[task, ...activeTasks]` deduped by id (active = pending/in_progress); task without deadline ⇒ 0; else `sooner` = count in `D` with strictly earlier deadline, bonus = `Math.round(STAR_WEIGHTS.urgencyBonusMax * (D.length - sooner) / D.length)` (soonest deadline earns the full bonus).
  - `potentialStars(task: TaskData, activeTasks: TaskData[], now: Date): number = STAR_WEIGHTS.completionBase + relativeUrgencyBonus(task, activeTasks) + (task.size ? STAR_WEIGHTS.sizeBonus[task.size] : 0)`.
- **Contract with 4.1 (its spec already plans this file):** 4.1 adds `calculateCompletionStars(task, activeTasks, now)` = the `potentialStars` components + early-completion bonus, reusing `relativeUrgencyBonus` — one formula, no drift between preview and award. Leave a pointer comment.

**Extend: `packages/shared/src/constants/star-weights.ts`**
- Created by Story 2.3 (`taskCompletion`, `cutLoose`, `subtaskCompletion`, `triageConfirmation`). Extend ADDITIVELY with the bonus keys exactly as 4.1's spec plans them (so 4.1 finds them pre-existing): `completionBase: 10`, `urgencyBonusMax: 5`, `sizeBonus: { quick_win: 0, big_time: 5 }`. Do not rename/remove 2.3's keys (its toast reads `taskCompletion`; 4.1 reconciles the base-amount duplication when it rewires the toast to the real award pipeline). All reward tuning happens ONLY in this file (epics note: centralized, OTA-updatable later).

**Modify: `apps/mobile/src/components/card-stack/task-card.tsx`** (+ `.stories.tsx`)
- Card front gains a star-value chip in the badge row (or top-right corner): gluestack `Icon as={StarIcon}` (built-in) + `Text` count. Accept the computed number as a prop (`starValue: number`) so the component stays presentational; compute in the stack/home layer.
- Stories: quick win vs big time vs near-deadline values.

**Modify: `apps/mobile/src/components/card-stack/card-stack.tsx`**
- Accept `getStarValue: (task: TaskData) => number` from home (home closes over the browsable list for the relative-urgency input) and pass the number to each `TaskCard`. Extend the top-card accessibility label to `Task: <title>. Worth <n> stars. Card <i> of <m>` — the value must be announced (TalkBack) and Maestro-assertable (accessible containers hide inner text — 1.3 lesson).
- **BREAKING for E2E selectors:** every existing flow matching `Task: <title>. Card i of j` full-string (04, 05, 06, 07, and Epic 2's 08–10) must be updated to the new label in the same commit. Budget for this; run the FULL Maestro suite.

**Modify: `apps/mobile/src/components/stack-filters/context-toggle-bar.tsx`** (+ stories)
- New prop `urgentContexts: ReadonlySet<TaskContext>`; render a small dot (absolute, top-right of the icon, `bg-warning-400` — calm, not red) on buttons that are in `urgentContexts`, NOT active, while ≥1 context is active. A11y: append `, has urgent tasks` to the button label when shown.

**Modify: `apps/mobile/src/app/index.tsx`**
- Session seed: `const [seed] = useState(() => Date.now() % 2 ** 31)` — stable across re-renders/live-query emits (order can't shuffle mid-browse), fresh per session. Pass `{ now, seed }` to `curateTasks`; `now` from render time is fine (urgency granularity is days).
- Compute `urgentContexts` memoized; pass to the bar. Memoize `getStarValue = (task) => potentialStars(task, browsable, now)` where `browsable` is the unfiltered browsable set (relative urgency ranks against ALL active tasks, not the filtered stack — matches 4.1's award input).

## Analytics

No new events. Curation is passive computation (no user action); a per-recompute event would be a hot-path, valueless emission (logging-best-practices). Star awards are 4.1's events; context taps are covered by 3.1's `context_toggled`.

## Testing Plan

- **Unit — `curation.test.ts`** (the bulk of this story; fixed `now` + seeds throughout):
  - momentum: mixed sizes ⇒ slot 0 is a quick win; all-big_time ⇒ no crash, best big task first; `size: 'big_time'` filter ⇒ rule inert.
  - urgency: deadline-in-24h task lands top-3 across several seeds (loop 10 seeds, property-style).
  - variety: 5 quick + 1 big ⇒ no 3-run of quick wins before the big task is emitted.
  - determinism/stability: same seed twice ⇒ identical order; different seed ⇒ different order for a crafted set; adding one task preserves relative order of the untouched tasks.
  - `urgentContexts`: within-48h and overdue included, 3-day-out excluded, completed excluded, untagged urgent task ⇒ empty set contribution.
  - existing filter tests updated to the (filters, options) signature.
- **Unit — `star-calculator.test.ts`:** unsized/no-deadline ⇒ `completionBase` (10); big_time ⇒ 15; relative urgency — soonest of 3 deadline tasks gets full `urgencyBonusMax`, latest gets the floor share, deadline-free peers don't dilute; single deadline task ⇒ full bonus; rounding boundaries.
- **Portable stories:** task-card star chip states; context-toggle-bar WithUrgentDot story.
- **No integration test** — pure functions + presentational changes only.
- **Maestro `.maestro/13-story-3-3-curation.yaml`** (renumber to next free sequence):
  1. Launch clean; quick-add "Tiny task" (card back → `Size: Quick win`) and "Huge task" (`Size: Big time`).
  2. Momentum (AC1a): assert top card `'Task: Tiny task. Worth 10 stars. Card 1 of 2'` — deterministic despite the random session seed (no deadlines ⇒ no urgency bonus).
  3. Star values (AC2): swipe → assert `'Task: Huge task. Worth 15 stars. Card 2 of 2'` (big_time size bonus). **takeScreenshot** (key moment: star chip on card front).
  4. Update all prior flows' card-label selectors in the same change; full suite must be green.
  5. Standard error-free tail.
  - The urgent-context dot (AC3) is NOT E2E-drivable — no UI sets deadlines until Epic 6 (card back shows deadline read-only). Covered by unit + story; note this in the flow header comment.
- Gates: `bun run lint:check`, `bun run typecheck`, `bun run test`, `bun run storybook:generate`, full `bun run test:e2e:fresh`.

## UX Notes

- Star chip: small, positive, on the badge row — a reward preview, not a priority label. No red, no "overdue" framing anywhere (urgency shows as value, calm-over-urgent principle).
- Urgent dot: subtle single dot, no count (UX: "subtle indicator"). Warning tint, not error.
- Stack must FEEL purposeful: quick win first, urgent items early, sizes interleaved — the QA baseline from epics is the review yardstick, verified via the unit-test properties + a manual dogfood pass on the emulator screenshot.

## Dependencies

- **3.1 + 3.2 (hard):** filters signature, context bar (dot prop), mode interplay for the momentum rule.
- **2.3 (hard):** creates `star-weights.ts` (this story extends it) and the Epic 2 flows whose selectors change here.
- **4.1 (forward contract):** its spec plans to create `star-weights.ts` bonus keys and `star-calculator.ts` — after 3.3 both pre-exist; 4.1 extends (`calculateCompletionStars`, early bonus) rather than creates. Flag this at 4.1 kickoff.
- Deadline data path exists (schema column, done) but no editing UI until Epic 6 — urgency logic ships dormant-but-tested.
- Conflicts: `.maestro/*` label-selector churn touches flows owned by Epics 1–2; `task-card.tsx`/`card-stack.tsx` also touched if Epic 2 stories are still in flight — schedule after Epic 2 ships.

## Out of Scope

- Awarding stars / transactions / toasts (4.1), star counter (4.2).
- Deadline editing UI + card-front deadline indicator (Epic 6 / triage).
- Stale/avoided-task inputs to scoring (Epic 7 thresholds), AI re-curation (Epic 6).
- Persisting or syncing the seed; server-tunable weights (future OTA sync).
