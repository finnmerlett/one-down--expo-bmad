# 9.4 — Bug-fix session (2026-08-11, Finn on-phone testing)

Live list from Finn ("there's more" — expect additions). Validate manually on
the emulator; still write Maestro flows for user-facing changes, but skip the
long batches this session.

## Reported (verbatim intent, triaged)

1. **Right-now box expansion** — expanded state should BLUR what's behind it,
   and the expand/collapse should ANIMATE (transform transition), not jump.
2. **Priority-card glow** — the bonus aura reads as a solid outline; it must
   be a soft blurred glow. DONE via new-arch `boxShadow` (real colored blur +
   spread on Android; Reanimated animates it) — static halo is a two-layer
   shadow bloom, the sonar ripple an animated shadow pulse.
3. **Global scale bump + centralized type** — whole app reads too small:
   bump icons, fonts, line heights. Centralize font sizes so a single scale
   factor can be applied later. (Tailwind fontSize tokens + sweep arbitrary
   `text-[Npx]` usages into tokens.)
4. **Steps box fades** — gradient opacity at top AND bottom of the steps
   scroller ALWAYS, not only when the notes box is focused; no hard cutoffs.
5. **Steps font consistency** — current step size is right; previous/next
   steps drift to different sizes — all steps same size.
6. **Steps more/less toggle** — new button on the LEFT of the actions row
   (pushes "Change these" centerward): toggles full-height list (fit) vs
   3-step window; both still scroll.
7. **Banked stars are cosmetic** — in-task star progress is display-only;
   the main pot is credited ONLY at task completion (audit star award paths:
   first-steps/triage/etc. must not credit the counter mid-task).
8. **Task list tap → VIEW screen** — tapping a row opens a viewing screen,
   not the edit screen.
9. **Edit screen chrome conditional** — the card outline + padding around the
   edit screen only when entered via the edit icon on the stack card;
   entered from the doing screen → no card chrome.
10. **Quick Add keyboard gap** — dismissing the keyboard while the input is
    still focused leaves a gap between the overlay and the screen bottom.
11. **Card stack animation timing** — the rotate/rise-up of the stack must
    TRACK the drag progressively (as the top card moves away), not play
    after release. After release only the new back card fades in — and that
    must fire the moment the card leaves the screen (current pause too long).
12. **Fling to dismiss** — apply velocity/momentum: a fast short flick
    counts; release decision projects position + velocity past the distance
    trigger.

## Status

- [x] 1 right-now blur + animate (expo-blur scrim — NEEDS the dev-client /
      release rebuild (native module); sheet morphs out of the bar via
      custom entering/exiting)
- [x] 2 glow soft blur (boxShadow halo + animated shadow ripple; ripple
      alpha fixed-precision — denormal floats crashed the rgba parser)
- [x] 3 scale bump + type tokens: `FONT_SCALE = 1.1` in tailwind.config.js;
      every size flows through fontSize tokens (added 3xs/caps/label/body/
      display/hero next to the standard names, each with a scaled line
      height); all 89 arbitrary `text-[Npx]` usages swept to tokens (21
      files, zero left — arbitrary px sizes are now banned). Icons/spacing
      deliberately left for a follow-up pass once the font bump is judged.
- [x] 4 steps fades always (FadeEdge no longer gated on keyboard)
- [x] 5 steps font match (all rows 14.5px like the current step)
- [ ] 6 more/less toggle
- [ ] 7 banked stars cosmetic
- [x] 8 list tap → view screen (rows push /task-running/[id] — the working
      screen in its looking state; editing stays behind its pencil)
- [x] 9 edit chrome conditional (doing-screen pencil → /task/[id]?flat=1 →
      frameless CardBack, no card outline/padding; stack-pencil overlay
      keeps the card chrome)
- [x] 10 quick-add keyboard gap (manual keyboardDidShow/Hide pad replaces
      KeyboardAvoidingView-in-Modal, which held a stale inset on
      back-button dismissal — Finn to hand-verify, emulator IME is in
      floating mode)
