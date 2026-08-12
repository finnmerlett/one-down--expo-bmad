# 9.5 — Further alterations & other items (2026-08-12 autonomous session)

Finn's raw notes (2026-08-11) reworded into a task list. Run ground rules: Finn is away —
best-guess every ambiguity, record the guess here, add/adjust e2e flows, work all the way
through, commit per coherent chunk.

## Task list

| # | Item | Status |
|---|------|--------|
| 1 | E2E seeding via sync accounts (runtime optimization) | DONE (suite verifying) |
| 2 | Bonus-aura ripple: restore the design maths (negative pause clips the cycle) | code DONE |
| 3 | Bonus-aura ripple: remove the hard inner edge | code DONE |
| 4 | AI general learnings → editable notes section in settings + prompt updates | code DONE |
| 5 | Smallest-step nudge: gentle ease push-up instead of layout jump | code DONE |
| 6 | Triage entry button always beside quick-add when queue non-empty | code DONE |
| 7 | Context notification dots persist while the context is selected | code DONE |
| 8 | Triage size corrections feed the AI's general learnings | code DONE |
| 9 | Deadline date picker themed blue when opened from triage | code DONE |
| 10 | Blueprint card flies straight up on Save and next | code DONE |
| 11 | Queue-clear +5 pays via a "Triage cleared" reward toast | code DONE |
| 12 | Deadline bonus window = 2–4 days before deadline (today = 0 days; <2 days → none) | code DONE |
| 13 | Bug: edit pencil on bonus cards routes to the doing page | DONE in 9.4 |
| 14 | Doing page: "What should be different" box aligns to keyboard (not the notes box) | code DONE |
| 15 | Criticality attribute: chill / important / critical | code DONE |
| 16 | Hidden urgency metric drives bonus assignment; ≤2 live bonuses at any time | code DONE |

## Item details & decisions

### 1 · E2E seeding via sync accounts
Original ask: seed tasks through the account-sync stack so flows sign in and pull exactly
the state under test — faster, no duplication, and fixture states the UI can't produce
(skip counts, completed sets, review flags, old timestamps).

**Design (decided this session):**
- `apps/server/scripts/seed-e2e-accounts.ts` — one supabase-local account **per converted
  flow** (`e2e-<slug>@test.local` / `seed-password-123`), wipe + insert fixtures per run.
  Per-flow accounts because Maestro runs flows sequentially against mutable server state —
  a shared account would leak one flow's mutations into the next.
- `common/sign-in-seeded.yaml` — parameterized sign-in subflow (env `EMAIL`); each flow
  then waits for its first expected card (the pull is the wait target).
- `scripts/maestro-test.sh` seeds before every run (skip with `SKIP_E2E_SEED=1`).
- Sheet auto-open hazard: home consumes its auto-open 4 s after mount
  (`app/index.tsx:130-136`); the sign-in journey always takes >4 s, so the Right-now sheet
  never pops when the pulled tasks land. No dismiss step needed after sign-in.
- Stars/subtasks are LOCAL (never sync) — fixture-completed tasks carry **no** star
  transactions, so flow 24 still completes task A through the UI (the archive warning
  keys off `netStarsByTask`, not status).
- `reviewFlags` fixture shape must be `{"inferred":["size","contexts"],"missingDeadline":true}`
  — `parseReviewFlags` drops unknown keys.

**Converted flows (13):** 04 (partial — gamma still added via UI: mid-browse add IS the
AC), 06, 09-2-3, 10-6-4 (council seeded `skipCount=4` — kills the 10-swipe loop), 11, 12,
13, 15, 18 (biggest win: 3 UI completions + swipe-hunting deleted), 23 (fixture review
flags replace the brain-dump AI leg), 24 (fixtures only; completion stays UI), 25
(`skipCount=4` + 2 swipes replace 10), 26.
**Kept as-is:** 01/02/03/05/07/08×2/09-6-3/10-2-4/14/16/17/19/20/21/22/27/51/52/53 —
task creation is the test subject, only one trivial task, or the auth/sync machinery
itself is under test.

### 2+3 · Ripple maths + hard inner edge
Design reference recovered (`designs/v1.5-implementation-spec.md:19-21`,
`designs/v1.5/One Down v1.5.dc.html:1600-1651` `syncRipple()`):
- Cycle = `dur + pause` = 7.5 + (−4.8) = **2.7 s**; `travel = total/dur = 0.36` — only the
  first 36 % of the full expansion ever renders (the "negative gap" that was missed; the
  current impl instead plays a 5.3 s dead delay then a full 2.2 s sweep).
- Geometry: blur 3→70 px, spread 0→70 px along `cubic-bezier(.22,.55,.5,.92)` (eased `e`);
  opacity uses **raw** t: ramp to α=.36 at 5 % of the full expansion, linear fade to 0 at
  25 % — so the visible ripple dies before the clipped tail.
