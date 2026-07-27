# Story 9.2: Post-launch remote fixes — round 2

Status: done (2026-07-27)

Nine-item batch from the owner via the Telegram relay. No BMad ceremony
(owner decision); this file is the paper trail.

## Items

1. **Tap card → working screen** (formerly "started/running screen"), not
   the edit screen. Editing moved to a pencil button: top-left corner of
   the top card (visual icon on `task-card.tsx`, tap target
   `Edit task: <title>` in `card-stack.tsx`) and the working screen's
   header (pushes `/task/[id]`). Opening the working screen does NOT start
   the task: the pending → in_progress flip (which drives the card's
   Continue chip) fires on the first meaningful action — notes autosave,
   breakdown request, subtask toggle (`ensureStarted` in
   `task-running/[id].tsx`; `startTask` gained the `task_running` via).
   Review mode keeps tap = card back (that stack exists to confirm AI
   guesses).
2. **Playing-card dimensions** — deck frame is 280×392 (2.5:3.5), centered
   with breathing room on all sides (`card-stack.tsx`).
3. **Strict size filter** — Quick wins / Big time modes show only tasks
   that declare the matching size; unsized tasks no longer ride along
   (`matchesSize` in `curation.ts`, reversing the Story 3.2 decision).
4. **"Done" → "Mark as complete"** on the working screen ("Done" read as a
   leave-this-screen button). E2e flows updated wholesale.
5. **Contexts are requirements** — card-back section retitled "Requires:";
   context filters now mean "what I have right now": a task passes only
   when EVERY required context is active (`matchesContexts` subset
   semantics).
6. **Swipe threshold 15%** of screen width (was 35%) —
   `DISMISS_THRESHOLD_RATIO` in `card-stack.tsx`; flow 04's snap-back
   swipe reduced to 7% to stay safely below.
7. **Undo on reward toasts** — complete and cut-loose toasts carry an Undo
   button (5 s duration): `showRewardToast({ onUndo })`,
   `undoTaskCompletion` / new `undoTaskCutLoose` (+ new
   `removeCutLooseAward`, same delete-the-row semantics as 9.1 item 2).
   Both undo services re-read status from the DB — the toast's task
   snapshot is stale by design. New `task_cut_loose_undone` event.
8. **One star per fully-confirmed card** — AI-guess confirmations award
   `triageConfirmed` only when the card's LAST review flag clears
   (`reviewCleared` gate in `task-edits.ts`), not per item.
9. **Keyboard-aware working screen** — while typing notes, "Mark as
   complete" and "Cut loose" hide (they read as keyboard-dismiss buttons);
   "Help me with this" stays, floating above the keyboard
   (`task-running-view.tsx` keyboard listeners).

## Test/e2e impact

- `curation.test.ts` rewritten for strict size + subset contexts.
- `task-undo.test.ts`: DB-status-based undo + cut-loose undo coverage.
- `task-running-view.test.tsx`: label rename.
- Maestro: flow 07 rewritten (looking ≠ starting); card-back-intent taps
  switched to `Edit task: <title>`; home-card `Start task`/`Continue task`
  steps dropped (tap lands on the working screen); `Done` renamed
  everywhere; flow 04 snap-back distance reduced.
