# Story 2.2: Add Notes During Execution

Status: done
Date: 2026-07-16
Mode: Full-completion run (wave orchestration; spec-first)

## Story

As a user, I want to add and edit notes while working on a task, So that I can capture thoughts and track progress.

FRs: 22 · Builds directly on Story 2.1's running screen.

## What already exists (2.1) vs what this story adds

Story 2.1 gave `TaskRunningView` a notes field with **draft/blur/flush** auto-save: saves on blur and on `beforeRemove` flush. The gap this story closes: notes typed but never blurred/flushed die with the process (crash, OS kill). AC1 demands *instantaneous* save to local storage **while typing** — add a debounced autosave so keystrokes reach SQLite within ~½ second of pausing, no blur required.

## Acceptance Criteria

1. Typing in the running screen's notes area persists the text to local SQLite automatically, with no save button and no blur required: after the user pauses typing for the debounce window (500 ms), the current text is written. Killing and relaunching the app after a pause shows the typed notes.
2. Blur and leave-screen (`beforeRemove`) still persist immediately (existing 2.1 behavior retained), and flushing cancels any pending debounce timer (no duplicate/out-of-order write from a stale timer).
3. Closing and re-opening the running screen (via Continue on either surface) shows all previously saved notes (2.1 regression AC — must stay green).
4. Autosave is change-gated: a debounce tick whose normalized text equals the stored value writes nothing (no spurious `updatedAt` bump).
5. The draft-or-stored pattern survives autosave: when a debounced write lands via the live query, text the user typed *after* the debounce fired is never clobbered, and trailing whitespace mid-sentence is never visually trimmed while editing.

## Implementation Plan

### `apps/mobile/src/components/task-running/task-running-view.tsx`

- Add `NOTES_AUTOSAVE_DEBOUNCE_MS = 500` (module const).
- On `onChangeText`: set draft (existing) AND (re)start a trailing debounce timer (`useRef<ReturnType<typeof setTimeout>>`). On fire, run the existing `flushNotes` **minus** the draft-drop side effects — factor a `persistNotes(draft)` helper used by both paths: normalize (`trim`, `'' → null`), compare to `task.notes ?? null`, call `onPatch({ notes })` only when different.
- `flushNotes` (blur + imperative `flush`) clears the pending timer first, then persists. Clear the timer in a `useEffect` cleanup on unmount too (flush has already run via `beforeRemove`).
- **Change the draft-drop effect** — this is the load-bearing subtlety. Current code drops the draft on ANY `task.notes` change; with mid-session writes landing, that loses keystrokes typed after the debounce fired, and a stored trim of trailing whitespace would visibly eat the space the user just typed mid-sentence. Replace with a *catch-up* drop on RAW equality:
  ```ts
  useEffect(() => {
    if (notesDraft !== null && notesDraft === (task.notes ?? '')) setNotesDraft(null);
  }, [task.notes, notesDraft]);
  ```
  Semantics: the draft drops only once the rendered stored value equals it exactly. A draft with trailing whitespace simply stays a live draft (harmless — blur flush is change-gated). An external writer changing notes mid-edit no longer clobbers the active draft — the active editor wins; document inline that this is the intended single-writer semantics until Epic 6 adds concurrent writers (revisit then, per 2.1 review note).

### `apps/mobile/src/services/task-edits.ts`

- Add `createNotesAutosaver(taskId: string): (notes: string | null) => void` — module-scoped fire-and-forget `updateTask(db, taskId, { notes })` like `applyTaskPatch`, but tracks `task_edited { field: 'notes' }` **only on the first successful write per saver instance** (closure boolean). Rationale: debounced saves would otherwise spam `task_edited` on every pause; once per running-screen session keeps the event honest ("user edited notes during execution").

### `apps/mobile/src/app/task-running/[id].tsx`

- Replace `onPatch={(patch) => applyTaskPatch(task.id, patch)}` with a per-mount saver: `const saveNotes = useMemo(() => createNotesAutosaver(id), [id]);` and `onPatch={(patch) => saveNotes(patch.notes ?? null)}`. (The running view only ever patches notes.)
- No other route changes; `beforeRemove` flush stays.

