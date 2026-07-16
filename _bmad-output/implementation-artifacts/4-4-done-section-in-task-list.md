# Story 4.4: Done Section in Task List

Status: ready-for-dev
Spec written: 2026-07-16 (wave-based full-completion run)

## Story

As a user, I want to see my completed tasks in a dedicated section, So that I can see what I've accomplished today.

FRs: 49 (done section) · UX: TaskListView active view (ux-digest — "completed-tasks section at top; scroll position on entry shows a couple of done tasks, scroll up for more")

Local-only story. Independent of the star system (4.1–4.3) — can run in parallel with them.

## Acceptance Criteria

1. When completed tasks exist, the task overview list shows a "Done" section at the TOP of the list (above "To do") containing completed tasks; the placeholder copy from 1.5 ("Completed tasks will land here.") is gone.
2. On entry, the scroll position shows the "To do" section starting near the top with roughly two done tasks visible above it; the user can scroll UP to reveal earlier completions. With ≤2 done tasks no scroll adjustment is needed (everything already fits above the fold).
3. When no tasks are completed, the "Done" section header is hidden entirely (no header, no empty placeholder) — the list starts directly at "To do" (which drops its own header too when the done section is absent, restoring the pre-done-section look).
4. Done section ordering: oldest completion at the top, most recent completion closest to the "To do" boundary — so the entries visible on entry are the latest wins.
5. The "To do" section contains only `pending` + `in_progress` tasks (newest first, as today); `cut_loose` tasks appear in NEITHER section (recycle bin is Epic 7).
6. Done rows are visually muted (check icon, `text-typography-500` title) and are not tappable — no navigation to a card back that offers Start/Continue on a finished task.
7. The existing global empty state ("No tasks yet") still shows when there are no tasks at all.

## Implementation Plan

All changes concentrate in the task-list feature (expect merge coordination with 2.3 — see Dependencies).

- `apps/mobile/src/components/task-list/task-list-view.tsx` (MODIFY):
  - Export a pure helper `splitTasksForList(tasks: TaskData[]): { done: TaskData[]; todo: TaskData[] }` — `done` = `status === 'completed'` sorted by `updatedAt` ascending (proxy for completion time — no `completedAt` column; acceptable because completed tasks are no longer editable in-app); `todo` = `pending`/`in_progress` in the incoming order (the `useTasks` newest-first order); `cut_loose` dropped.
  - Replace the single `FlatList` with a `SectionList`:
    - Sections: `[{ key: 'done', title: 'Done', data: done }, { key: 'todo', title: 'To do', data: todo }]`, done section omitted when empty; the "To do" header renders only when the done section exists (AC3).
    - `renderSectionHeader` reuses current header typography (`text-lg font-semibold`, padding).
    - `renderItem` switches per section: existing `TaskRow` (pressable, chevron) for todo; new lightweight `DoneRow` for done — non-pressable `HStack`: `CheckIcon` (success-500) + muted title (+ completion date `toLocaleDateString` short, as the meta line). Plain View, so inner text stays visible to Maestro.
    - Keep `contentContainerClassName="gap-2 px-4 pb-8"`, `ListEmptyComponent` handling (SectionList shows it when ALL sections are empty — verify; otherwise render `EmptyState` conditionally when both arrays are empty).
  - Entry scroll (AC2): `ref` + one-shot adjustment once content is laid out — in `onContentSizeChange` (guard with a `ref` so it fires once), if `done.length > 2`, call `sectionListRef.current?.scrollToLocation({ sectionIndex: 1, itemIndex: 0, viewPosition: 0, viewOffset: DONE_PEEK_OFFSET })` where `DONE_PEEK_OFFSET ≈ 2 × row height (~64px) + gap` — this parks the "To do" header `DONE_PEEK_OFFSET` px down, leaving ~2 done rows peeking above. Provide `onScrollToIndexFailed` fallback (retry after `getNativeScrollRef` settles / a frame timeout). Variable row heights make this approximate — "a couple visible" is the bar, not pixel-perfection.
- `apps/mobile/src/app/task-list.tsx`: unchanged (still passes the full `useTasks()` array; filtering lives in the view/helper). Touch only if 2.3 already moved filtering here — reconcile toward the helper.
- `apps/mobile/src/components/task-list/task-list-view.stories.tsx` (MODIFY): update existing stories for the section shape; add `WithDoneTasks` (3+ done + several todo — the visual reference) and `NoDoneTasks` (header hidden).
- `apps/mobile/src/components/task-list/task-list-view.test.tsx` (MODIFY): portable-story coverage follows the stories; add unit assertions for `splitTasksForList` (see Testing).

## Analytics

None. Pure display/grouping — no domain mutation; the list screen view is a PostHog built-in. Do not add events.

## Testing Plan

- **Unit** — `splitTasksForList` (co-located test): completed→done sorted by `updatedAt` asc; pending+in_progress→todo preserving input order; `cut_loose` excluded from both; empty input → both empty.
- **Stories/portable** — `WithDoneTasks`: assert "Done" header, a done title, "To do" header all render; done row NOT pressable (no `Open task:` label); `NoDoneTasks`: assert "Done" absent (RNTL `queryByText`). Remember RNTL v14: `await render(...)` and await `fireEvent`.
- **Integration** — none new: status filtering is the unit-tested pure helper; SectionList rendering is framework.
- **Maestro** — `.maestro/18-story-4-4-done-section.yaml` (renumber to next free prefix): launch clean → quick-add "Alpha task", "Beta task", "Gamma task", "Delta task" → open task list → assert "Done" NOT visible, "Open task: Alpha task" visible (AC3 leg) → back → complete Alpha, Beta, Gamma (each: card back → Start → Done; after each completion the stack advances) → open task list → assert "Done" visible, "To do" visible, "Gamma task" (most recent completion, peeking) visible, "Open task: Delta task" visible → `takeScreenshot: 4-4-done-section` (key moment: entry scroll showing ~2 done rows above "To do") → back → home intact. Note: done-row assertions use plain title text ("Gamma task"), todo rows use the `Open task:` label — full-string selectors can't collide (1.5 lesson).

Gates: `bun run lint:check`, `bun run typecheck`, `bun run test`, `bun run storybook:generate`; E2E batched per wave.

## UX Notes

- Achievement framing: done-at-top is deliberate — opening the list leads with what you've accomplished today, but the resting scroll keeps "To do" in focus so the list stays actionable. Scroll UP for the pride tour.
- Done rows: calm and muted — check icon, no chevron, no interaction. No strikethrough (reads as deletion), no counts/badges.
- Copy: section headers exactly "Done" and "To do" (already established in 1.5's placeholder).
- The list remains a secondary, trust-building surface — no reordering, grouping, or sorting controls (deferred v0.2+).

## Dependencies

- **2.3 Complete a Task** (required): `completed` status must be reachable (E2E completes tasks through the running screen). 2.3's AC mentions completed tasks appearing "in the done section" — if 2.3 shipped a minimal interim grouping in `task-list-view.tsx`, this story supersedes it (header-hiding, ordering, DoneRow, entry scroll). Coordinate the diff — same file.
- NOT dependent on 4.1–4.3 (no star involvement) — schedule in parallel with them if slots allow.

## Out of Scope

- Recycle bin / cut-loose section, restore, bulk actions, multi-select, permanent delete (Epics 7 / 1.5-deferred scope).
- `completedAt` column (updatedAt proxy is fine until Epic 7 needs true completion timestamps).
- Done-task detail view or un-complete action.
- "Today only" scoping of the done section (epic text says completed tasks; day-scoped views can come with Epic 7's welcome-back work).
