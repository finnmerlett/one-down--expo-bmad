# Story 7.1: Bulk Archive & Delete

Status: ready-for-dev
Date: 2026-07-16 (spec written for wave-based full-completion run)

## Story

As a user, I want to bulk-archive tasks and permanently delete from the archive, So that I can clean up my task list efficiently.

FRs: 31 · UX-DRs: 14 (bulk actions, recycle bin)

## Acceptance Criteria

1. On the task overview list, long-press on a row (or a checkbox toggle affordance) enters multi-select mode; multiple tasks can be selected/deselected; a visible count + action bar appears.
2. Archiving a selection that contains any started (`in_progress`) or completed task shows a warning dialog stating that stars earned from those tasks will be removed. Confirming archives all selected tasks, removes those stars from the user's total (negative star-ledger transactions), and shows a confirmation toast.
3. Archiving a selection of only never-started tasks (`pending`) requires no warning — tasks archive immediately with a confirmation toast.
4. Archived tasks move to a Recycle bin tab on the task list screen (which also shows `cut_loose` tasks from Story 2.4). They disappear from the active list, the done section, and the card stack.
5. In the Recycle bin tab, multi-select + Delete shows a confirmation dialog ("permanent, can't be undone"); confirming permanently deletes the rows from the local DB.
6. Restoring a task from the recycle bin returns it to the active list with status `pending`. Stars previously removed are NOT restored (no reverse tracking — keep simple).
7. Cancelling/dismissing either dialog (archive warning or permanent delete) takes no action and preserves the current selection.
8. Exiting multi-select mode (back or "Cancel"/X) clears the selection; hardware back exits multi-select before popping the screen.

## Implementation plan

### Data model

- `packages/shared/src/types/task.ts` — add `'archived'` to `TASK_STATUSES` (before `cut_loose` or at end; order is cosmetic). This is a TS-only change: `status` is a plain text column with no CHECK constraint, so **no drizzle-kit migration is needed**. The `AssertExact` conformance check in `schema-local/tasks.ts` stays green (union widens on both sides via the shared type).
- Rationale for a distinct status (vs reusing `cut_loose`): cut loose AWARDS stars (2.4); archive RETRACTS them. The bin shows both; restore treats both the same.
- Verify curation (`apps/mobile/src/services/curation.ts`) already excludes archived (it whitelists `pending`/`in_progress` — no change needed, add a test assertion). Verify Epic 4.4's done section only shows `completed` (archived completed tasks must drop out).
- If Epic 5 has landed: the server `pgTable` in `packages/shared/src/schema/` shares the same `TaskStatus` type — no column change, but confirm any status enums/Zod validation in the sync layer accept `archived`.

### Repository / services

- `apps/mobile/src/services/tasks-repository.ts` — add:
  - `archiveTasks(db, ids: string[])` — batch `update ... set status='archived', updatedAt=now where id in (...)`.
  - `restoreTask(db, id)` — sets status `pending` (single-task restore is enough for MVP).
  - `deleteTasksPermanently(db, ids: string[])` — `delete from tasks where id in (...)`. Also delete/orphan-handle related rows (star transactions from 4.1, subtasks from 6.3 if that table exists) — follow the shipped schema; star transactions should be KEPT (they are the historical ledger; FK-free by design in 4.1) unless 4.1 shipped a hard FK, in which case cascade.