- [x] 11 stack anim tracks drag (dragProgress rides the finger; advance
      fires at screen exit; promoted card keeps its dragged position; only
      the new back card animates in after release)
- [x] 12 fling velocity (150ms momentum projection + speed-matched fly-off;
      opposite-direction yank = cancel, true-travel duration — fixes the
      "shoots off fast the wrong way" report)

## Additions (9-5 file)

13. **Task seeding via sync accounts** — dev-only seeding path: server-side
    fixture script inserts tasks for a known test account; e2e flows and
    manual sessions sign in and pull exact state. Queued after the visual
    items.

## Review round 1 (Finn on-device) — outcomes

- 1 ✅ + tweak: sheet now expands EVENLY out of the bar (8dp past it on all
  sides — marginTop 36→12). Might augment later.
- 2/12 deferred to 9.5 by owner.
- 4 ✅ redone: reusable `components/shared/faded-scroll-view.tsx` — fades
  only when content actually hides past an edge (none when it fits, top
  fade gone at top, bottom gone at bottom).
- 6 ✅ redone: toggle reads All/Less (left of the row), `Change these`→
  `Change`, `Get more steps`→`More steps` (flows/tests/stories updated;
  brain-dump's own 'Change these' kept); collapsed state shows EXACTLY the
  current step ±1 with ⋯ ellipsis rows for the hidden rest — no porthole
  scroll. Banked-star numbering seeds from the hidden-above count.
- 7 ✅ ROOT-CAUSED + FIXED (pre-existing, reproduced at HEAD): on tick the
  StepRow's grade flip swaps shadow classes → css-interop dev "upgrade
  warning" → its debug printer deep-serializes props via Object.entries →
  hits react-navigation's THROWING context-default getters → render crash
  (dev-only; release never runs the printer — why e2e always passed).
  Fixed twice over: StepRow root keyed by grade (remount, no upgrade), and
  `patches/react-native-css-interop@0.2.5.patch` makes the printer
  exception-safe (Object.keys + guarded reads).
- 8 ✅: corner tap zones (edit + review) shift down by the 52dp band when a
  bonus/top-of-deck band is showing — gesture routing AND the a11y
  Pressables.
- 11 ✅: entering back card carries a mount fade synchronized with its
  slide (with a shallow deck it lands at depth 1 whose slot opacity is 1 —
  it used to pop in fully visible).
- Type scale v3 (owner decision): standard Tailwind tokens ONLY, scaled by
  UI_SCALE (1.15) incl. line heights + icon tokens; custom token names are
  BANNED — gluestack's tailwind-merge silently drops unknown text-* names
  (classified as colors). Guarded by a custom oxlint rule
  (lint/one-down-plugin.mjs: no-arbitrary-text-size).
- Seeding (13) stashed for session 9.5: `git stash` "9.5: task seeding via
  sync accounts".

## E2E lock-in (post-commit)

Suite green 33/33 on the 9.4 build (29 in the final full run + 4 patched
flows verified individually against the same APK). 52/53 pass for the first
time since the July tailnet migration. Notable causes fixed along the way:

- **Gradle does not track .env as a bundle-task input** (bit twice, both
  directions): `mobile:build` now always runs
  `:app:createBundleReleaseJsAndAssets --rerun`; `mobile:install` pins to
  the emulator serial (a bare `adb install` fails with the phone attached).
- Flow drift from 9.4 behavior: 06/07/26 row-taps land on the working
  screen (editor via the pencil); 09/10 expand the collapsed step window
  ('Show all steps') before asserting steps past 3.
- 1.15-scale fallout in flows: text-edit taps land mid-text (06 renames via
  cursor-proof appended marker; 05 uses select-all), and the completion
  toast now overlaps the top bar — 24/27 wait for 'One down!' to clear
  before tapping 'Open task list'.
