# Story 9.7 — Full account sync with tombstones

**Status:** designed 2026-08-15, not started
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
| star_activity_log | NEW | NOT append-only: undo paths hard-DELETE award rows today (removeCompletionAward, removeCutLooseAward) — switch those to tombstones; totals and the activity feed exclude tombstoned rows, preserving the deliberate "undo leaves no trace" UX |
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
| 1 | Shared schema: `deletedAt` on tasks (local+server), new subtasks / star_activity_log / preferences server tables + local `deletedAt` columns; migrations both sides | todo |
| 2 | Convert the five hard-delete call sites to tombstones; sweep all reads to filter `deletedAt is null`; step-remove Undo flips to undelete | todo |
| 3 | Generalize client `runSync` + server sync procedures to the four entities with per-entity cursors | todo |
| 4 | Analytics: `sync_completed` gains per-entity pushed/pulled counts | todo |
| 5 | Tests: extend mobile sync integration tests (tombstone round-trip, resurrection regression, AI-replace + undo over sync) and server sync tests per entity | todo |
| 6 | E2E: seed script gains subtask + ledger fixtures for at least one account; new/extended flow proving steps + stars survive sign-out → wipe → sign-in | todo |
| 7 | Ops: scheduled `pg_dump` for the supabase-local Postgres (launchd/cron on this Mac), retention ~14 days, documented in the story | todo |
| 8 | OTA + phone verification once shipped | todo |

## Open items

- Generic-vs-per-entity tRPC procedure shape — implementer's call at build
  time (leaning generic with a zod discriminator; keep the wire shape dumb).
- Whether `preferences` should exclude device-local keys (if any exist by
  then) via an allowlist — decide when the table's contents are audited in
  task 1.
