# Story 6.4: AI Breakdown Feedback & Retry

Status: ready-for-dev
Date: 2026-07-16
Mode: wave-based autonomous run (spec-first; fresh-context review before commit)

## Story

As a user, I want to refine an AI breakdown that missed the mark, So that I get useful subtasks without starting from scratch.

FRs: 39, 42 · Split: both (two new AI procedures + mobile refine/nudge UI).

## Acceptance Criteria

1. When AI-generated subtasks exist on the task running screen, the subtask section shows a "Refine" button that expands an inline feedback input (placeholder "Why does this miss the mark?") with a submit button. Empty feedback can't submit.
2. Submitting calls tRPC `ai.refineBreakdown` with task title/details/notes, the feedback text, and the current subtasks (`{ title, completed }[]`). A loading indicator shows in the subtask area ("Rethinking the steps..."); the rest of the screen stays interactive.
3. The response carries (a) `notesDistillation` — useful info distilled from the feedback, which is immediately APPENDED to the task's notes (visible in the notes field via the existing draft-or-stored resync), and (b) replacement steps, shown as a proposal (reusing 6.3's proposal UI, labeled "Refined steps").
4. Accepting the refined proposal deletes the task's UNCOMPLETED AI subtasks and inserts the new steps; COMPLETED subtasks are never modified (UX-DR7). Rejecting keeps everything as-is (notes keep the distillation — it's useful information either way).
5. Swiping past (skipping) a card increments a persistent per-task `skipCount`; starting the task resets it. When the top card's task has `skipCount >= 5` (constant), a calm nudge appears under the stack: "Stuck on this? Get a tiny first step" (FR39).
6. Tapping the nudge calls `ai.suggestMicroTask`; the returned single micro-step is shown inline with "Add it" / "No thanks". Add → saved as one subtask (`source: 'micro'`) + skipCount reset; No thanks → skipCount reset (quiet for another 5 skips). Errors show inline with retry.
7. **Local mode:** fake provider returns deterministic refined steps, distillation, and micro-task (below) — full flows run locally/E2E; identical shapes with real Gemini.

## Implementation plan

### Shared (`packages/shared`)

- `src/types/ai.ts`: `RefineBreakdownResult { steps: string[]; notesDistillation: string | null; provider: AiProviderName }`, `MicroTaskResult { step: string; provider: AiProviderName }`.
- `src/types/task.ts` + `src/schema-local/tasks.ts` + `src/schema/tasks.ts` (pg): add `skipCount: number` (`skip_count` integer notNull default 0) to `TaskData` and both tables (`AssertExact` forces parity); drizzle-kit migrations BOTH sides (mobile + server), committed.
- `src/constants/ai-limits.ts`: `MICRO_TASK_SKIP_THRESHOLD = 5` (matches planning threshold "avoided: 5 skips" — Epic 7 avoidance detection should reuse `skipCount` + this constant).

### Server (`apps/server`) — independently schedulable

- `src/services/ai/provider.ts`: extend `AiProvider` with `refineBreakdown(input: { title; details; notes; feedback: string; subtasks: { title: string; completed: boolean }[] }): Promise<{ steps: string[]; notesDistillation: string | null }>` and `suggestMicroTask(input: { title; details; notes }): Promise<string>`.
- `src/services/ai/gemini-provider.ts`: refine prompt = original task context + feedback + existing steps (completed ones marked "keep, do not regenerate"); asks for replacement steps for the uncompleted portion + a one-line distillation of durable facts from the feedback (or null if none). Micro prompt = "single smallest physical first step, under 100 chars". Pure `mapRefineResponse` / `mapMicroResponse` (zod, clamps: ≤10 steps ≤140 chars, distillation ≤200 chars). Never log task text or feedback (NFR-S3).
- `src/services/ai/fake-provider.ts`: deterministic —
  - refine: steps = 6.3's `first_steps` templates prefixed `'Refined: '` (3 steps); `notesDistillation` = `'Approach note: ' + feedback.trim().slice(0, 140)`.
  - micro: `'Do just the very first minute of "<title>"'`.
- `src/routers/ai.ts`: `refineBreakdown` mutation (zod: feedback `min(1).max(500)`, subtasks array ≤20) → `RefineBreakdownResult`; `suggestMicroTask` mutation → `MicroTaskResult`. `publicProcedure` (6.1 decision; gating in 8.2b).

### Mobile (`apps/mobile`)

