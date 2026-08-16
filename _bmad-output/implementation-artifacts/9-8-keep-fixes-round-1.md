# Story 9.8 — Keep fix-list round 1

**Status:** in progress (opened 2026-08-16, overnight autonomous run)
**Branch:** automated-complete-build
**Paper-trail style:** fixes story (no BMad ceremony), same as 9.4/9.5/9.6
**Source:** first Keep-list sync (pipeline established in 9.6). Every task
below mirrors an unchecked item from "One Down - bugs and issues"; the Keep
item id is the dedupe key across future syncs. Items are checked off in Keep
ONLY once the fix is live on the phone via OTA.

**Operating note (Finn, 2026-08-16):** asleep overnight — complete all items
with tests where appropriate; where clarification would be needed, proceed
with best guess AND add an `INPUT NEEDED:` item to the Keep list describing
what's required.

## Tasks

Grouped for implementation; the Keep id column is the sync key.

### A. Typography & button standardisation (foundation for several items)

| # | Keep id | Item | Status |
|---|---------|------|--------|
| A1 | `cbx.uurn294v1ji6` | Standardise an editable body-text size (single source); apply to quick-add's two input boxes | done |
| A2 | `cbx.5wdp78b06zwz` | Notes text too large — match steps text size | done |
| A3 | `cbx.a0mxpbr5y4q3` | Brain-dump edit text too large — same size as notes/steps editing text | done |
| A4 | `cbx.nvxalsp035hq` | Settings "AI notes about you" input follows the standardised input size | done |
| A5 | `cbx.f5kjbvrjf2g6` | Standardise primary (full-height) + secondary (reduced-height) button types (TVA suggested); quick-add confirm button uses smaller text | done |
| A6 | `cbx.91mcz8aj8mlv` | "Parse tasks" + "add one task instead" buttons follow the brain dump/done-editing button size & style | done |
| A7 | `cbx.am68xzvvk7vz` | No-tasks screen: "Show all tasks" text button uses standardised small button text size (visible screen larger than main brain dump) | done |
| A8 | `cbx.e4gf6bn4nek4` | No-tasks screen: "Nothing for this context" + "try another context" texts reduced in size | done |

### B. Card back / notes UX

| # | Keep id | Item | Status |
|---|---------|------|--------|
| B1 | `cbx.3bei63i6wo2q` | Notes stay multiline when editing (currently one scrollable line) | done |
| B2 | `cbx.z2mtg1g2j3yl` | Notes box collapsed by default; chevron to expand sits next to the word "Notes" | done |
| B3 | `cbx.6oo981248myy` | "More steps" reads "Get first steps" when there are no steps yet | done |

### C. Brain dump flow

