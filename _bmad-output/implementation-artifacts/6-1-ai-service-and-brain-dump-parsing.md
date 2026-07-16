# Story 6.1: AI Service & Brain Dump Parsing

Status: ready-for-dev
Date: 2026-07-16
Mode: wave-based autonomous run (spec-first; fresh-context review before commit)

## Story

As a user, I want to brain dump my thoughts and have AI extract individual tasks, So that I can capture everything on my mind without organizing it myself.

FRs: 1, 2, 4, 65 · UX-DRs: 12, 20 · NFR-P3 (<3s parse), NFR-S3 (no task text in logs/analytics)

## Acceptance Criteria

1. Tapping the FAB ("Add task") now opens the brain dump screen (`/brain-dump`): large textarea (placeholder "What's on your mind?"), submit button below, plus a secondary "Add one task instead" action that returns home and opens the existing quick-add sheet (UX-DR15: FAB → brain dump; quick add stays reachable).
2. Submitting non-empty text sends it to the server via tRPC (`ai.parseBrainDump`) — never directly to Gemini from the client. While pending, the submit button is replaced by a spinner + "Parsing your tasks..." that FADES IN after a 1s delay (no flash on fast responses); the textarea stays visible but disabled.
3. If parsing exceeds 4s, an additional "Taking a bit longer..." line appears.
4. On success, one local task per extracted item is created (title always; optionally inferred size, contexts, deadline). Fields the AI inferred are recorded in a new `reviewFlags` column and `hasCheckNeeded` is set true when any flags exist (consumed by Story 6.2 — no review UI in this story). The screen pops back home; new cards appear in the stack.
5. On network failure/timeout (5s `timeoutFetch` abort from Story 5.1), an inline error shows near the input: "Brain dump needs an internet connection. You can still add tasks one at a time." with the submit button re-enabled (retry always visible) and a "Use quick add instead" button (pops home + opens quick-add sheet). No error modals.
6. **Local mode (no `GEMINI_API_KEY`):** the server transparently uses a deterministic fake provider with the same request/response shape — every flow above works locally and in E2E with byte-stable outputs. With the key present, the real `@google/genai` (`gemini-2.5-flash`) path is used with NO client-visible difference.
7. Empty/whitespace input never calls the server (submit disabled). Server rejects >2000 chars (`BAD_REQUEST`), caps output at 20 tasks.

## Implementation plan

### Shared (`packages/shared`)

- `src/types/ai.ts` (new): `ParsedTaskDraft { title: string; details: string | null; size: TaskSize | null; contexts: TaskContext[]; deadline: string | null /* ISO */; timeSensitive: boolean }`, `AiProviderName = 'gemini' | 'fake'`, `BrainDumpResult { tasks: ParsedTaskDraft[]; provider: AiProviderName }`. Export from `src/types/index.ts`.
- `src/types/task.ts`: add `reviewFlags: string | null` to `TaskData`; add `ReviewField = 'size' | 'contexts' | 'deadline'`, `TaskReviewFlags { inferred?: ReviewField[]; missingDeadline?: boolean }`, tolerant `parseReviewFlags(value: string | null): TaskReviewFlags | null` (same defensive style as `parseTaskContexts`) and `hasReviewItems(flags)`.
- `src/constants/ai-limits.ts` (new, export from constants barrel): `GEMINI_MODEL = 'gemini-2.5-flash'`, `MAX_BRAIN_DUMP_CHARS = 2000`, `MAX_PARSED_TASKS = 20`.
- `src/schema-local/tasks.ts`: add `reviewFlags: text('review_flags')` (the `AssertExact<TaskRow, TaskData>` check forces this). Regenerate mobile migration: `cd apps/mobile && bun drizzle-kit generate` (next numbered SQL in `apps/mobile/drizzle/`, committed; jest picks it up via `loadLocalMigrationsSql`).
- `src/schema/tasks.ts` (pg, created by Story 5.0): add matching `review_flags` text column + server drizzle migration (`cd apps/server && bun drizzle-kit generate`). Sync (5.3) diffs full canonical rows, so the new column rides along — verify its drizzle-zod schemas regenerate.