Card-back notes (both surfaces) are deliberately unchanged — blur/flush save only; FR22 is about the execution screen.

## Analytics

- **No new taxonomy entries** (`events.ts` untouched). `task_edited { field: 'notes' }` emission from the running screen becomes at-most-once per screen session via `createNotesAutosaver`; card-back emission is unchanged. Never any note content in props (NFR-S3).

## Testing Plan

### Component (portable/RNTL, extend `task-running-view.test.tsx`, fake timers)

RNTL v14: `await render(...)`, `await fireEvent(...)` always; `jest.useFakeTimers()` + `jest.advanceTimersByTime` wrapped in `act`.

1. Typing then advancing 500 ms fires `onPatch` once with the normalized text.
2. Continuous typing (changes < 500 ms apart) fires nothing until the pause; only the final text is written (trailing debounce).
3. Blur after a pending timer flushes immediately and the stale timer does NOT fire a second patch afterwards.
4. Debounce tick with text equal to stored value → no `onPatch` (change gate, AC4).
5. Catch-up drop: rerender with `task.notes` = the just-saved text → field still shows the text and further typing works; rerender with a DIFFERENT external `task.notes` while a draft is live → the draft text stays visible (documented semantics, AC5).
6. Existing flush-handle and draft-or-stored tests stay green.

### Unit / integration

- None new — the debounce lives in the component (tested above); `updateTask` notes persistence is already covered by `tasks-repository.test.ts`. `createNotesAutosaver`'s once-only tracking: small test in a new `task-edits.test.ts` with `jest.mock('@/lib/local-db', ...)` injecting `createTestDb().db` (real in-memory DB, real migration SQL) and `jest.mock('@/lib/analytics/track')` — two saves, one `task_edited` emission, both rows' notes verified real.

### Maestro E2E — `.maestro/08-story-2-2-notes-autosave.yaml`

Key moment: notes typed with NO blur/flush survive process death.

1. `runFlow: common/launch-app.yaml` (clean state).
2. **Create `.maestro/common/add-task.yaml`** (DRY — 07 inlines this; 09/10 will reuse): parameterized via `env` (`TITLE`), steps copied from flow 07's seeding block (`tapOn: 'Add task'` … `tapOn: 'Close add task'`). Call it with `TITLE: 'Notes survive task'`.
3. Open card back → `tapOn: 'Start task'` → on running screen `tapOn: 'Task notes'` → `inputText: 'Typed and never blurred'`.
4. Idle past the debounce WITHOUT blurring: `extendedWaitUntil: { visible: 'NEVER_PRESENT_ANCHOR', timeout: 1500, optional: true }` (Maestro sleep idiom — waits the full timeout then continues).
5. `stopApp`, then `launchApp` (NO `clearState` — must not use the common launch subflow here).
6. Card front shows `Continue`; open the back → `tapOn: 'Continue task'` → `assertVisible: 'Typed and never blurred'`.
7. `takeScreenshot: .claude/run-notes/screenshots/2-2-notes-survive-kill` at that moment.
8. Standard closers: `assertNotVisible: 'Unhandled'` / `'error occurred'`.

## UX Notes

- No visible UI change: auto-save everywhere, instantly, no save buttons, no "unsaved changes" warnings (UX consistency rules). No "Saved" toast for notes — saving is ambient; acknowledgment toasts are for actions (2.3/2.4).
- Notes field placement/copy unchanged ("Jot things down as you go").

## Dependencies

- **2.1 (done)** — running screen, draft-or-stored notes field, flush plumbing, `/task-running/[id]` route.
- Nothing else. Schema untouched (no migration).

## Out of Scope

- Card-back notes autosave-while-typing (blur/flush save remains sufficient there).
- Concurrent-writer reconciliation (Epic 6 AI breakdown writes into notes — revisit the catch-up-drop semantics then).
- Any subtask UI above the notes area (Epic 6).
- Stars, toasts, status changes (2.3/2.4).
