# Story 1.2: Quick-Add a Task

Status: ready-for-dev
Date: 2026-06-11
Mode: BMad-lite autonomous run (batched with 1.1: per-story commits, shared review + E2E cycle)

## Story

As a user, I want to quickly add a task with a title and optional details, So that I can capture things before I forget them.

## Acceptance Criteria

1. Tapping the floating add button opens a quick-add input (title + optional free-text details)
2. Saving stores the task in local SQLite (expo-sqlite + Drizzle) and clears the input
3. The saved task is visible in the app (interim simple list until the 1.3 card stack replaces it)
4. Empty-title submission is prevented with inline feedback
5. `task_created` analytics event emitted via the track() seam (PII-safe props only — no title/details)

## Implementation decisions (planned)

- **Canonical `TaskData` type** in `@one-down/shared`; local table in `@one-down/shared/schema-local` (`sqliteTable`). Mobile bundle must NEVER import `drizzle-orm/pg-core`; the `.` barrel re-exports neither table. `title` + nullable `details` (NOT `content`).
- Full load-bearing column set from day one (avoids early migrations): `id`, `title`, `details`, `status` (default `'pending'`), `size`, `contexts` (JSON-array string), `deadline` (epoch ms), `has_check_needed` (0/1), `createdAt`/`updatedAt` as `integer({ mode: 'timestamp_ms' })`.
- Migrations: drizzle-kit **generates** SQL at build time; app applies on start via `useMigrations(db, migrations)` from `drizzle-orm/expo-sqlite`. Generated SQL committed.
- Open DB with `enableChangeListener: true` (required for `useLiveQuery` reactivity — silent no-op otherwise).
- IDs: `expo-crypto` `randomUUID()` — NOT global `crypto.randomUUID()` (unreliable in Hermes).
- Zustand store holds ONLY sheet UI state (isOpen); task data lives in SQLite, never mirrored.
- Quick-add sheet: RN Modal slide-up + KeyboardAvoidingView (gas-town pattern worked; @gorhom/bottom-sheet stays out until a real need).
- Integration tests run the **drizzle-kit generated SQL** against in-memory better-sqlite3 (`createTestDb(migrationSql)`) — tests exercise the exact on-device schema (CLAUDE.md methodology).
- `task_created` props: flat primitives only, e.g. `{ source: 'quick_add', has_details: boolean, title_length: number }`.
- Maestro a11y selectors: "Task title", "Task details", "Save task", "Close add task" (gas-town convention).

## Tasks

- [ ] Deps: expo-sqlite, expo-crypto (expo install), zustand, drizzle-kit (dev)
- [ ] `@one-down/shared`: TaskData type + `schema-local/tasks.ts` (+ conformance typing); barrel hygiene
- [ ] drizzle-kit config + generate initial migration; commit SQL
- [ ] Mobile `lib/local-db.ts` (open + enableChangeListener) + migration runner in `_layout.tsx`
- [ ] `services/tasks-repository.ts` (createTask) + `hooks/use-tasks.ts` (useLiveQuery)
- [ ] Quick-add sheet component + zustand store + FAB wiring + interim task list in home content area
- [ ] `task_created` event in taxonomy + emit on save
- [ ] Stories (sheet open state) + portable-story tests + integration tests (create round-trip, empty-title rejection at repo level)
- [ ] Maestro flow `03-story-1-2-quick-add.yaml` (add task, input clears, task visible)
- [ ] Gates: lint:check, typecheck, test
- [ ] Batch: fresh-context review (with 1.1) → E2E release build → Maestro → screenshot → commit

## Dev Notes

(filled in as work happens)
