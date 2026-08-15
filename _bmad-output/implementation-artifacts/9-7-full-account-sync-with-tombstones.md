# Story 9.7 — Full account sync with tombstones

**Status:** implemented 2026-08-15 (tasks 1–7); task 8 (OTA + phone verification) pending
**Origin:** 2026-08-15 design discussion (steps-don't-sync gap found during the
laundry-notes forensics; snapshot-vs-sync options weighed, hybrid rejected as
a two-sources-of-truth smell)

## Goal

One sync mechanism, four entities. Sign in on any device → your whole account
is there: tasks, steps, star history, preferences (incl. AI notes). No client
snapshot/backup system, no restore button. Catastrophe durability moves to
where it belongs — an ops-level Postgres backup on the server.

## Design decisions (agreed with Finn)

1. **Extend the existing per-row LWW sync** (Story 5.3 pattern: push-before-
   pull, `updatedAt` newer-wins whole-row, cursors advance only on success)
   to subtasks, the star ledger, and preferences. No field-level merge, no
   CRDTs — the app's reality is one active device at a time, and the existing
   tasks sync already assumes exactly that.
2. **Tombstones everywhere** (`deletedAt` timestamp column): deletion becomes
   an ordinary row update that syncs by the same newer-wins rule. Queries
   filter `deletedAt is null`; dead rows accumulate invisibly (fine at this
   scale; GC someday, not now).
3. **Tasks get tombstones too** — this FIXES A LIVE BUG: bulk-delete (7.1)
   hard-deletes locally while the server never deletes, so any task deleted
   after it has synced resurrects on the next fresh sign-in (verified
   2026-08-15: `db.delete(tasks)` in tasks-repository.ts + zero delete
   handling in server sync-service.ts).
4. **Explicitly NOT synced**: task offers (ephemeral, hours-scale windows,
   regenerate locally) and sync_meta (device-local cursors by definition).
5. **No client backup mechanism.** Server-side durability = scheduled
   `pg_dump` of the Postgres instance (ops task below). "Live sync + ops
   backup" is the standard pairing; "live sync + client snapshot carrying
   half the entities" was the smell.

## Entity notes

| Entity | Server table | Wrinkles |
|---|---|---|
| tasks | exists | add `deletedAt` both sides; bulk-delete flips it instead of deleting; queries/curation filter it |
| subtasks | NEW | AI "replace uncompleted" = tombstone old rows + insert new; step delete = tombstone; step-remove Undo = clear the tombstone on the SAME row (today it re-inserts verbatim); parent-first ordering on pull (insert tasks before their subtasks, or keep server FK-free like tasks) |
| star_activity_log | NEW | **Revised (convention pass, same day):** APPEND-ONLY — no tombstones, no updatedAt. Undo writes a negative compensating row (completion_undone / cut_loose_undone); the FEED collapses same-local-day do/undo pairs at render (cross-day pairs stay visible — owner ruling); totals are raw signed sums. Sync is insert-only on a createdAt cursor — conflicts impossible |
| preferences | NEW | key-value LWW; needs `updatedAt` (+`deletedAt` for symmetry); carries the AI general notes |

## Mechanics

- **Cursor state**: `sync_meta` grows per-entity cursor pairs (lastPushedAt /
  pullCursor per table) — same reset-on-user-change semantics as today.
- **The loop**: generalize `runSync` to iterate entities in a fixed order
  (tasks → subtasks → ledger → preferences), each entity running the existing
  push-then-pull with its own cursors. Same 2s pull-cursor overlap, same
  500-row push batches.
