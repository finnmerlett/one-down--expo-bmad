# Story 2.4: Cut Loose a Task

Status: ready-for-dev
Date: 2026-07-16
Mode: Full-completion run (wave orchestration; spec-first)

## Story

As a user, I want to release a task without guilt when it's no longer relevant, So that I can keep my task list clean without feeling bad.

FRs: 28, 29, 66 · UX-DRs: 21 (toast)

## Acceptance Criteria

1. Cut Loose is enabled on BOTH card-back surfaces (home overlay + list detail — one `CardBack` prop wires both) AND on the task running screen. No confirmation dialog anywhere — cutting loose is frictionless and guilt-free.
2. Tapping Cut Loose archives the task as `cut_loose` in local SQLite via `setTaskStatus` (never `UpdateTaskPatch`), and the card disappears: curation already excludes `cut_loose`, so the stack shows the next card; cutting the last browsable task shows "Nothing to browse right now".
3. An acknowledgment toast shows briefly (~2 s, top placement): "Released" including the star amount from `STAR_WEIGHTS.cutLoose` (shared constant, strictly less than `taskCompletion`). Star display only — earning/transactions are Epic 4.
4. In-flight text drafts are flushed BEFORE cut loose is reported on every surface (flush-then-act, 2.1 pattern) — released tasks keep their latest notes for later restore (Epic 7 recycle bin).
5. From the running screen: screen closes and the view returns to the card stack with the next card; if entered via list → detail, the user lands back on the task list (2.3's not-browsable self-pop covers `cut_loose`).
6. From the home overlay: the overlay unmounts and the stack advances (no route push involved).
7. A cut-loose task appears in NEITHER the To do nor Done sections of the task list (2.3's partition already excludes it — this story asserts it end-to-end).
8. Double-tap safe on every surface: one write, one `task_cut_loose` event, one toast, one dismiss/pop.

## Implementation Plan

### `apps/mobile/src/services/task-edits.ts`

```ts
export function cutLooseTask(
  task: TaskData,
  via: 'card_back_overlay' | 'list_detail' | 'task_running',
): void {
  if (task.status === 'completed' || task.status === 'cut_loose') return;
  void setTaskStatus(db, task.id, 'cut_loose')
    .then(() => track('task_cut_loose', { via, was_started: task.status === 'in_progress' }))
    .catch((error: unknown) => console.warn('Task cut loose failed', error));
}
```

Fire-and-forget, mirrors `completeTask`. Epic 4's `awardStars(...)` seam: comment next to the `track` call, do NOT implement stars.

### `apps/mobile/src/components/card-stack/card-back.tsx`

- New optional prop `onCutLoose?: () => void`; the Cut loose button becomes `isDisabled={!onCutLoose}` with `handleCutLoose` = flush title+details+notes, then `onCutLoose?.()` (exact `handleStart` pattern). After this story both card-back buttons are live on both surfaces — the disabled-placeholder branches disappear (2.1 review nit resolves itself; remove any stale comments).

### `apps/mobile/src/components/task-running/task-running-view.tsx`

- New optional prop `onCutLoose?: () => void`; Cut loose button enabled when provided; `handleCutLoose` = `flushNotes()` then `onCutLoose?.()`. Remaining disabled placeholder: only "Help me with this" (Epic 6).

### Route/surface wiring (toast copy identical everywhere: `RewardToast` title "Released", `stars: STAR_WEIGHTS.cutLoose`, `placement: 'top'`, `duration: 2000`)

- **`apps/mobile/src/app/index.tsx`** (home overlay): `onCutLoose` on `CardBackOverlay`'s `CardBack` → `cutLooseTask(openTask, 'card_back_overlay'); setOpenTaskId(null); toast.show(...)`. Unmount-then-toast; no route push, so no BackHandler landmine. Guard: `openTask` goes null on unmount so a second tap can't fire; keep the handler idempotent anyway. Check `card-back-overlay.tsx` pass-through — add `onCutLoose` alongside `onStart` if it forwards props explicitly. Update the stale "unreachable until 2.3/2.4" comment on the empty-curated branch (now reachable).
- **`apps/mobile/src/app/task/[id].tsx`** (list detail): `onCutLoose` → once-guard via existing `closedRef`-style ref → `cutLooseTask(task, 'list_detail'); toast.show(...); close();` (explicit pop for responsiveness; 2.3's not-browsable `useFocusEffect` self-pop is the backstop).
- **`apps/mobile/src/app/task-running/[id].tsx`**: `onCutLoose` → shared `actedRef` once-guard (same ref as Done, 2.3) → `cutLooseTask(task, 'task_running'); toast.show(...); close();`. If entered from list detail, the detail beneath self-pops on focus (2.3, condition already covers `cut_loose`) → user lands on the task list.

### `apps/mobile/src/components/feedback/reward-toast.stories.tsx`

- Add a "Released" variant story (component itself unchanged from 2.3).

No schema change, no migration, no server work. `STAR_WEIGHTS.cutLoose` already exists (2.3).

## Analytics

- `events.ts`: add `task_cut_loose: { via: 'card_back_overlay' | 'list_detail' | 'task_running'; was_started: boolean }`. Flat, PII-safe (no task text, NFR-S3). No star event (Epic 4).

## Testing Plan

- **Integration** (`task-edits.test.ts`, same harness as 2.3 — real in-memory DB via mocked `@/lib/local-db`, mocked `track`): `cutLooseTask` persists `cut_loose` from `pending` AND `in_progress` (with correct `was_started` prop) + emits once; no-op from `completed`/`cut_loose`.
- **Curation**: `curation.test.ts` — `cut_loose` excluded from the browsable set (add if not already covered by 2.3's completed-exclusion test).
- **Portable/RNTL**: `card-back.test.tsx` — Cut loose disabled without `onCutLoose`; flush-then-`onCutLoose` order via `invocationCallOrder` (mirror the 2.1 Start-order test). `task-running-view.test.tsx` — same two assertions for its `onCutLoose`.
- **Stories**: `card-back.stories.tsx` fully-wired variant (`onStart` + `onCutLoose`); `task-running-view.stories.tsx` all-actions-enabled variant; `reward-toast.stories.tsx` Released variant. `bun run storybook:generate`; commit `storybook.requires.ts`.
- **Maestro E2E** — `.maestro/10-story-2-4-cut-loose.yaml` (covers all three surfaces; both AC surfaces of the story text):
  1. `common/launch-app.yaml`; seed via `common/add-task.yaml`: 'Release from running', 'Release from overlay', 'Release from list'.
  2. **Running-screen surface**: open 'Release from running' card back → `Start task` → `tapOn: 'Cut loose'` → `assertVisible: 'Released'` and `'+2 stars'` → `takeScreenshot: .claude/run-notes/screenshots/2-4-released-toast` → back on home, that card gone, next card visible.
  3. **Overlay surface**: tap the 'Release from overlay' card → card back → `tapOn: 'Cut loose'` → toast asserted → card gone from stack.
  4. **List-detail surface**: `Open task list` → `tapOn: 'Open task: Release from list'` → `Cut loose` → toast → lands back on the task list; `assertNotVisible: 'Open task: Release from list'` and `assertNotVisible: 'Completed: Release from list'` (archived ≠ done, AC7); other released titles also absent.
  5. Back home → all cards released → `assertVisible: 'Nothing to browse right now'` (AC2 tail) → standard error-string closers.

Gates: `bun run lint:check`, `typecheck`, `test` re-run as the LAST step before commit.

## UX Notes

- Zero guilt: no confirmation, no warning color — Cut loose keeps its current outline (secondary) styling; destructive-frictionless tier (permanent delete with confirm lives ONLY in the list view, Epic 7).
- Toast: "Released · +2 stars" tone is acknowledgment + small reward, ~2 s, top placement, `accessibilityLiveRegion="polite"` via `RewardToast` (announce star awards).
- Flow 6: card → recycle bin (restorable, Epic 7), next card appears immediately. Copy is factual, never apologetic ("Released", not "Are you sure?").

## Dependencies

- **2.3** — hard dependency: `RewardToast` + gluestack toast install, `STAR_WEIGHTS`, `task_completed` twin patterns in `task-edits.ts`, detail-route not-browsable self-pop, task-list `cut_loose` exclusion, shared `actedRef` guard in the running route. Also file-conflict serialization (same files throughout).
- **2.1 (done)** — `setTaskStatus`, flush-then-act pattern, both card-back surfaces.

## Out of Scope

- Star earning/persistence/counter/log (Epic 4 — toast amount becomes calculation-backed in 4.1).
- Recycle bin UI, restore, permanent delete, bulk archive (Epic 7 / UX-DR14).
- Undo/snackbar-with-undo (restore path is Epic 7; MVP relies on the recycle bin).
- "Help me with this" (Epic 6).