- Static glow is a **single** layer `0 0 9px 1px rgba(185,138,50,.5)` (current code has an
  invented two-layer halo).
- Hard inner edge root cause: current impl adds a `scale(1+p·0.1)` transform the design
  never had — the shadow-casting rect edge moves out past the card face, exposing the
  shadow's hard start. Fix: kill the scale, animate blur+spread only; the card face then
  covers the rect boundary for the whole cycle.

### 4 · AI general learnings (best-guess scope)
- New local preference `ai.generalNotes` (bullet-point text) in the existing `preferences`
  key-value table; editable Textarea section on the settings screen.
- Threaded into task-scoped AI calls as an optional field: mobile payloads → zod inputs
  (`ai.ts`, truncate-never-reject like `breakdownContextField`) → `TaskPromptContext` →
  `buildTaskContents` + fake provider.
- Refine prompt gains an optional `generalLearning` output: "only when the feedback
  reveals a durable fact about the USER in general (not this task) that isn't already in
  the general notes and wouldn't be assumed by default; otherwise null." Client appends
  it as a bullet to `ai.generalNotes`.
- Learnings are device-local (preferences never sync) — acceptable for v1.5.

### 5 · Nudge push-up
Nudge mounts as a plain conditional sibling below the deck (`app/index.tsx:366-368`);
deck is `flex-1 justify-center` so the mount steals ~90 px in one frame. Fix: animated
height/opacity wrapper (gentle ease-in-out, reversed on exit), holding the last nudge
render during the exit animation.

### 6+7 · Triage entry + dots
- 6: triage entry currently renders only while the Right-now sheet is expanded
  (`index.tsx:279-292` passes `showTriage={barExpanded}` to `BottomActions`). Show it
  whenever the queue is non-empty.
- 7: lifted the `!active` suppression on `ContextTile` dots (`context-sheet.tsx:70`) —
  a tile dot now means "cards here need attention", selected or not. The collapsed bar's
  `Change` chip dot deliberately KEPT its hidden-attention semantics (it flags what the
  current filter is hiding; with the context selected those cards are already on deck).

### 8 · Triage size learning
On blueprint save where the user *corrected* an AI-guessed size (`check-queue.tsx:115`,
guess signal = `inferred.includes('size')`), append a compact bullet to
`ai.generalNotes`, e.g. `Sized "«title»" as big time (we guessed quick win)`. Purely
local; the prompt already receives generalNotes via item 4.

### 9 · Blue date picker in triage
`@react-native-community/datetimepicker` Android dialog chrome follows the native theme
(`styles.xml`/`colorPrimary` = #023c69, already navy) — not per-instance props.
**Implemented:** the per-instance levers that DO exist — `accentColor` (iOS) and the
Android dialog buttons (`positiveButton`/`negativeButton` textColor) — take the
blueprint teal `#49BAB9` / ink `#8FB4E0`. Full Android dialog re-theming would need a
native style; deferred unless Finn wants it.

### 10 · Blueprint fly-up
`check-queue.tsx` advances by React key swap — no animation existed. **Implemented** as a
Reanimated custom `exiting` worklet on the card's keyed wrapper (translateY → −screen,
380 ms ease-in) + a 180 ms FadeIn on the incoming card. Note: the exit also plays on
*Skip this one* (any key-swap departure) — one coherent exit keeps the queue mechanical;
revisit if Finn wants skip to feel different.

### 11 · "Triage cleared" toast
Queue-clear +5 is currently silent (`maybeAwardTriageQueueCleared` self-gates once/day;
called inside task-edits helpers with no plumbing back to the UI). Return the award
outcome to the caller / re-check in `check-queue.tsx` and fire the standard reward toast
titled "Triage cleared" (celebrate, +5, running total) when it actually pays.

### 12 · Bonus window
Current `bonusWindow()` (`star-calculator.ts:36-53`): `start = max(deadline−4d,
createdAt)`, `close = min(start+2d, deadline)` — a task created 1 day before its
deadline still gets a window. New rule: window strictly `[deadline−4d, deadline−2d)`
with day granularity — daysBefore(deadline) counts calendar days, deadline today = 0;
bonus live only while `2 ≤ daysBefore ≤ 4`. `topOfDeck` placement (≤2 days) unchanged.

### 13 · Edit pencil on bonus cards
**Already fixed in 9.4** (review item 8, per Finn): corner tap zones — gesture routing
AND the a11y Pressables — shift down by the 52dp band when a bonus/top-of-deck band
shows (`card-stack.tsx:180-195`, `:546-571`). Re-verified here only as a cheap assert
in the new bonus-window e2e flow (pencil on a badged card opens the editor).

### 14 · Keyboard alignment on the doing page
`choreographed = keyboardUp && notesFocused` (`task-running-view.tsx:241`) — the refine
box never sets a focus flag, so the notes block ends up flush to the keyboard padding
and the steps list gets squished. Fix: track `changeFocused`; when the refine box owns
the keyboard, hide the tail below it (notes + spacer) so ITS bottom lands on the
keyboard instead.