### Server (`apps/server`) — independently schedulable

- `package.json`: add `@google/genai` (^2.8.0). **Never `@google/generative-ai` (EOL).**
- `src/lib/env.ts`: add `GEMINI_API_KEY: z.string().optional()`.
- `src/services/ai/provider.ts` (new): `AiProvider { parseBrainDump(text: string): Promise<ParsedTaskDraft[]> }` + `createAiProvider(env): { provider: AiProvider; name: AiProviderName }` — gemini when key present, fake otherwise. Single selection point; later stories add methods to the same interface.
- `src/services/ai/gemini-provider.ts` (new): `new GoogleGenAI({ apiKey })`, `ai.models.generateContent` with `responseMimeType: 'application/json'` + a `responseSchema` for the draft array, `thinkingConfig: { thinkingBudget: 0 }` (fast/cheap). Prompt instructs: extract distinct tasks; include size/contexts/deadline ONLY when clearly implied (confidence threshold lives in the prompt); flag `timeSensitive` when urgency is implied without a date. Extract pure `mapModelResponse(raw: unknown): ParsedTaskDraft[]` — zod-validate, drop unknown contexts, coerce bad sizes/dates to null, clamp to `MAX_PARSED_TASKS` — so it unit-tests without network. **NFR-S3: never pino-log the input text or parsed titles** (log counts/durations only).
- `src/services/ai/fake-provider.ts` (new): deterministic. Split input on newlines and `.`/`;`, trim, drop empties, cap 20; title = segment with first letter capitalized. Keyword rules (case-insensitive, first match wins): contexts — `call|text|ring`→`['phone']`, `email|online|website|book`→`['internet']`, `buy|shop|pick up`→`['out_and_about']`, `clean|tidy|wash|fix`→`['home']`, `write|report|code`→`['laptop']`; size — ≤5 words or contains `quick`→`quick_win`, contains `plan|organise|organize|project`→`big_time`, else null; deadline — `today`→today 18:00 local, `tomorrow`→+1 day 18:00, else null; `timeSensitive` — deadline inferred OR contains `urgent|soon|asap|deadline`. E2E asserts against these exact rules.
- `src/routers/ai.ts` (new): tRPC router with `parseBrainDump` mutation — zod input `{ text: z.string().trim().min(1).max(MAX_BRAIN_DUMP_CHARS) }`, returns `BrainDumpResult`. `publicProcedure` for now (decision: per-user metering + premium gating land in 8.2b; auth header already flows when a session exists). Register in `src/routers/index.ts` (root router from 5.0).

### Mobile (`apps/mobile`)

