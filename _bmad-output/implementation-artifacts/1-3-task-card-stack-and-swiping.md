# Story 1.3: Task Card Stack & Swiping

Status: done
Date: 2026-06-11
Mode: BMad-lite autonomous run (risky tier: 2-lens review panel + on-device E2E)

## Story

As a user, I want to see my tasks as a stack of cards and drag through them, So that I can browse tasks one at a time in a focused way.

## Acceptance Criteria

1. Tasks display as a card stack: top card fully visible, next card visible underneath, 3rd faintly visible at bottom
2. Each card shows task title, size tag (if set), and context badges
3. Dragging: card follows the finger position
4. Release > threshold: card flies off-screen in dragged direction; next card becomes top; 3rd-next fades in
5. Release < threshold: card springs back to original position
6. Swiping past the last card wraps around to the first — continuous cycle, no dead end
7. Adding/removing tasks updates the cycle WITHOUT resetting the current position
8. Zero tasks → empty state message (only when genuinely no tasks exist)

## Implementation decisions (planned)

- **Curation pure function** `curateTasks(tasks, activeContexts?)` in `services/curation.ts`: filter `status === 'pending'`, optional context-overlap filter, sort deadline-soonest-first (null deadlines last) then `createdAt` desc. Signature stable — Story 3.3 swaps in weighted scoring behind it.
- **Reanimated 4 modern API only**: `Gesture.Pan()` from react-native-gesture-handler, `useSharedValue`/`useAnimatedStyle` worklets, `scheduleOnRN` from react-native-worklets (NOT deprecated `runOnJS`). No manual worklets babel plugin (preset provides it).
- `GestureHandlerRootView` added at app root (`_layout.tsx`) — required for Gesture API.
- Gas-town reference physics (worked on-device): release threshold `SCREEN_WIDTH * 0.35`, fly-off to `±SCREEN_WIDTH * 1.2` via `withTiming` 250ms, snap-back via `withSpring(0, { damping: 20, stiffness: 200 })`. Background cards (i = 1, 2): `scale 1 − i*0.05`, `translateY i*12`, opacity 0.7/0.4, `pointerEvents="none"`, rendered in reverse for z-order.
- **Wrap-around by task id, not index**: track `topTaskId`; derive index via `findIndex` in the current curated list (fallback 0 if the id vanished). Advance = id of `(index + 1) % length`. Satisfies AC7 (list changes don't reset position).
- Card content: title + gluestack Badge for size tag (`quick_win` → "Quick win", `big_time` → "Big time") + context badges from the JSON-array `contexts` column. Badge component installed per-story via `bunx gluestack-ui@3.0.11 add badge --use-bun` (config diff-review after CLI run — known damage risk).
- A11y per UX spec: card announces "Task: {title}. Card {X} of {Y}". Maestro anchors on task titles.
- Home screen: interim ScrollView list replaced by CardStack; empty state retained for zero tasks.
- Document wrap-around index logic in architecture.md (epic note requirement).

## Tasks

- [x] Deps: gluestack Badge via CLI (clean run, no config damage this time)
- [x] `services/curation.ts` + 7 unit tests (filter, context overlap, deadline/createdAt ordering, no-mutation)
- [x] `components/card-stack/task-card.tsx` (front: title, size tag, context badges) + 2 stories
- [x] `components/card-stack/card-stack.tsx` (Gesture.Pan, fly-off/snap-back, 3-card window, wrap-around by id) + 2 stories
- [x] `GestureHandlerRootView` in `_layout.tsx`
- [x] Home screen: interim list replaced with CardStack over `curateTasks` (task_created flow + empty state kept)
- [x] Jest: 4 portable-story tests; worklets jest-resolver composed with RN resolver + RNGH jestSetup
- [x] Maestro `04-story-1-3-card-stack.yaml` written (seed 2 tasks → swipe advances → wrap-around → snap-back) — RUN pending E2E
- [x] architecture.md: wrap-around index note added (Client Services section)
- [x] Gates: lint:check, typecheck, test (27/27)
- [x] 2-lens review panel: both approve-with-fixes, all fixes applied (see below)
- [x] E2E release build → Maestro 01/02/03/04 all green on-device (twice: post-fixes + post-peek-tune) → screenshot `1-3-card-stack.png`
- [x] Screenshot-caught: background cards were fully hidden (scale shrink out-ran translateY on a tall card) → stagger bumped to depth*30; peek verified visually

## Dev Notes

- **Jest + worklets**: react-native-worklets ships a jest resolver (strips `.native.*` extensions for its own imports so mocks resolve). jest-expo's preset installs `@react-native/jest-preset/jest/resolver` — composed both in `apps/mobile/jest-resolver.js`. Plus `react-native-gesture-handler/jestSetup.js` in setupFiles. No reanimated-specific setup needed beyond that.
- **Swipe-advance is jest-untested by design** — simulating worklet callbacks tests the mock, not the UI thread. On-device Maestro flow 04 covers AC3–AC7.
- **Per-card shared values (review fix)**: the top card is a `SwipeableTopCard` keyed `${task.id}:${cycle}` owning its own `useSharedValue`s — born zeroed each mount, so there is no JS-thread value reset racing the Fabric commit (review found the old `advance()` reset could flash the dismissed card back at center for 1+ frames under load). The cycle counter also gives the single-card self-wrap a clean remount, and kills the Story-1.4 trap where a card deleted mid-drag would leave its successor offset.
- **Accepted deviations (recorded, not bugs)**: flick velocity is ignored — dismissal is position-only at 0.35 × screen width (UX spec: no fancy physics); pre-first-swipe the deck tracks "slot 0" not a card id, so a new front-curated task replaces the visible top card — position-keeping (AC7) starts after the first swipe.
- **Stack motion (user-requested post-review)**: every card animates to its slot. Background cards are `StackedCard`s driving transform/opacity from a single `progress` shared value (`withTiming` toward `depth`, mounting at `depth + 1`): on advance depth-2 rises/brightens into depth-1, the incoming 3rd card rises in while fading (implements AC4's "fades in" properly), and a card pushed back down recedes smoothly. The promoted top card's entrance (depth-1 position → full size) comes from the SwipeableTopCard mount animation.
- **Two-layer fade**: card fades are content-opacity over a SOLID white base (base only fades in the entry region progress 2→3) — whole-card opacity made lower cards show through each other (user-reported). Background transform order is `[translateY, scale]` (translate unscaled) so entrance start positions match resting positions exactly.
- **Story 1.4 watch-outs from review**: depth 1→0 promotion remounts TaskCard (element type changes View→Animated) — a flipped card would reset to front on advance; pan has no `activeOffsetX`, so coordinate tap-to-flip vs pan activation (e.g. `Gesture.Exclusive`).
- Maestro: card containers are `accessible`, so flows assert the full label `Task: {title}. Card {X} of {Y}`; flow 03's old raw-title assertion updated to the label format. Post-save sync point = title placeholder reappearing ('What needs doing?').

### Review findings & resolutions (2-lens panel: gesture/worklets + general)

Both lenses: **approve-with-fixes**, no blockers. Applied:

1. (gesture) advance() cross-thread reset race → SwipeableTopCard refactor with per-card shared values + cycle-keyed remount (also fixes mid-drag-removal trap and single-card stranding).
2. (gesture) Misleading threshold comment ("more than half") → reworded; 0.35 is the story-tuned value.
3. (gesture) `window` shadowed the global → renamed `stackWindow`; latest-ref mutation moved render → useEffect.
4. (general) AC7 had zero test coverage → flow 04 now adds a task mid-browse and asserts the top card holds position ('Card 3 of 3').
5. (general) AC8 strict reading → empty state keyed off `tasks.length`; curated-empty-with-tasks gets its own message instead of a blank screen (unreachable until Epic 2).
6. (general) Flow 03 asserted the raw title text, which the accessible container may hide from UiAutomator → switched to the card label format; post-save placeholder sync added to flow 04 seeding.
7. (general) CONTEXT_LABELS → `Record<TaskContext, string>` for union-drift protection.

Confirmed correct by review (no action): worklet auto-workletization via babel-preset-expo, scheduleOnRN usage, mid-animation re-grab behavior, GestureHandlerRootView placement, no competing scroll recognizers, curateTasks comparator + signature stability, jest resolver composition identity.
