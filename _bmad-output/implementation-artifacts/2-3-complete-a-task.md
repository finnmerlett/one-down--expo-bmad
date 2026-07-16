# Story 2.3: Complete a Task

Status: done
Date: 2026-07-16
Mode: Full-completion run (wave orchestration; spec-first)

## Story

As a user, I want to mark a task as complete and feel satisfaction, So that I'm motivated to keep going.

FRs: 24, 25 · UX-DRs: 21 (completion feedback)

## Acceptance Criteria

1. Tapping the (now enabled) Done button on the task running screen marks the task `completed` in local SQLite via the dedicated status path (`setTaskStatus`, never `UpdateTaskPatch`).
2. A toast shows at the TOP of the screen indicating the star award — copy includes the star amount read from the shared star-weights constant (`STAR_WEIGHTS.taskCompletion`). Star *earning* (transactions, counter) is Epic 4; this story only displays the amount. Toast auto-dismisses after ~2 s.
3. The running screen closes and the card stack shows the next card (completed tasks already drop out of `curateTasks`). Completing the only browsable task shows the existing "Nothing to browse right now" state — update the stale "unreachable until 2.3/2.4" comments in `app/index.tsx`.
4. In-flight notes drafts are flushed BEFORE completion is reported (same flush-then-act ordering as 2.1's `handleStart`) — no typed note is lost by tapping Done with the keyboard up.
5. A completed task appears in the task overview list under the "Done" section header (replacing the 1.5 placeholder copy when done tasks exist); it no longer appears under "To do". Done rows are display-only (no `Open task:` press target). Cut-loose tasks (2.4) appear in NEITHER section.
6. Done is double-tap safe: one status write, one `task_completed` event, one toast, one pop.
7. If the user reached the running screen via task list → detail, finishing the task returns them to the task list (the detail screen beneath must not strand them on a completed task's card back).

## Implementation Plan

### `packages/shared/src/constants/star-weights.ts` (new) + `constants/index.ts` re-export

Centralized star weights per architecture (importable both sides; OTA-tunable via sync in a future version):

```ts
export const STAR_WEIGHTS = {
  taskCompletion: 5,
  cutLoose: 2, // consumed by Story 2.4 — must stay < taskCompletion
  subtaskCompletion: 1, // Epic 6
  triageConfirmation: 1, // Epic 6
} as const;
```

Values are provisional defaults; Epic 4 (4.1) adds urgency/size/deadline bonus weights and the real earning pipeline. Add `export * from './star-weights';` to `packages/shared/src/constants/index.ts`.

### Toast foundation

- `npx gluestack-ui add toast` → `apps/mobile/src/components/ui/toast/index.tsx`. `ToastProvider` is ALREADY mounted inside our `GluestackUIProvider` — no provider change. ⚠️ The gluestack CLI damages configs (babel/metro/tsconfig, pins) — `git checkout` all configs after running it, keep only the component + any new runtime deps (decisions-log 1.1/1.2).
- `apps/mobile/src/components/feedback/reward-toast.tsx` (new, presentational) + `reward-toast.stories.tsx` + `reward-toast.test.tsx`: renders a gluestack `Toast` with `title` (e.g. "One down!") and `stars: number` → "+5 stars" (singular/plural). Give the content `accessibilityLiveRegion="polite"` so TalkBack announces the award (UX a11y: announce task completion/star awards). Reused verbatim by 2.4 ("Released").
- Show pattern (in routes): `const toast = useToast(); toast.show({ placement: 'top', duration: 2000, render: ({ id }) => <RewardToast nativeID={...} title="One down!" stars={STAR_WEIGHTS.taskCompletion} /> })`. The toast renders at the provider root, so it survives the route pop.

### `apps/mobile/src/services/task-edits.ts`

```ts
export function completeTask(task: TaskData): void {
  // pending is allowed: the startTask write may not have landed yet (2.1 race).
  if (task.status === 'completed' || task.status === 'cut_loose') return;
  void setTaskStatus(db, task.id, 'completed')
    .then(() => track('task_completed', { size: task.size, had_notes: task.notes !== null }))
    .catch((error: unknown) => console.warn('Task complete failed', error));
}
```

Fire-and-forget like `startTask`; Epic 4's `awardStars(...)` slots in next to the `track` call — leave a seam comment, do NOT implement stars.

### `apps/mobile/src/components/task-running/task-running-view.tsx`

- New optional prop `onDone?: () => void`; Done button `isDisabled={!onDone}`, `onPress={handleDone}` where `handleDone` = flush notes (existing `flushNotes`), then `onDone?.()` — exact 2.1 `handleStart` pattern (order unit-tested).

### `apps/mobile/src/app/task-running/[id].tsx`

- Wire `onDone`: once-guarded (an `actedRef`, re-used by 2.4's Cut Loose — a stale `task.status` prop makes the service gate insufficient against double-taps): `completeTask(task); toast.show(...RewardToast...); close();` (`close` already once-guards the pop). `beforeRemove` flush still runs but the view's flush-then-`onDone` already persisted the draft (AC4).

### `apps/mobile/src/app/task/[id].tsx` — detail must not strand (AC7)

The detail route stays mounted beneath the running screen (2.1 landmine). When the task leaves the browsable set while this screen is in the stack, self-pop **only when focused** (calling `router.back()` while NOT top-of-stack would pop the running screen instead — race):

```ts
useFocusEffect(
  useCallback(() => {
    if (task && task.status !== 'pending' && task.status !== 'in_progress') close();
  }, [task?.status]),
);
```

`useFocusEffect` re-runs on focus AND on dep change, covering both orderings of pop vs. live-query emit. Write the condition as "not browsable" so 2.4's `cut_loose` free-rides. `close()` is already once-guarded.

### `apps/mobile/src/components/task-list/task-list-view.tsx`

- Partition input: `done` = `status === 'completed'` (sort `updatedAt` desc — no `completedAt` column, do not add one); `todo` = `pending`/`in_progress` (existing order); `cut_loose` excluded entirely (recycle bin arrives Epic 7).
- Done section: keep the `Done` header; render done rows above the `To do` header; keep the 1.5 placeholder copy ("Completed tasks will land here.") ONLY when no done tasks exist (hiding the header entirely is Story 4.4). Done rows: non-pressable, muted styling, a11y label `Completed: {title}` (distinct full-string selector vs `Open task: {title}`).
- Simplest structure: keep one FlatList over `todo` and render the done section inside `ListHeaderComponent` (done lists stay short pre-Epic-7; avoids SectionList churn).

## Analytics

- `events.ts`: add `task_completed: { size: 'quick_win' | 'big_time' | null; had_notes: boolean }`. Flat, PII-safe — never title/details/notes content (NFR-S3). No star event (Epic 4 owns `stars_awarded`).

## Testing Plan

- **Integration** (`task-edits.test.ts`, from 2.2 — `jest.mock('@/lib/local-db')` injecting `createTestDb` + real migration SQL; `track` mocked): `completeTask` from `in_progress` AND from `pending` persists `completed` + emits once; no-op (no write, no event) from `completed`/`cut_loose`.
- **Curation**: `curation.test.ts` — assert `completed` is excluded (add if 2.1's update didn't cover it).
- **Portable/RNTL**: `task-running-view.test.tsx` — Done disabled without `onDone`; flush-then-`onDone` order via `invocationCallOrder`. `task-list-view.test.tsx` — completed task renders in Done section, absent from To do; `cut_loose` task renders nowhere; placeholder copy shown when no done tasks. `reward-toast.test.tsx` — composeStories crash test + plural/singular star text.
- **Stories**: `reward-toast.stories.tsx` (completion variant); update `task-running-view.stories.tsx` (Done enabled) and `task-list-view.stories.tsx` (with-done-tasks variant). Run `bun run storybook:generate`; commit `storybook.requires.ts`.
- **Maestro E2E** — `.maestro/09-story-2-3-complete-task.yaml`: `common/launch-app.yaml`; seed TWO tasks via `common/add-task.yaml` (from 2.2) — 'Finish me first' and 'Next in line'; open 'Finish me first' back → `Start task` → running screen → `tapOn: 'Done'` → `assertVisible: 'One down!'` and `'+5 stars'` (assert fast — 2 s toast) → `takeScreenshot: .claude/run-notes/screenshots/2-3-completion-toast` → home shows `'Task: Next in line. Card 1 of 1'` and NOT the completed card → `tapOn: 'Open task list'` → `assertVisible: 'Completed: Finish me first'`, `assertVisible: 'Open task: Next in line'`, `assertNotVisible: 'Open task: Finish me first'` → standard error-string closers.

Gates: `bun run lint:check`, `typecheck`, `test` — re-run lint/typecheck LAST (gluestack CLI + expo invocations rewrite configs).

## UX Notes

- Toast: top placement, ~2 s, positive copy — suggestion: title "One down!" (app-name pun), body "+5 stars". Completion is celebration, never interruption: no modal, no confirm.
- Flow 5: Done → task removed → next card immediately (stack's existing promote animation covers motion; `animationsDeferred: true` — no custom completion animation).
- No red/negative states anywhere; completed rows in the list are calm/muted, an achievement record ("show what's done").

## Dependencies

- **2.1 (done)** — running screen, `setTaskStatus`, curation browsable-set.
- **2.2** — file-conflict serialization only (same files: `task-running-view.tsx`, `task-edits.ts`, running route, maestro common subflow). No functional dependency.
- Creates for 2.4: `STAR_WEIGHTS`, `components/ui/toast`, `RewardToast`, the detail-route not-browsable self-pop, list `cut_loose` exclusion.

## Out of Scope

- Star earning/persistence, counter, activity log, bonus calculations (Epic 4 — 4.1 replaces the displayed flat amount with the real calculation).
- Done-section polish: hiding the header when empty, entry scroll position (4.4); viewing/restoring completed tasks (Epic 7).
- Cut Loose (2.4). "Help me with this" stays a disabled placeholder (Epic 6).