- `src/app/brain-dump.tsx` (new route): SafeAreaView + back header (mirror `task-running/[id].tsx` chrome, back label "Close brain dump"), renders `BrainDumpInput`. Wires `trpc.ai.parseBrainDump.useMutation()` (client from Story 5.1's `lib/trpc.ts`); onSuccess → `createTasksFromBrainDump(db, result.tasks)` → `track(...)` → `router.back()`. "Add one task instead" / "Use quick add instead" → `router.back()` then `useQuickAddStore.getState().open()` (global store; home renders the sheet).
- `src/components/brain-dump/brain-dump-input.tsx` (+ `.stories.tsx`, new): presentational (props: `state: 'idle' | 'parsing' | 'parsing_long' | 'error'`, `onSubmit(text)`, `onQuickAddInstead`). Textarea (gluestack, `aria-label="Brain dump"`), submit `Button` (`aria-label="Parse my tasks"`), spinner + copy per state. The 1s fade-in and 4s escalation timers live in the ROUTE (setTimeout on mutation start; cleared on settle) so the component stays a pure state renderer for stories.
- `src/services/tasks-repository.ts`: add `createTasksFromBrainDump(db, drafts: ParsedTaskDraft[]): Promise<TaskData[]>` — per draft: trim/skip empty titles, compute flags (`inferred` = non-null size / non-empty contexts / non-null deadline; `missingDeadline` = `timeSensitive && !deadline`), insert with `reviewFlags` JSON (null when empty), `hasCheckNeeded = flags != null`, expo-crypto UUIDs, deadline parsed to `Date`.
- FAB retarget: `src/app/index.tsx` — `onAddPress` now `router.push('/brain-dump')` (guarded while card-back overlay open, as today). Quick-add sheet stays on home, still driven by `quick-add-store`.

### Maestro migration (existing flows break — planned, not collateral)

- `.maestro/common/seed-task.yaml` (new): env `TASK_TITLE`; taps 'Add task' → 'Add one task instead' → quick-add sheet → input → 'Save task' → 'Close add task'. Update flows `03`–`07` seeding/entry steps to the new path (flow 03 tests the sheet itself — only its entry changes).

## Analytics (extend `src/lib/analytics/events.ts` — flat, PII-safe, never text)

- `brain_dump_submitted: { char_count: number }`
- `brain_dump_parsed: { task_count: number, flagged_count: number, duration_ms: number, provider: 'gemini' | 'fake' }`
- `brain_dump_failed: { reason: 'network' | 'server_error' }`

## Testing plan

- **Server unit:** `fake-provider.test.ts` — segmentation, each keyword rule, caps, determinism (same input twice → deep-equal). `gemini-provider.test.ts` — `mapModelResponse` clamping/tolerance with canned JSON (no network).
- **Server integration:** `routers/ai.test.ts` — caller/inject pattern established by Story 5.0 harness, no `GEMINI_API_KEY` in test env: multi-line dump → expected drafts; empty text → BAD_REQUEST; >2000 chars rejected.
- **Mobile integration** (`createTestDb` + real migration SQL): `createTasksFromBrainDump` writes rows — inferred fields populated, `reviewFlags`/`hasCheckNeeded` correct, `missingDeadline` set for time-sensitive-no-deadline drafts, empty-title drafts skipped.
- **Stories:** `brain-dump-input.stories.tsx` — Idle, Parsing, ParsingLong, Error (auto portable-stories crash tests; RNTL 14: `await render`).
- **Maestro E2E** (`NN-story-6-1-brain-dump.yaml`, NN = next free number): server running locally in fake mode (no key; APK built with `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` per 5.1). launch → tap 'Add task' → assert "What's on your mind?" → input `"Call the dentist tomorrow.\nClean out the garage"` → 'Parse my tasks' → wait → home shows cards 'Call the dentist tomorrow' and 'Clean out the garage' → **screenshot** of the stack with parsed cards. Also assert the quick-add alternative leg ('Add one task instead' opens the sheet).

## UX notes

- Copy: placeholder "What's on your mind?"; loading "Parsing your tasks..." then "Taking a bit longer..."; offline copy per AC5. Factual, no guilt.
- One primary action (submit); "Add one task instead" is visually secondary (link-style button).
- Loading pattern UX-DR20: spinner replaces submit; input visible-but-disabled. Target <3s parse (NFR-P3).

## Dependencies

- **5.0** (tRPC + Fastify scaffold, server test harness, pg tasks table) and **5.1** (mobile tRPC client, `timeoutFetch`, `EXPO_PUBLIC_API_URL`) — hard.
- Epic 1 quick-add/card stack (done). Story 6.2 consumes `reviewFlags`; keep the shape exactly as specced.

## Out of scope

- Review UI / info icon / confirmation stars (6.2). Breakdown procedures (6.3/6.4).
- Per-user cost metering, caching, model fallback tiers, premium gating (Epic 8.2b) — provider seam leaves room.
- Auth-gating `parseBrainDump` (stays public until 8.2b; recorded decision).
- Proactive connectivity detection (netinfo) — error-driven offline handling only.