| # | Keep id | Item | Status |
|---|---------|------|--------|
| C1 | `cbx.v0xrpz3320gk` | Back without parsing saves unparsed dump content; back after parsing saves parsed content; back navigates HOME (returning to the dump is the "back to dump" button's job) | done |
| C2 | `cbx.ut50wicum4d4` | Parsed tasks deleted in review become "entry not added" rows instead of disappearing | done |
| C3 | `cbx.tw5qd7wel8gt` | "Change these" input hidden behind keyboard — bottom should align with top of keyboard (standard margin) | done |

### D. Card stack & context box

| # | Keep id | Item | Status |
|---|---------|------|--------|
| D1 | `cbx.tlczvpvc621y` | Cards wider + taller: side margin shrinks ~35%; aspect ratio change ≈ +15% height at constant width | done |
| D2 | `cbx.4k06x6s32vut` | Card stack positioned higher so "coming round a lot" fits underneath without pushing cards up; stack position constant | done |
| D3 | `cbx.5vxsgcnonfyn` | "This one keeps coming round" text replaced by the original component (currently edit-screen-only) | done |
| D4 | `cbx.fqs6blhkasgb` | Setting: expand change-context box on app open vs. keep previous context | done |
| D5 | `cbx.b8ueg65xd032` | Regression (139981d): expanded change-context box turns the blurred background dark grey | done |

### E. Dark mode & task list polish

| # | Keep id | Item | Status |
|---|---------|------|--------|
| E1 | `cbx.n78piz9tkofz` | "One down" award toast broken on dark mode — light theme or glow border | done |
| E2 | `cbx.r0n6rmoy7i32` | Full-list bonus task: title invisible in dark mode; star count too pale on white — adapt bonus formatting to dark mode | done |
| E3 | `cbx.5bx2a25n9ugs` | Done-section "and do" button inset inside task on LHS (not outside); same for recycle-bin restore | done |

### F. Behaviour & features

| # | Keep id | Item | Status |
|---|---------|------|--------|
| F1 | `cbx.xe6vnipogqgz` | Quick-add tasks get triaged — mark same as brain-dump-created tasks | done |
| F2 | `cbx.1owfytykj8hn` | Three-step view tick-off animation: exiting top task height-collapses + fades, entering bottom task height-expands + fades in (symmetrical ease-in-out), middle rows slide; reversed for the opposite direction | done |
| F3 | `cbx.8bkuthhjdv52` | Settings "get state snapshot" button: saves a snapshot of the local DB to the server, returns a copyable uuid (debugging) | done |

## Constraints

- **Sync complexity freeze applies**: F3 is a separate snapshot endpoint +
  table, NOT a change to the sync engine (allowed). No sync-engine changes in
  this story.
- Copy/label changes (B3, C2, E3…) can break Maestro selectors — sweep
  `.maestro/` for affected flows with every batch.
- OTA at the end; Keep items checked only once confirmed live on the phone.

## Implementation notes (2026-08-16 overnight run)

All 25 items implemented across four commits (`7692b2d`, `1e843b1`,
`7ce7b0d`, `8bb01c3`); statuses in the tables above are updated per item.

- **A1–A4 (editable text size)**: `constants/typography.ts` exports
  `EDITABLE_BODY_SIZE = 'sm'` (gluestack size variant → `text-sm`, the step
  text size) + `EDITABLE_BODY_TEXT` for fields keeping larger containers
  (quick-add title). Applied: task notes, brain dump, quick-add title +
  details, AI general notes. The "Change these" box was already `sm`.
- **A5–A7 (buttons)**: new tva-based `ui/app-button` — `primary` (54px pill,
  the Done-editing/Add-N-tasks reference), `primary-compact` (h-11 +
  text-sm), `secondary` (link-style, text-sm). Applied: quick-add Save
  (compact), Parse my tasks (primary), Add one task instead (secondary),
  empty-state action (compact). Existing hand-rolled 54px pills already match
  `primary` and can migrate opportunistically.
- **B1 (multiline notes)**: the notes box now grows with content (`h-auto`
  beats the gluestack base `h-[100px]`; input capped `max-h-40`, scrolls
  inside past ~6 lines) and passes `multiline` explicitly.
- **B2 (collapsed notes)**: label row is a Pressable ("Expand notes" /
  "Collapse notes") with the chevron beside the word; collapsing flushes the
  draft after `Keyboard.dismiss()` (Android focus-handoff gotcha).
- **B3**: zero steps → the action reads `Get first steps` (label + a11y).
- **C1 (dump draft)**: `services/brain-dump-draft.ts` persists
  `{text, check}` as preference `brain_dump.draft` (debounced 400ms +
  unmount flush; hydration-gated so an empty first render can't clobber).
  Back arrow AND hardware back exit HOME; `Back to the dump` is the only
  return-to-dump path; `Add N tasks` is the only clear. Oversized check
  payloads (can't happen at the 2k dump cap) degrade to text-only — the
  preference value caps at 16 384 on the server.
- **C2**: dropping a parsed task returns its `evidence` lines (title as
  fallback) to the unclaimed rows, deduped — re-promotable, honest count.
- **C3**: BrainDumpCheck gained KAV + the task-running item-14 choreography:
  while the change box owns the keyboard the footer hides so the box's
  bottom lands on the keyboard.
- **D1/D2 (geometry)**: `CARD_WIDTH = screen − (screen−280)×0.65` (side
  margins −35%), `CARD_HEIGHT = width × 1.61` (ratio 1.4 → 1.61 = +15%);
  deck container `justify-center` → `justify-start` so the cards hold one
  position and the nudge fills the space beneath. Small-screen caveat: on a
  320pt device the card is ~473px tall — clipping accepted (pre-existing
  behaviour at 392 too).
- **D3**: MicroTaskNudge renders the ORIGINAL `TaskHealthPrompt`
  (flag `avoided`): Keep it → `keepTask` (zeroes skipCount → panel hides),
  Cut loose → overlay-identical release (award + undo toast, new
  `home_nudge` via), Break it down → the E9 smallest-step magic. Busy state
  disables all three + spinner line.
- **D4**: preference `context_bar.auto_open` (default ON) gates the session
  auto-expand; `SessionSection` toggle in settings (below notifications so
  flow 19's untouched offsets hold).
- **D5 (regression)**: not a 139981d bundle change (only argent, a
  devDependency, changed since the 9.5 build) — it's dark mode (E1/E2 show
  Finn now runs dark): `tint="light"` + `bg-background-100/40` (dark token =
  rgb 43 46 44) painted the backdrop flat dark grey. Now scheme-aware:
  dark tint + `dark:bg-black/25`.
- **E1**: toast pills (reward + undo) get `dark:border` warm ring.
- **E2**: bonus rows + card-front rail get dark twins for the hardcoded
  creams; star counts darkened to tertiary-700/600.
- **E3**: Undo/Restore pills inset INSIDE the row cards on the left — outer
  card is a plain HStack so the pill stays a sibling of the labeled row (no
  nested-pressable flattening); labels unchanged.
- **F1**: `createTask` writes `reviewFlags {missingDeadline: true}` +
  `hasCheckNeeded` — quick-adds enter the same blueprint triage queue
  (deadline group reads "nothing to go on"; size/contexts sit alongside).
- **F2**: `StepSlot` wrapper per step-window row: `entering` expand+fade,
  `exiting` collapse+fade (ghost), `layout` LinearTransition glide — one
  260ms ease-in-out curve; armed after first paint (no cascade on screen
  open); honors reduce-motion. The container gap moved into slot padding so
  a collapsing row removes its gap with it.
- **F3**: server `snapshot.save` (protectedProcedure, `state_snapshots`
  table, pg migration 0007, write-once, 4MB cap) + settings `DebugSection`:
  captures ALL local tables (tombstones included) via
  `services/state-snapshot.ts`, uuid selectable (long-press copy) + Share.
  One-tap clipboard needs expo-clipboard (native) → next APK build.

### Best-guess calls for morning review (also filed as INPUT NEEDED Keep items)

1. **D3**: replaced the whole nudge (incl. the "Show me the smallest step"
   CTA) with the health prompt — the smallest-step magic now lives under
   `Break it down`. Confirm that's the intent.
2. **F1**: quick-adds are queued via the `missingDeadline` ("nothing to go
   on") question — saving from triage doesn't FORCE a size/context answer
   (same as brain-dump semantics). Confirm that suffices.
3. **F3**: "copy a uuid" shipped as long-press-copy + Share (clipboard =
   native module, can't OTA). Schedule a native build if one-tap copy
   matters.
4. **A8**: empty-state sizes: heading `2xl → xl`, body default(base) → `sm`.

## Verification (2026-08-16)

- `bun run typecheck`, `bun run lint:check` — green. Mobile jest 403/403
  (61 suites), server `bun test` 162/162.
- Manual argent spot-checks on the release APK: quick-add sizes/compact Save,
  empty-state sizes, bigger anchored cards + review marker + triage entry,
  collapsed notes → expand → multiline growth, `Get first steps`, dark-mode
  context-sheet blur (D5) and toast ring (E1) — all confirmed visually.
- Full Maestro suite history:
  - Run 1: **31/35**. Three of the four failures shared one NEW root cause:
    the local release build ran AHEAD of the published OTA for the first
    time, and the no-clearState relaunch legs (flows 08/21, plus mixed into
    10) booted the DOWNLOADED 9.7 bundle — old UI, new asserts. Fixed
    hermetically: `app.config.js` + `E2E_BUILD=1` in `mobile:build` write
    `expo.modules.updates.ENABLED=false` into local e2e APKs (the phone only
    ever runs EAS builds, untouched). Flow 10 also needed an `Expand notes`
    step before its `AI note:` assert (B2).
  - Run 2: **34/35** — remaining failure was D3's label twin: the home nudge
    (now the health prompt) stayed rendered UNDER the card-back overlay, and
    Maestro's hierarchy matching tapped the hidden `Keep it` (swallowed by
    the overlay). Fixed twice over: the nudge collapses while the overlay is
    up, and home content leaves the a11y tree under the overlay
    (TalkBack correctness).
  - Final run: **35/35 passed** on the fixed build.
- Ops bonus fix en route: `seed-e2e-accounts.ts` now paginates the GoTrue
  admin list (the local auth store outgrew one 200-user page from
  test-created throwaway users).
- OTA + phone verification: pending below.