- `src/services/subtasks-repository.ts`: add `replaceUncompletedSubtasks(db, taskId, steps, source)` — delete uncompleted rows for the task, insert new ones after the highest existing orderIndex; returns `{ deletedCount, insertedCount }`.
- `src/services/task-activity.ts` (new): `recordTaskSkipped(taskId)` — fire-and-forget `skipCount + 1` bump (repo helper `incrementSkipCount(db, id)`; do NOT touch `updatedAt` — behavioral metadata must not win 5.3's last-content-changed sync conflicts) and `resetSkipCount(db, id)`. `startTask` (task-edits.ts) also resets on the pending→in_progress transition.
- `src/components/card-stack/card-stack.tsx`: new optional `onSwipe?(task)` prop invoked when a swipe commits (cycling past the top card); home wires it to `recordTaskSkipped`. Keep it a pass-through — no store, no DB in the stack.
- `src/hooks/use-breakdown.ts` (6.3): add `refine(feedback)` — calls `trpc.ai.refineBreakdown`, on response: append distillation to notes via `applyTaskPatch(task.id, { notes: appended })` (append helper: `notes ? notes + '\n\n' + distillation : distillation`; skip when null) and enter `proposal` state flagged `via: 'refine'`; `accept()` for a refine proposal calls `replaceUncompletedSubtasks` instead of `createSubtasks`.
- `src/components/task-running/subtask-list.tsx`: "Refine" button (only when AI subtasks exist) → expands inline feedback `Textarea` (`aria-label="Breakdown feedback"`) + "Send feedback" button; controlled via props from the view (presentational).
- `src/components/task-running/breakdown-proposal.tsx`: heading variant "Refined steps" when `via: 'refine'`.
- `src/components/card-stack/micro-task-nudge.tsx` (+ `.stories.tsx`, new): rendered by `app/index.tsx` UNDER the stack (not inside card internals — minimizes Epic 3 conflict surface) when the top curated card's `skipCount >= MICRO_TASK_SKIP_THRESHOLD`, status pending, and not in review mode. States: idle chip ("Stuck on this? Get a tiny first step", a11y label "Get a tiny first step"), loading, proposal (step text + "Add it" / "No thanks"), error+retry. Mutation owned by a tiny `use-micro-task.ts` hook or inline in index.tsx (component stays presentational).
- Accept → `createSubtasks(db, task.id, [step], 'micro')` + reset; the subtask then shows on the running screen via 6.3's list.

## Analytics (extend `events.ts`)

- `breakdown_feedback_submitted: { char_count: number }`
- `breakdown_refined: { step_count: number, kept_completed_count: number, has_distillation: boolean, duration_ms: number, provider: 'gemini' | 'fake' }`
- 6.3's `breakdown_accepted` / `breakdown_rejected` gain `via: 'initial' | 'refine'`.
- `micro_task_suggested: { skip_count: number }` (proposal shown)
- `micro_task_added: { skip_count: number }` / `micro_task_dismissed: { skip_count: number }`
- Never the feedback text, distillation, step titles, or task text (NFR-S3) — counts and flags only.

## Testing plan

- **Server unit:** fake refine/micro determinism; `mapRefineResponse` clamps + null distillation path. **Server integration:** `ai.refineBreakdown` (fake mode) returns prefixed steps + distillation; empty feedback rejected; `ai.suggestMicroTask` shape.
- **Mobile integration** (`createTestDb`): `replaceUncompletedSubtasks` deletes only uncompleted, preserves completed rows and ordering, appends after max orderIndex; `incrementSkipCount`/`resetSkipCount` (and: increment does NOT bump `updatedAt`); `startTask` resets skipCount.
- **Unit:** notes-append helper (null notes, null distillation, both present).
- **Stories:** `micro-task-nudge.stories.tsx` (idle/loading/proposal/error); `subtask-list.stories.tsx` gains RefineOpen story. Portable tests free.
- **Maestro E2E** (`NN-story-6-4-refine-and-nudge.yaml`, fake mode, two legs):
  1. Refine: seed 'Sort the paperwork mountain' → start → 'Help me with this' → 'Add these steps' → tick the first subtask → 'Refine' → input 'Too vague, give me physical actions' → 'Send feedback' → proposal shows 'Refined: Do just the first two minutes' → **screenshot** → accept → completed subtask still present + refined steps present → notes area contains 'Approach note: Too vague' (assert visible).
  2. Nudge: back home → seed second task 'Ring the council office' → swipe the stack 10 times (two cards cycling → ≥5 skips each) → nudge chip visible → tap → 'Do just the very first minute of "Ring the council office"' (top card at that moment; assert the quoted step text) → 'Add it' → chip gone → open that task's running screen → micro subtask listed.
- E2E ordering note: swipe gestures follow flow 04's swipe pattern; keep assertions full-string.

## UX notes

- Feedback input copy: "Why does this miss the mark?" — invitation, not blame. Loading: "Rethinking the steps...".
- Nudge is a quiet chip under the stack — no badge, no red, never blocks the card. Dismissal is respected (threshold resets).
- Distillation lands in notes visibly (the user sees what the AI kept) — draft-or-stored resync in `TaskRunningView` already handles the concurrent write (2.1 pattern; this is the "Epic 6 concurrent writer" it anticipated).

## Dependencies

- **6.3** — hard (subtask list, proposal UI, use-breakdown, ai router base). **6.1** transitively.
- **4.1** star service via 6.3's subtask actions (micro subtask completion earns stars through the same path — no new wiring).
- Touches `card-stack.tsx` (onSwipe prop) and `app/index.tsx` — **conflicts with Epic 3 (curation/toggles) and 6.2 (index.tsx review banner)**; serialize.
- Epic 7 avoidance detection should REUSE `skipCount`/threshold — coordinate (note for 7.x implementer).

## Out of scope

- Iterating refine on an unaccepted initial proposal (reject → re-request covers it); multi-round feedback memory beyond notes distillation.
- Notification-driven nudges (Epic 8), staleness detection (Epic 7 — `skipCount` is only written/reset here, interpreted further there).
- Subtask/pg sync (same deferral as 6.3).