- New `apps/mobile/src/services/task-archive.ts` (module-scoped service like `task-edits.ts`): orchestrates archive = star retraction + status change + analytics.
  - Star retraction depends on the **Epic 4.1 star ledger** (`star_transactions` table + repository in `apps/mobile/src/services/` / `packages/shared/src/schema-local/`). Read the shipped 4.1 code and use its actual API. Required capability: net star sum per task, and inserting a negative transaction. Per selected task with net positive stars, insert one negative transaction (action type e.g. `'archive_retraction'` — extend 4.1's action enum) for `-net`. Restore inserts nothing.
  - `needsArchiveWarning(tasks, netStarsByTask)` — pure: true when any selected task has status `in_progress`/`completed` OR net positive stars (defensive: covers subtask stars on tasks whose status is still `pending` — shouldn't happen, cheap to cover).
  - Wrap writes in a transaction if 4.1's repo exposes one; otherwise sequential awaits are acceptable (single-user local DB).

### UI

- `apps/mobile/src/app/task-list.tsx` — owns tab state (`active` | `recycle_bin`), multi-select state (`Set<string>` of ids, `null` = not selecting), and dialog state. Hardware/gesture back while selecting exits multi-select (use `beforeRemove` listener pattern from 1.5 — preventDefault when selection active).
- `apps/mobile/src/components/task-list/task-list-view.tsx` — extend: selection props (`selectedIds`, `onToggleSelect`, `onLongPress`), checkbox rendered on rows in multi-select mode (gluestack `checkbox` — `npx gluestack-ui add checkbox`), row a11y labels gain state ("Selected, task: X"). Recycle-bin variant: rows show a Restore button instead of chevron; filter/donesection logic driven by a `mode` prop rather than a second list component.
- New `apps/mobile/src/components/task-list/bulk-action-bar.tsx` — bottom bar shown in multi-select: "N selected", Archive (active tab) / Delete + Restore (bin tab), Cancel. Plain NativeWind styling; 44pt touch targets.
- Dialogs: gluestack `alert-dialog` (`npx gluestack-ui add alert-dialog`). Copy below in UX notes. Toast: reuse the toast setup from 2.3/2.4 (gluestack `toast` — already installed by Epic 2; if not, add it).
- Tabs: simple two-segment control at the top of the list screen (no router tabs — this is component state). Recycle bin empty state copy: "Nothing here — everything's active."

## Analytics (events.ts additions)

- `tasks_archived: { count: number; stars_removed: number; warned: boolean }`
- `tasks_deleted_permanently: { count: number }`
- `task_restored: { from: 'recycle_bin' }`
All counts/enums — no task text (NFR-S3). Emit after successful writes, from `task-archive.ts`.

## Testing plan

- **Integration** (createTestDb + real migration SQL, extend `tasks-repository.test.ts` + new `task-archive.test.ts`):
  - archive of started/completed tasks inserts correct negative ledger transactions (net-sum based, incl. a task with completion + bonus transactions) and sets status `archived`.
  - archive of pending-only selection inserts no transactions.
  - restore → `pending`; ledger untouched (stars not restored).
  - permanent delete removes rows; ledger history preserved (or cascaded per 4.1's actual FK — assert whichever shipped).
  - `needsArchiveWarning` truth table (can be plain unit asserts in the same file).
  - curation test: `archived` tasks excluded from the stack.
- **Stories** (co-located, portable-stories crash coverage is automatic): `task-list-view.stories.tsx` gains multi-select and recycle-bin stories; `bulk-action-bar.stories.tsx` new. Dialog stories use the local-state pattern from run-notes (never pin `isOpen: true`).
- **Maestro** (one flow, `.maestro/NN-story-7-1-bulk-archive-and-delete.yaml`, next free sequence number; DRY via `common/launch-app.yaml`):
  1. Launch clean → quick-add two tasks ("Archive me A", "Archive me B").
  2. Start + complete task A via UI (card back → Start → Done, per 2.1/2.3 flows) so it has earned stars.
  3. Open task list → long-press row B → multi-select → also select A (in done section) → Archive → **warning dialog appears** → `takeScreenshot` here → Cancel → assert selection preserved → Archive → Confirm → toast asserted.
  4. Switch to Recycle bin tab → both rows visible → Restore B → active tab shows B again.
  5. Bin: select A → Delete → confirm dialog → Confirm → assert A not visible in bin.
  Use full-string a11y labels (1.5 convention: prefixed row labels) so "Archive me A" selectors can't collide.

## UX notes

- Tone: housekeeping utility, zero guilt. Warning dialog copy: title "Remove stars?" body "Archiving started or completed tasks removes the stars they earned. This can't be undone, even if you restore them later." actions "Cancel" / "Archive anyway". Delete dialog: "Delete permanently?" / "This can't be undone." / "Cancel" / "Delete".
- Toasts (~2s, top, DR21): "Archived N tasks" (append " — ★N removed" when stars were retracted), "Deleted N tasks", "Restored".
- Multi-select entry: long-press anywhere on a row; thereafter tap toggles. Checkbox on the left of each row. Selection count in the action bar.
- No confirmation for restore (frictionless, reversible-in-spirit).
- Back navigation: system back exits multi-select first (DR: no dead ends), then pops.

## Dependencies

- **1.5** task overview list (exists), **2.3/2.4** `completed`/`cut_loose` statuses + toast pattern + cut-loose tasks populating the bin, **4.1** star ledger (transactions table + repo — hard dependency for retraction), **4.4** done section (archived completed tasks must leave it). Epic ordering already guarantees 4 before 7.
- Coordination: touches `packages/shared/src/types/task.ts` (status union) — anything validating status enums (5.3 sync Zod, 6.x) must accept `archived`; schedule after 5.3 lands or flag to that wave.

## Out of scope

- Bulk cut-loose, bulk change context/size (post-MVP per UX spec).
- "Keep stars / Retract stars" toggle on the delete dialog (UX spec mentions it; epics AC supersedes with a plain confirm — stars were already handled at archive time).
- Restoring removed stars, reverse tracking, undo.
- Grouping/sorting of the list (v0.2+).
