# Story 9.6 — Google Keep fix-list pipeline & housekeeping

**Status:** open — tooling scaffolded 2026-08-15; Keep auth pending Finn's one-time token
**Branch:** automated-complete-build
**Paper-trail style:** fixes story (no BMad ceremony), same as 9.4/9.5

## Intent

Finn jots app fixes/edits into a Google Keep checklist on the go
(`https://keep.google.com/u/0/#LIST/1Ntn4UIvldzTLrtF3vpUrn32LuDuQXFxwLGdJ0S3YkiPxtrbIYGfoL1bGbqzP`).
This story wires that list into the dev loop and parks the housekeeping items
from the 2026-08-15 PostHog/notes investigation.

### The pipeline (standing workflow once auth lands)

1. **On Finn's prompt** ("sync the keep items"): run
   `scripts/keep/.venv/bin/python scripts/keep/keep-list.py pull`, mirror every
   *unchecked* item into the **current open story** as tasks (dedupe against
   items already mirrored — the Keep item id is the stable key, record it next
   to each task). The first sync opens **Story 9.8** (9.7 is the full-sync
   design; this story stays housekeeping-only); later syncs land in whatever
   story is open then.
2. Implement per the normal fixes flow (e2e coverage, gates, commit per chunk).
3. **When a fix is live on the phone via OTA update** (not merely committed):
   `keep-list.py check <item-id>` so the Keep list stays truthful. Never check
   an item whose fix hasn't shipped.

### Tooling (done 2026-08-15)

- `scripts/keep/keep-list.py` — `pull` / `check <id>` / `uncheck <id>` / `add <text>`
  against the list; config from repo-root `.env` (gitignored):
  `GOOGLE_KEEP_EMAIL`, `GOOGLE_KEEP_MASTER_TOKEN`, `GOOGLE_KEEP_LIST_ID` (set).
- `scripts/keep/get-master-token.py` — one-time master-token helper
  (EmbeddedSetup oauth_token exchange, or app-password fallback); instructions
  in its docstring. Keep has no official consumer API — gkeepapi 0.17 drives
  the internal Android sync API; venv at `scripts/keep/.venv` (gitignored).

## Tasks

| # | Item | Source | Status |
|---|------|--------|--------|
| 1 | Keep auth: master token in root `.env`, `pull` verified against the real list ("One Down - bugs and issues", 12 unchecked items, account gmate.mystuff@gmail.com). Gotcha handled: Finn pasted the oauth cookie as the token — exchanged it in place; `keep-list.py` now detects that and says so | this story | **done 2026-08-15** |
| 2 | First sync: mirror unchecked Keep items into **Story 9.8** (created at first sync; item ids recorded) | this story | waiting on Finn's prompt |
| 3 | Strip `EXPO_PUBLIC_POSTHOG_API_KEY` from `apps/mobile/.env` — e2e/emulator runs polluted production analytics (Aug 11–12: ~100 fake installs, 1,200+ tRPC events). E2E needs no analytics; phone keeps the key via EAS env | 2026-08-15 investigation | **done** — key removed, comment documents the keyless-until-first-OTA window for locally-built phone APKs |
| 4 | Distillation truncation polish + attribution | 2026-08-15 investigation | **done** — see notes below |
| 5 | Harden `use-step-actions.ts` distillation write: it patched `taskRef.current` ("freshest task") — a mid-flight task switch could land notes on the wrong task. Latent, not the observed bug | 2026-08-15 investigation | **done** — write now re-reads the row by the refine's own `current.id` (keeps the autosave-freshness intent, drops the wrong-task hazard) |
| 6 | Old account decision | 2026-08-15 session | **done** — Finn's call: binned. `finn.merlett@gmail.com` auth user + its 17 stale Aug-5 task rows deleted from supabase-local (CSV snapshot kept in the session scratchpad; the app-changes notes also survive in the session transcript). `finn.merlett+1@gmail.com` is canonical |

### Task 4 implementation notes

- **Word-boundary truncation** (server): new `truncateCharsAtWord` in
  `apps/server/src/lib/text.ts` — cuts at the last space when it sits past
  60% of the budget, hard-cuts otherwise, always appends `…` and stays
  ≤ maxChars. Applied to BOTH `coerceDistillation` and
  `coerceGeneralLearning` (gemini provider).
- **Attribution marker** (client): `appendDistillationToNotes` now stamps
  `AI note: ` on the appended line — unmarked AI text in the notes box reads
  as contamination (the 2026-08-15 incident). Marker lives client-side so
  fake and gemini behave identically.
- **Fake contract change**: fake `refineBreakdown` distillation is now the
  trimmed feedback UNPREFIXED (was `Approach note: …`) — the client adds the
  marker. Flow 10 asserts updated (`AI note: I prefer physical actions…`);
  fake/ai/task-edits/gemini tests updated, incl. new word-boundary +
  hard-cut-ellipsis cases.

## Verification (2026-08-15)

- `bun run test` (server 146 + mobile 376), `bun run typecheck`,
  `bun run lint:check` — all green after the task 3–5 changes.
- Full Maestro suite on the fresh keyless APK: **34/34 passed, 0 failed**
  (flow 10 exercises the new `AI note:` marker end-to-end; flow 22 telemetry
  smoke covers the keyless/no-op analytics path).
- Session finding, now owned by Story 9.7 (full account sync): tasks
  bulk-delete hard-deletes locally and the server sync never deletes —
  deleted-after-sync tasks resurrect on a fresh sign-in. Tombstones close it.

## Findings log

### 2026-08-15 — "another task's text in my laundry notes" (closed: user error, watch for recurrence)

Symptom: after "Change these" on **Do laundry**, the notes box gained
app-design text ("Move to bottom navigation bar or top options menu depending
on design preferences for layout options or").

Forensics (first real use of PostHog querying — worked well):

- PostHog timeline pinned it: 15:00:58 UTC `ai.refineBreakdown` (2.3 s,
  feedback 162 chars) with `task_edited {field: notes}` in the same second =
  the distillation append, not typing. Postgres (new-account sync) showed the
  appended paragraph cut at exactly the 200-char cap.
- Ruled out: server state (stateless `generateContent`, fresh client per
  call), prompt-example echo (phrase absent from codebase), task `details`
  (empty), pre-refine notes (clean), same-day brain dumps (15/209/210 chars,
  accounted for), general AI notes (no `ai_notes_edited`/`ai_learning_saved`
  ever fired from the phone).
- Remaining carrier: the 162-char feedback itself (char math fits laundry
  sentence + app note) or a contaminated local-only subtask. **Finn's call:
  treat as dictation/typing bleed into the feedback box (user error).** Reopen
  if it recurs — next probe is the task's local subtasks.

Ops notes from the same session:

- PostHog personal API key (query access) now in repo-root `.env`
  (`POSTHOG_PERSONAL_API_KEY`); project id 232941, EU host. HogQL via
  `POST /api/projects/232941/query`.
- Phone events confirmed the 9.5 OTA is live on the phone
  (`task_edited {field: criticality}` at 14:39 UTC).
- 13:19 UTC brain dumps failed `reason: network` — phone Tailscale was off
  until ~14:34 UTC.