### 15+16 · Criticality + urgency (best-guess design)
- Schema: `criticality` text column (`'chill' | 'important' | 'critical'`, null = chill)
  on tasks — mobile migration 0010, server migration 0004, zod validation, sync-service
  update-column list. Editable via card-back and blueprint chips.
- Hidden urgency metric (pure, in `star-calculator.ts` or `curation.ts`):
  `urgency = criticalityWeight × (0.25 + 0.75 × proximity)` with weights chill 1 /
  important 2 / critical 3.5 and `proximity = (14 − daysLeft)/14` clamped to [0,1]
  (no deadline → proximity 0). Sanity anchor from the note: critical @3 days (≈2.9)
  beats chill @1 day (≈0.95). Exact numbers are tuning dials, kept as named constants.
- Bonus assignment becomes global: among window-eligible tasks (item 12), only the top
  by urgency actually carry the badge, capped so **total live bonuses (window badges +
  the do-it-now offer) ≤ 2**. In-window beats do-it-now when both apply to one task
  (`liveBadge` currently picks the larger amount — change to prefer window).
- Curation scoring feeds criticality into its urgency dimension so critical deadlines
  also surface earlier in the deck.

## Implementation notes (2026-08-12, filled as built)

- Item 12 semantics: `daysUntilDeadline()` counts whole calendar days (midnight-based);
  window live while `2 ≤ days ≤ 4`; `isTopOfDeck` = `days < 2` (incl. overdue) — the
  placement takeover starts exactly where the badge stops. `BONUS_WINDOW` is now
  `{opensDaysBeforeDeadline: 4, closesDaysBeforeDeadline: 2}` (lengthDays/topOfDeckDays
  retired).
- Item 16 wiring: `assignBadges(tasks, offers, now)` in curation.ts is THE badge
  authority — deck (`index.tsx`), task-list rows, `attentionContexts`, and the completion
  payout (`awardCompletionStars` re-runs the selection with the completing task's
  pre-completion snapshot) all consume it. `liveBadge` remains as the same-card
  tiebreak + no-deck fallback, now window-first ("in ideal window takes priority").
- Item 16 payout consequence: completing a window-eligible card that LOST the urgency
  race pays no bonus — payout always matches what the card displayed.
- Criticality weights (tuning dials, curation.ts): chill 1 / important 2 / critical 3.5;
  urgency = weight × deadlineUrgency, so legacy/chill behaviour is byte-identical.
- Curation ordering now uses the criticality-amplified urgency in its scoring dimension —
  critical deadline'd cards surface earlier; deadline-less cards are unaffected.
- Item 4 contract: general notes live in the `preferences` table under
  `ai.general_notes` (cap `MAX_AI_GENERAL_NOTES_CHARS` = 2000, oldest bullets fall off
  first, duplicate bullets dropped). Sent as `generalNotes` (truncate-never-reject) with
  breakdownTask / moreSteps / refineBreakdown / suggestMicroTask; brain-dump parsing
  deliberately NOT included this round (different content assembly — revisit).
- Fake-provider learning contract: refine feedback containing 'prefer'
  (case-insensitive) → `generalLearning: 'Learned: <trimmed feedback ≤140>'`, else null.
- Item 15 compat: `taskUpsertSchema.criticality` is `.default(null)` so pre-criticality
  clients (Finn's phone until next OTA) keep pushing successfully.

## Runtime debugging findings

- (2026-08-12) `parseReviewFlags` silently nulls unknown keys — `seed-test-account.ts`'s
  `{size:true,...}` fixture shape never produced a size review item. Corrected shape:
  `{"inferred":[...],"missingDeadline":true}`.
- (2026-08-12) Done-section ordering is `updatedAt` ASC for completed rows
  (`splitTasksForList`) — fixtures stagger updatedAt so Gamma (newest) peeks just above
  "To do".
- (2026-08-12) Latent sync bug found while mapping: `sync-service.ts:69-84` enumerates
  update columns explicitly and omitted `skipWindowStartedAt` + `lastEngagedAt` —
  server-side updates silently dropped pushed skip state. FIXED alongside adding
  `criticality` to the list.
- (2026-08-12) Mid-suite self-inflicted flake: editing shared/server code while the
  fake server runs under `bun --hot` hot-swaps validation live — the strict new
  `criticality` field failed the old APK's pushes and broke flow 53's restore leg.
  Fixed via `.default(null)`; lesson recorded: schema-validation additions must always
  tolerate old clients.
- (2026-08-12) tasks-repository's migration-0008 backfill test selected through the
  CURRENT drizzle schema against a DB frozen at 0008 — broke when 0010 added a column.
  Now reads via raw SQL (future-proof).