- **Server**: one push/pull tRPC procedure pair per entity (or a generic
  entity-keyed pair — implementer's call), same JWT-scoped `protectedProcedure`
  auth, same updatedAt comparison in the update path. Migration adds the
  three tables + `deleted_at` on tasks.
- **Client migration**: drizzle migration adding `deletedAt` columns; convert
  the delete call sites (bulk-delete, removeSubtask, replaceUncompletedSubtasks,
  removeCompletionAward, removeCutLooseAward) to tombstone writes; audit every
  `select` that must now filter tombstones (tasks queries, useSubtasks,
  star totals/log, netStarsByTask, bankedNetForTask, preferences reads).
- **Known accepted exposure**: LWW trusts device clocks for row comparison
  (existing behaviour). One-device assumption makes it moot; documented, not
  fixed.
- **Legacy state**: no reconciliation pass needed — the only real account
  (finn.merlett+1@gmail.com) was created 2026-08-15 and has no
  deleted-but-still-on-server rows.

## Tasks

| # | Item | Status |
|---|---|---|
| 1 | Shared schema: `deletedAt` on tasks (local+server), new subtasks / star_activity_log / preferences server tables + local `deletedAt` columns; migrations both sides | **done** — sqlite 0011 (hand-tuned: NOT NULL DEFAULT 0 + backfill for ledger `updated_at`, 0008 pattern; `sync_meta` 'singleton' → 'tasks' rename), pg 0005 (applied to supabase-local) |
| 2 | Convert the five hard-delete call sites to tombstones; sweep all reads to filter `deletedAt is null`; step-remove Undo flips to undelete | **done** — see notes |
| 3 | Generalize client `runSync` + server sync procedures to the four entities with per-entity cursors | **done** — per-entity procedure pairs chosen over the zod discriminator (dumber wire, full tRPC types); legacy `sync.push`/`sync.pull` names kept for deployed clients |
| 4 | Analytics: `sync_completed` gains per-entity pushed/pulled counts | **done** — `pushed`/`pulled` became cross-entity totals + 8 per-entity props |
| 5 | Tests: mobile sync integration (tombstone round-trip, resurrection regression, AI-replace + undo over sync, per-entity cursors, preference key-LWW) + server sync tests per entity incl. old-client no-deletedAt push | **done** — 381 mobile + 156 server green |
| 6 | E2E: `fullsync` fixture account (tasks + steps + ledger + preference) + flow 54 proving restore-after-wipe AND delete-stays-deleted | **done** — see verification |
| 7 | Ops: scheduled `pg_dump` for the supabase-local Postgres, retention 14 days | **done** — `scripts/ops/pg-backup.sh` + `com.onedown.pg-backup.plist` (launchd user agent, daily 09:00, installed + smoke-run: 584K dump) |
| 8 | OTA + phone verification once shipped | todo — publish OTA (picks up the client `AI note:` marker from 9.6 too), then verify sync end-to-end on the phone |

## Implementation notes (2026-08-15)

- **Schema/types**: `TaskData`/`SubtaskData` gained `deletedAt`;
  `StarActivityData` gained `deletedAt` + `updatedAt` (content clock — the
  ledger was insert-only and had none); new `PreferenceData` wire type. All
  four local tables carry AssertExact conformance checks; the three new pg
  mirrors (`subtasks`, `star_activity_log`, `preferences`) follow the tasks
  pattern (composite PK, `(user_id, synced_at)` index, `syncedAt` server
  write-clock). Ledger `taskId` is **text** on pg, not uuid — local rows use
  `''` for queue-level awards.
- **Old-client tolerance** (bun --hot hazard: the phone's 9.5 bundle pushes
  mid-development): `taskUpsertSchema.deletedAt` is `.nullable().default(null)`;
  pg migration applied BEFORE the hot-reloading server code referenced the
  column; server test pins the no-deletedAt-key push.
- **Tombstone conversions**: `deleteTasksPermanently` (tasks + cascade to
  subtasks), `deleteSubtask`, `replaceUncompletedSubtasks`,
  `removeCompletionAward`, `removeCutLooseAward`, and the step-actions
  `delete-created` undo plan — all UPDATE `deletedAt` (bumping `updatedAt`)
  instead of DELETE. `restoreSubtask` now revives the SAME row (upsert
  clearing the tombstone with an explicit fresh `updatedAt`, so the revival
  beats the already-synced tombstone). `setPreference` revives tombstoned
  keys.
- **Read sweep** (`deletedAt is null`): useTasks, useSubtasks,
  useBankedStars (both queries), useStarActivity, useStarTotals,
  listSubtasks, maxOrderIndex, bankedNetForTask, netStarsByTask,
  maybeAwardTriageQueueCleared (both reads), awardCompletionStars snapshot,
  getPreference, notification-scheduler. Status-filtered reads
  (offers/curation eligibility) are inherently safe — tombstoned tasks only
  ever hold terminal statuses today — but the unfiltered ones all gained the
  guard.
- **Client loop**: `runSync` iterates adapters in parent-first order
  (tasks → subtasks → star_activity → preferences), each with its own
  `sync_meta` row (id = entity key) and the unchanged 5.3 semantics
  (push-before-pull, newer-wins, 2s pull overlap, 500-row batches,
  reset-on-user-change). Earlier entities keep progress when a later one
  fails. Preferences match on `key` (per-user namespace, no cross-tenant
  rejection). use-sync's local-change trigger now watches max(updatedAt) on
  all four tables (useLiveQuery only re-fires on its primary table).
- **Known accepted exposure** (unchanged from the design): LWW trusts device
  clocks; one-device assumption makes it moot.

## Verification (2026-08-15)

- `bun run typecheck`, `bun run lint:check` — green.
- Mobile jest 381/381 (sync integration rewritten for the 4-entity
  transport; tombstone round-trip, resurrection regression, replace+undo
  over sync, entity cursors, preference key-LWW all covered). Server
  `bun test` 156/156 (per-entity push/pull describes; old-client
  compatibility push; tombstone flip round-trips).
- Flow 54 (new): restore-after-wipe of all four entities + the tombstone
  regression (archive → delete forever → wipe → sign-in → STAYS deleted),
  against the fresh keyless release APK.
- Full Maestro suite (tombstone base build): **35/35 passed** (second run;
  the first was 34/35 with flow 09 failing).
- Full Maestro suite (append-only-ledger build): 34/35 — every star/ledger
  flow green (15/16/17/24/27/54); the one failure was flow 09 again, and its
  failure screenshot found the REAL root cause: the completion toast eats
  the 'Open task list' tap (flow 24's documented trap — the app was still on
  home, with the counter correctly showing the new compensating-entry
  award). Fixed with flow 24's toast-expiry guard; flow 09 green solo;
  a confirmation full-suite run follows in the background.

## Follow-ups / revisit conditions

- **Build-vs-buy (2026-08-15, Finn's ruling): hand-rolled sync kept, but
  FROZEN.** Any increase in sync complexity past 9.7 — new conflict
  semantics, field-level merge, multi-device features, protocol changes —
  triggers a migration to PowerSync rather than extending this engine
  ("no iterative quick wins creeping us into a large hand-rolled sync
  system"). Adding a plain new entity to the existing pattern is fine.
  Standing traps to watch meanwhile: every new read of a synced table must
  filter `deletedAt is null`; every new write path must respect the
  updatedAt discipline.
- **Convention audit (2026-08-15, on Finn's ask): DONE same day.** The sync
  mechanics were convention-shaped already (tombstones for synced deletes,
  timestamp LWW, cursor + overlap). The one deviation — the mutable ledger —
  was refactored back to convention: the ledger is append-only again
  (dropped its `updatedAt`/`deletedAt`, sqlite 0012 + pg 0006), undo writes
  compensating rows (`completion_undone`, new `cut_loose_undone` reversing
  the newest award's amount capped by outstanding credit), and the churn
  filter is a pure display function (`star-ledger-display.ts`
  `visibleLedgerRows`, applied in useStarActivity): same-LOCAL-day do/undo
  pairs collapse; cross-day pairs stay visible as honest history (owner
  ruling). Anything not exactly matchable stays visible — the feed never
  hides stars it can't account for. Totals stay raw signed sums. Ledger
  sync is insert-only (createdAt cursor; a re-push is a stale echo), and the
  client/server sync seams gained a per-entity `clockOf` accessor to carry
  that.
- OTA (task 8): ready once this suite run is green — publish + phone
  verification remain.
