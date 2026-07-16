# Story 6.3: AI Task Breakdown

Status: ready-for-dev
Date: 2026-07-16
Mode: wave-based autonomous run (spec-first; fresh-context review before commit)

## Story

As a user, I want AI to break down large tasks into smaller steps, So that I can get started without feeling overwhelmed.

FRs: 23, 40, 41 · UX-DRs: 7, 20 · Split: both (server procedure + mobile subtasks).

## Acceptance Criteria

1. On the task running screen, "Help me with this" is enabled and requests a breakdown via tRPC `ai.breakdownTask` with `mode: 'first_steps'` (default: just the first few steps — FR40). While pending, a spinner + "Breaking this down..." shows in the subtask area; the rest of the screen stays interactive (UX-DR20).
2. The response renders as a PROPOSAL (not yet saved): the steps listed with three actions — "Add these steps" (accept), "Show all steps" (re-requests with `mode: 'full'`, replacing the proposal), "Not helpful" (reject).
3. Accept saves the steps as subtasks on the task (new `subtasks` table) and the proposal UI is replaced by the live subtask list. Reject discards the proposal; the task is unchanged.
4. Saved subtasks render above the notes area: each row has a tickbox (complete) and a delete button. Completing shows the row struck-through/faded and is reversible (untick). Completing all subtasks does NOT auto-complete the parent task.
5. Completing a subtask earns a small star reward (Story 4.1 service); unticking reverses it; deleting a COMPLETED subtask reverses its star; deleting an incomplete one awards/reverses nothing.
6. On the card back, "Help me with this" starts the task (existing `startTask`) and pushes `/task-running/[id]?breakdown=1`, which auto-fires the first_steps request on arrival (once per mount).
7. **Local mode:** with no `GEMINI_API_KEY` the fake provider returns a deterministic breakdown (below) so the full flow runs locally/E2E; with a key, Gemini generates real steps from title + details + notes. Network failure → inline error in the subtask area ("Couldn't reach the server — working offline") with visible retry; no modal.

## Implementation plan

### Shared (`packages/shared`)

- `src/types/subtask.ts` (new): `SubtaskData { id: string; taskId: string; title: string; completed: boolean; orderIndex: number; source: 'ai' | 'micro'; createdAt: Date; updatedAt: Date }`. Export from types barrel.
- `src/types/ai.ts`: `BreakdownMode = 'first_steps' | 'full'`, `BreakdownResult { steps: string[]; mode: BreakdownMode; provider: AiProviderName }`.
- `src/schema-local/subtasks.ts` (new): `sqliteTable('subtasks', ...)` — text id PK, `task_id` text notNull (index `idx_subtasks_task_id`), title text notNull, `completed` integer boolean default false, `order_index` integer notNull, `source` text notNull, timestamp_ms created/updated. `AssertExact` conformance to `SubtaskData`. Export from `schema-local/index.ts`. Regenerate mobile migration (`bun drizzle-kit generate`, committed SQL — integration tests inherit it).

### Server (`apps/server`) — independently schedulable

- `src/services/ai/provider.ts`: extend `AiProvider` with `breakdownTask(input: { title: string; details: string | null; notes: string | null; mode: BreakdownMode }): Promise<string[]>`.
- `src/services/ai/gemini-provider.ts`: prompt for 3 concrete starter steps (`first_steps`) or a complete 5–8 step list (`full`); notes/details included as context. Structured JSON output (`responseSchema` string array), zod-validated + clamped (≤10 steps, ≤140 chars each) in a pure `mapBreakdownResponse`. **Never log task text** (NFR-S3).
- `src/services/ai/fake-provider.ts`: deterministic —
  - `first_steps`: `['Get everything you need for "<title>" in one place', 'Do just the first two minutes', 'Set a 10-minute timer and keep going']`
  - `full`: the three above + `['Push through to the halfway point', 'Finish the last stretch', 'Put things away and tick it off']`
- `src/routers/ai.ts`: `breakdownTask` mutation — zod input `{ title: z.string().trim().min(1).max(200), details: z.string().max(2000).nullish(), notes: z.string().max(2000).nullish(), mode: z.enum(['first_steps','full']) }`, returns `BreakdownResult`. `publicProcedure` (same 6.1 decision; gating in 8.2b).

### Mobile (`apps/mobile`)

