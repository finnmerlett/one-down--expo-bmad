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
| A1 | `cbx.uurn294v1ji6` | Standardise an editable body-text size (single source); apply to quick-add's two input boxes | pending |
| A2 | `cbx.5wdp78b06zwz` | Notes text too large — match steps text size | pending |
| A3 | `cbx.a0mxpbr5y4q3` | Brain-dump edit text too large — same size as notes/steps editing text | pending |
| A4 | `cbx.nvxalsp035hq` | Settings "AI notes about you" input follows the standardised input size | pending |
| A5 | `cbx.f5kjbvrjf2g6` | Standardise primary (full-height) + secondary (reduced-height) button types (TVA suggested); quick-add confirm button uses smaller text | pending |
| A6 | `cbx.91mcz8aj8mlv` | "Parse tasks" + "add one task instead" buttons follow the brain dump/done-editing button size & style | pending |
| A7 | `cbx.am68xzvvk7vz` | No-tasks screen: "Show all tasks" text button uses standardised small button text size (visible screen larger than main brain dump) | pending |
| A8 | `cbx.e4gf6bn4nek4` | No-tasks screen: "Nothing for this context" + "try another context" texts reduced in size | pending |

### B. Card back / notes UX

| # | Keep id | Item | Status |
|---|---------|------|--------|
| B1 | `cbx.3bei63i6wo2q` | Notes stay multiline when editing (currently one scrollable line) | pending |
| B2 | `cbx.z2mtg1g2j3yl` | Notes box collapsed by default; chevron to expand sits next to the word "Notes" | pending |
| B3 | `cbx.6oo981248myy` | "More steps" reads "Get first steps" when there are no steps yet | pending |

### C. Brain dump flow

| # | Keep id | Item | Status |
|---|---------|------|--------|
| C1 | `cbx.v0xrpz3320gk` | Back without parsing saves unparsed dump content; back after parsing saves parsed content; back navigates HOME (returning to the dump is the "back to dump" button's job) | pending |
| C2 | `cbx.ut50wicum4d4` | Parsed tasks deleted in review become "entry not added" rows instead of disappearing | pending |
| C3 | `cbx.tw5qd7wel8gt` | "Change these" input hidden behind keyboard — bottom should align with top of keyboard (standard margin) | pending |

### D. Card stack & context box

| # | Keep id | Item | Status |
|---|---------|------|--------|
| D1 | `cbx.tlczvpvc621y` | Cards wider + taller: side margin shrinks ~35%; aspect ratio change ≈ +15% height at constant width | pending |
| D2 | `cbx.4k06x6s32vut` | Card stack positioned higher so "coming round a lot" fits underneath without pushing cards up; stack position constant | pending |
| D3 | `cbx.5vxsgcnonfyn` | "This one keeps coming round" text replaced by the original component (currently edit-screen-only) | pending |
| D4 | `cbx.fqs6blhkasgb` | Setting: expand change-context box on app open vs. keep previous context | pending |
| D5 | `cbx.b8ueg65xd032` | Regression (139981d): expanded change-context box turns the blurred background dark grey | pending |

### E. Dark mode & task list polish

| # | Keep id | Item | Status |
|---|---------|------|--------|
| E1 | `cbx.n78piz9tkofz` | "One down" award toast broken on dark mode — light theme or glow border | pending |
| E2 | `cbx.r0n6rmoy7i32` | Full-list bonus task: title invisible in dark mode; star count too pale on white — adapt bonus formatting to dark mode | pending |
| E3 | `cbx.5bx2a25n9ugs` | Done-section "and do" button inset inside task on LHS (not outside); same for recycle-bin restore | pending |

### F. Behaviour & features

| # | Keep id | Item | Status |
|---|---------|------|--------|
| F1 | `cbx.xe6vnipogqgz` | Quick-add tasks get triaged — mark same as brain-dump-created tasks | pending |
| F2 | `cbx.1owfytykj8hn` | Three-step view tick-off animation: exiting top task height-collapses + fades, entering bottom task height-expands + fades in (symmetrical ease-in-out), middle rows slide; reversed for the opposite direction | pending |
| F3 | `cbx.8bkuthhjdv52` | Settings "get state snapshot" button: saves a snapshot of the local DB to the server, returns a copyable uuid (debugging) | pending |

## Constraints

- **Sync complexity freeze applies**: F3 is a separate snapshot endpoint +
  table, NOT a change to the sync engine (allowed). No sync-engine changes in
  this story.
- Copy/label changes (B3, C2, E3…) can break Maestro selectors — sweep
  `.maestro/` for affected flows with every batch.
- OTA at the end; Keep items checked only once confirmed live on the phone.

## Implementation notes

(fills in as batches land)
