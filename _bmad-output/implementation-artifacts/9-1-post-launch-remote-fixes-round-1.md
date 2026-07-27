# Story 9.1: Post-launch remote fixes — round 1 (retroactive log)

Status: done (2026-07-27)

Post-launch fixes driven by the owner via the Telegram relay (see
`~/Repos/claude-remote/CLAUDE.md`). Logged retroactively when the
paper-trail convention was introduced; full BMad stages deliberately
skipped for remote fix batches (owner decision 2026-07-27).

## Items

1. **Undo completion from the Done list** — Done rows get an Undo pill;
   undoing returns the task to To do and retracts the completion stars.
   (`task-undo.ts`, `task-list-view.tsx`, e2e `27-undo-completion.yaml`)
2. **Undo removes the award row, not a negative entry** (owner revision of
   item 1): `removeCompletionAward` deletes the newest award row(s) — an
   owner-approved exception to the append-only ledger. Fallback negative
   `completion_undone` row only for odd legacy states.
3. **Star counter sign fix** — a negative day rendered "+-10"; now renders
   "−10". (`star-counter.tsx` + `NegativeDay` story)
4. **Connection dot self-heals** — the health probe polls (15 s while
   red, 60 s while green) instead of probing once and wedging offline.
   (`connection-status.tsx`)
5. **One-restart OTA updates** — update-ready banner with "Restart now"
   (`use-update-ready.ts`, `update-ready-banner.tsx`); no more
   double-restart dance.
6. **Compact card deck** (one-off appended per convention) — deck stopped
   filling the screen (dead white middle); fixed-height frame, tighter
   padding, 3-line title cap. Superseded by 9.2's playing-card dimensions.

## Commits

`8544e95` (undo + counter), `893d0fb` (compact deck), plus the
connection-dot and banner commits on `automated-complete-build`.