- `src/services/subtasks-repository.ts` (+ test, new): db-injected like tasks-repository — `createSubtasks(db, taskId, titles, source)` (orderIndex = insertion order, expo-crypto UUIDs), `setSubtaskCompleted(db, id, completed)` (returns previous state for star logic; no-op guard), `deleteSubtask(db, id)` (returns the deleted row), `listSubtasks` used only by the hook.
- `src/hooks/use-subtasks.ts` (new): `useLiveQuery(db.select().from(subtasks).where(eq(subtasks.taskId, id)).orderBy(asc(subtasks.orderIndex)))`.
- `src/services/subtask-actions.ts` (new, mirrors `task-edits.ts` fire-and-forget style): `toggleSubtask(subtask)` — repo write, then star award/reversal (4.1 service, weight `subtask_completed`) + `track('subtask_completed', ...)` / reversal tracking; `removeSubtask(subtask)` — delete + star reversal if it was completed + `track('subtask_deleted', ...)`; `acceptBreakdown(taskId, steps, mode)` — `createSubtasks` + `track('breakdown_accepted', ...)`.
- `src/hooks/use-breakdown.ts` (new): wraps `trpc.ai.breakdownTask.useMutation` — exposes `{ state: 'idle'|'loading'|'proposal'|'error', steps, request(mode), accept(), reject() }`; holds proposal in local state; `accept` calls `acceptBreakdown` then clears; `reject` clears + `track('breakdown_rejected', ...)`. Task-running route owns the hook; the view stays presentational.
- `src/components/task-running/subtask-list.tsx` (+ `.stories.tsx`, new): rows with gluestack `Checkbox` (`npx gluestack-ui add checkbox`; a11y label `Subtask: <title>`, `accessibilityState={{ checked }}`) + delete `Pressable` (`TrashIcon`, label `Delete subtask: <title>`). Completed rows: `line-through` + muted tone. Props: `subtasks, onToggle, onDelete` — presentational.
- `src/components/task-running/breakdown-proposal.tsx` (+ `.stories.tsx`, new): loading (Spinner + "Breaking this down..."), error (+retry), proposal states; buttons 'Add these steps' / 'Show all steps' (hidden once mode='full') / 'Not helpful'.
- `src/components/task-running/task-running-view.tsx`: render subtask section between details and notes (slot already reserved): saved subtasks → `SubtaskList`; else proposal/loading/error → `BreakdownProposal`. "Help me with this" button enabled via new optional props (`breakdown`, `subtasks`, `onToggleSubtask`, `onDeleteSubtask`, `onHelp`); omitted = disabled placeholder (keeps 2.1 stories/tests valid).
- `src/app/task-running/[id].tsx`: wire `useSubtasks(id)` + `useBreakdown(task)`; `?breakdown=1` param → fire `request('first_steps')` once (once-per-mount ref; re-arm not needed — param only set on push).
- `src/components/card-stack/card-back.tsx` + both surfaces (`app/index.tsx` overlay, `app/task/[id].tsx`): "Help me with this" button (outline, below the Start/Cut-loose row) → flush drafts → `startTask` → unmount-overlay-then-push (home) / push (detail) with `?breakdown=1`.

## Analytics (extend `events.ts`)

- `breakdown_requested: { via: 'task_running' | 'card_back', mode: 'first_steps' | 'full' }`
- `breakdown_generated: { step_count: number, mode: 'first_steps' | 'full', duration_ms: number, provider: 'gemini' | 'fake' }`
- `breakdown_failed: { reason: 'network' | 'server_error' }`
- `breakdown_accepted: { step_count: number, mode: 'first_steps' | 'full' }`
- `breakdown_rejected: { step_count: number }`
- `subtask_completed: { source: 'ai' | 'micro', reversed: boolean }` (untick emits `reversed: true`)
- `subtask_deleted: { was_completed: boolean }`

## Testing plan

- **Server unit:** fake breakdown determinism (both modes); `mapBreakdownResponse` clamping. **Server integration:** `ai.breakdownTask` via 5.0 harness (fake mode) — first_steps returns 3, full returns 6, empty title rejected.
- **Mobile integration** (`createTestDb`): subtasks-repository CRUD + ordering; toggle no-op guard; delete returns row; migration creates the table (free via `loadLocalMigrationsSql`).
- **Stories:** `subtask-list.stories.tsx` (empty/mixed-completion), `breakdown-proposal.stories.tsx` (loading/proposal/error), updated `task-running-view.stories.tsx` (WithSubtasks, WithProposal). Portable tests included; assert toggle/delete callbacks fire (RNTL 14: await render/fireEvent).
- **Maestro E2E** (`NN-story-6-3-ai-breakdown.yaml`): server in fake mode. Seed one task via `.maestro/common/seed-task.yaml` ('Sort the paperwork mountain') → open card back → 'Start task' → running screen → 'Help me with this' → 'Breaking this down...' visible → proposal shows 'Do just the first two minutes' → 'Show all steps' → 'Put things away and tick it off' visible → 'Add these steps' → subtask checkboxes present → **screenshot** → tick 'Subtask: Do just the first two minutes' → assert checked state survives leave+re-enter (pause/continue) → delete one subtask → row gone. Also assert card-back entry: second seeded task → 'Help me with this' on back → lands on running screen already 'Breaking this down...'.

## UX notes

- Subtask list sits ABOVE notes on the running screen (UX-DR6/7). Proposal is calm: no red, reject copy "Not helpful" (no guilt).
- Loading only occupies the subtask area — user can keep editing notes (UX-DR20).
- Star feedback (toast/counter pulse) comes from 4.1/4.2 wiring; this story only calls the award service.
- Completing all subtasks leaves Done untouched — parent completion is always the user's explicit act.

## Dependencies

- **6.1** — hard (provider seam, ai router, trpc client wiring, seed-task subflow).
- **4.1** — hard for AC5 (award + reversal API, `subtask_completed` weight; add the constant to `star-weights.ts` if 4.1 hasn't).
- **2.1** (running screen — done). **2.2/2.3/2.4 touch `task-running-view.tsx` and `card-back.tsx`** — serialize with Epic 2 remainder to avoid merge conflicts.

## Out of scope

- Refine/feedback/retry + micro-task suggestions (6.4). Sending existing subtasks as context on new requests (6.4's refine payload covers it).
- Subtask sync to Postgres (pg mirror + 5.3 sync registration) — local-only for now; flagged for a sync follow-up story.
- Manual (non-AI) subtask creation; reordering; editing subtask titles.
