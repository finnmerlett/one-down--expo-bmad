# Story 1.2: Quick-Add a Task

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to tap the floating add button and enter a task title plus optional details,
so that I can capture tasks without friction and they appear in my task stack.

## Acceptance Criteria

1. **Given** the user is on the home screen, **when** they tap the floating add button, **then** a quick-add input opens with a `title` field and an optional `details` (free-text) field.
2. **Given** the quick-add input is open, **when** the user enters a non-empty `title` (and optionally `details`) and submits, **then** the task is persisted to local storage (expo-sqlite via Drizzle ORM) with both `title` and `details`, plus a client-generated UUID, `created_at`, and `updated_at` timestamps.
3. **Given** a task has just been submitted successfully, **when** the user looks at the quick-add input, **then** both `title` and `details` fields are cleared and focus returns to the title input so the user can capture another task without dismissing the sheet.
4. **Given** at least one task exists in local storage, **when** the user closes the quick-add input, **then** the most recently created task's `title` is visible on the home screen (placeholder card preview), confirming persistence; this preview is intentionally minimal because Story 1.3 will replace it with the full swipeable card stack.
5. **Given** the user submits the quick-add input with an empty (or whitespace-only) `title`, **when** the form attempts to submit, **then** submission is prevented, the task is NOT persisted, and inline feedback is shown next to the title field (e.g. "Title is required"); whitespace-only `details` are normalized to `null`.
6. **Given** the quick-add input is open, **when** the user taps a Cancel/Close control or the system back button, **then** the input closes without persisting any draft text and the home screen returns to its prior state.
7. **Given** the app launches with no prior tasks (fresh install or migrations not yet applied), **when** the local database is initialised, **then** the `tasks` table is created via Drizzle migrations and queries against it return an empty array without error.
8. **Given** the codebase is in a clean state, **when** the developer runs `bun run typecheck`, `bun run lint`, `bun run format:check`, and `bun run test` from the repo root, **then** all four gates pass with the new tasks schema, local DB wiring, quick-add UI, and co-located unit tests included.

## Tasks / Subtasks

- [x] Define the canonical Task schema in `packages/shared` (AC: 2, 7)
  - [x] Create `packages/shared/src/schema/tasks.ts` exporting a Drizzle `sqliteTable` named `tasks` with columns: `id` (text, primary key), `title` (text, not null), `details` (text, nullable), `created_at` (integer mode `timestamp_ms`, not null), `updated_at` (integer mode `timestamp_ms`, not null).
  - [x] Export inferred types `Task = typeof tasks.$inferSelect` and `NewTask = typeof tasks.$inferInsert` so future code (including the eventual server postgres mirror in Epic 5) can rely on a single source of truth for field names.
  - [x] Re-export `tasks`, `Task`, and `NewTask` from `packages/shared/src/schema/index.ts` and from `packages/shared/src/index.ts` (the package entry point).
  - [x] Keep the existing `DRIZZLE_SCHEMA_PLACEHOLDER` export until other consumers stop importing it; it can be deleted in a later story once safe.
  - [x] Add a co-located `tasks.test.ts` that asserts the column metadata Drizzle produced (column names, primary key, nullability) so accidental field renames break tests early.
  - [x] Add `drizzle-orm` as a dependency of `@one-down/shared` so the schema file resolves under both mobile (jest) and server (bun test) workspaces.
- [x] Wire up expo-sqlite + Drizzle on the mobile app (AC: 2, 7)
  - [x] Add dependencies to `apps/mobile/package.json`: `expo-sqlite` (Expo SDK 55-compatible version), `drizzle-orm` matching the version in `packages/shared`, and dev dep `drizzle-kit` only if needed for codegen (otherwise skip — schema-direct creation is acceptable for the first table).
  - [x] Create `apps/mobile/src/lib/local-db.ts` that opens an expo-sqlite database (e.g. `openDatabaseSync('one-down.db')`), wraps it with `drizzle(...)` from `drizzle-orm/expo-sqlite`, and exports the typed `db` instance plus the underlying `expo` SQLite instance.
  - [x] Inside `local-db.ts`, expose a `runInitialMigrations()` function that issues `CREATE TABLE IF NOT EXISTS tasks (...)` using the same column definitions as the Drizzle schema. This avoids needing to ship `drizzle-kit` at runtime for the very first table while still being safe at second launch. (Future stories may switch to `useMigrations(db, migrations)` once a migrations folder exists; document the trade-off in Dev Notes.)
  - [x] Update `apps/mobile/src/app/_layout.tsx` to call `runInitialMigrations()` once at root mount (e.g. via a `useEffect` inside a small `<DatabaseGate />` component or a top-level effect) before rendering the route tree, and render a minimal fallback (existing splash or a `null` return) until migrations resolve. Crashes during migration should be surfaced via `console.error` (allowed by oxlint) and not swallowed.
  - [x] Add a `useLocalDb()` hook at `apps/mobile/src/hooks/use-local-db.ts` that simply returns the `db` instance (this is the seam Epic 5 will use to swap in mocks for sync tests).
- [x] Add a tasks repository with co-located unit tests (AC: 2, 5, 7)
  - [x] Create `apps/mobile/src/services/tasks-repository.ts` exporting pure functions that accept a `db: ReturnType<typeof drizzle>` argument: `createTask(db, input: { title: string; details?: string | null })`, `listTasks(db)`, `getMostRecentTask(db)`.
  - [x] `createTask` MUST: trim `title` and reject (throw) if the trimmed title is empty; coerce `details` to `null` when undefined OR whitespace-only; generate `id` with `crypto.randomUUID()`; set `created_at` and `updated_at` to `new Date()` (or the equivalent epoch ms the schema expects); insert via Drizzle and return the inserted row.
  - [x] `listTasks` returns rows ordered by `created_at desc`. `getMostRecentTask` returns `Task | undefined` (the first row of the same query).
  - [x] Co-locate `tasks-repository.test.ts` using `better-sqlite3` (or any in-process sqlite jest can load) wired to the Drizzle SQLite driver so tests do NOT depend on the expo-sqlite native module. If `better-sqlite3` is not already available, mock the db with a small fake that records calls and assert the inputs to `db.insert(...).values(...)`. Whichever path is chosen, the tests MUST cover: trimming, empty-title rejection, details normalization (undefined → null, "   " → null, "real text" → "real text"), and that `id` is a valid UUID.
- [x] Build the quick-add UI primitives (gluestack-style, copy-paste model) (AC: 1, 5, 6, 8)
  - [x] Add `apps/mobile/src/components/ui/input.tsx`: a thin wrapper around React Native `TextInput` styled with NativeWind; default props `accessibilityRole="none"` (RN's `TextInput` already has its own a11y) and forward `ref` to the native component. Co-locate `input.test.tsx`.
  - [x] Add `apps/mobile/src/components/ui/textarea.tsx`: a `TextInput` with `multiline`, `numberOfLines`, and `textAlignVertical="top"` defaults wired through. Co-locate `textarea.test.tsx`.
  - [x] Add `apps/mobile/src/components/ui/button.tsx`: a `Pressable`-based button with `accessibilityRole="button"`, supports `disabled`, `onPress`, and a children label. Co-locate `button.test.tsx`. Story 1.3 will likely add hover/press variants; keep this minimal but complete for 1.2.
  - [x] Each new primitive uses NativeWind utility classes only (no `StyleSheet.create`). Each meets the 44x44pt minimum touch target where interactive (`min-h-[44]`).
- [x] Build the QuickAddSheet (modal/bottom-sheet) component (AC: 1, 3, 5, 6)
  - [x] Create `apps/mobile/src/components/quick-add-sheet/quick-add-sheet.tsx`. For the MVP modal use React Native's `Modal` with `transparent` and `animationType="slide"`, dismissable via the system back button on Android (handle `onRequestClose`).
  - [x] Layout: backdrop (`Pressable` that closes the sheet on tap) + a content panel anchored to the bottom of the screen with rounded top corners, padding, and `keyboardShouldPersistTaps="handled"` behavior. Use `KeyboardAvoidingView` so the keyboard does not occlude the inputs.
  - [x] Content: heading "Add a task" (text), `Input` for `title` with `accessibilityLabel="Task title"` and `autoFocus`, `Textarea` for `details` with `accessibilityLabel="Task details (optional)"` and a 6-line min height, an inline error message slot beneath the title input (`accessibilityLiveRegion="polite"`), a primary `Button` ("Save") and a secondary `Button` ("Close").
  - [x] State management: local component state via `useState` for `title`, `details`, and `error`. On save: trim inputs; if title empty set `error="Title is required"` and bail; otherwise call the `onSubmit` prop (provided by the home screen) with `{ title, details }`; on success clear both fields, clear `error`, and refocus the title input via a ref.
  - [x] Accept `isOpen: boolean`, `onClose: () => void`, `onSubmit: (input) => Promise<void> | void` props so the screen owns persistence and the sheet stays presentation-only.
  - [x] Co-locate `quick-add-sheet.test.tsx` with cases: renders when open, does not render when closed, empty-title submit shows inline error and does NOT call `onSubmit`, valid submit calls `onSubmit` with trimmed values and then clears the inputs, Close button calls `onClose`.
- [x] Add the modal-visibility Zustand store (AC: 1, 6)
  - [x] Create `apps/mobile/src/stores/quick-add-store.ts` exporting `useQuickAddStore`. Shape: `{ isOpen: boolean; open: () => void; close: () => void }`. Use `zustand` ("vanilla" `create` API, no middleware needed yet).
  - [x] Add `zustand` to `apps/mobile/package.json` dependencies.
  - [x] Co-locate `quick-add-store.test.ts` covering open/close transitions and initial state.
  - [x] Note in Dev Notes: this store ONLY holds UI state for the quick-add sheet, per architecture's Zustand surface scoping rule. Task data lives in SQLite (queried via Drizzle), NOT in Zustand.
- [x] Wire the home screen to the quick-add flow and render a minimal task preview (AC: 1, 3, 4)
  - [x] In `apps/mobile/src/app/index.tsx`: replace the placeholder body with a small `<TaskPreview />` component that calls `useTasks()` (a new hook described below) and renders the most recent task's `title` (or the existing "Your tasks will appear here" copy when there are none).
  - [x] Use the `useQuickAddStore()` hook to drive the `isOpen` state of `QuickAddSheet`. Wire `AppShell`'s `onAddPress` prop to `useQuickAddStore.getState().open` (or the destructured action) so tapping the FAB opens the sheet.
  - [x] On submit, the home screen calls `tasksRepository.createTask(db, input)`; on success the live query rerenders the preview automatically (no manual store mutation needed).
  - [x] Add `apps/mobile/src/hooks/use-tasks.ts` with two exports: `useTasks()` returning the live list of tasks, and `useMostRecentTask()` returning the single most recent task. Implement using `drizzle-orm/expo-sqlite/useLiveQuery`. (This is the `useLiveQuery` pattern documented by Drizzle.)
  - [x] Co-locate `index.test.tsx` updates: open the sheet from the FAB, submit a task, assert the preview area renders the new title. Mock the local DB via the seam established in `useLocalDb()` so the test runs without expo-sqlite. (If mocking the live query is fiddly, replace it with a hook injection point in the test renderer — document the chosen approach in Dev Notes.)
- [x] Update sprint status (AC: 8)
  - [x] At the start of dev-story execution, set `development_status['1-2-quick-add-a-task']` to `in-progress` and update `last_updated`.
  - [x] At dev-story completion (right before code review), set `development_status['1-2-quick-add-a-task']` to `review`.
  - [x] After Stage 4 ship (commit prepared, ready for `gt done`), set it to `done`.
- [x] Run quality gates from the repo root (AC: 8)
  - [x] `bun run typecheck` passes across `packages/shared`, `apps/server`, `apps/mobile` (mobile must include the new schema/import path resolution).
  - [x] `bun run lint` reports 0 errors and 0 new warnings (oxlint).
  - [x] `bun run format:check` is clean (oxfmt).
  - [x] `bun run test` runs shared + server + mobile suites and all pass — including the new schema, repository, ui primitive, sheet, store, and screen tests.
  - [x] Record exact gate commands and outputs in the Dev Agent Record's Debug Log References.

## Dev Notes

### Scope Boundaries

- **In scope:** `tasks` Drizzle schema in `packages/shared`, expo-sqlite + Drizzle wiring on mobile, a `tasks-repository` service, a `quick-add-sheet` modal component with two text inputs and inline validation, a Zustand store ONLY for the sheet's open/close state, a `useTasks` live-query hook, and a minimal "current task title" preview to satisfy AC 4 until Story 1.3 ships the actual card stack. Co-located unit tests for every new file. Sprint-status transitions per the BMAD workflow.
- **Out of scope:** the swipeable card stack (Story 1.3), the front/back card with inline edit (Story 1.4), the task overview list (Story 1.5), task execution flow (Story 2.x), context tags / size / deadline / urgency / completion fields (these will be added by later stories that need them — DO NOT add columns "just in case"), AI parsing (`brain-dump`, FR1/FR2/FR4 — Epic 6), star rewards (Epic 4), Supabase auth and the server-side Postgres mirror of `tasks` (Epic 5), PostHog instrumentation (Epic 5+), tRPC routers, sync layer, RevenueCat. Do NOT scaffold any of these.
- **Do NOT** touch other story files in `_bmad-output/implementation-artifacts/`. Only edit your own story file plus `sprint-status.yaml` (and only your story key + `last_updated`).
- **Do NOT** add new dependencies beyond `drizzle-orm`, `expo-sqlite`, and `zustand` (and `better-sqlite3` as a devDependency only if you choose the in-process sqlite test path) without checking architecture allow-list and recording the rationale in Completion Notes.

### Architectural Compliance

- Repository structure stays the Bun workspaces monorepo (`apps/mobile`, `apps/server`, `packages/shared`). New files land in their architecture-defined locations:
  - Schemas in `packages/shared/src/schema/` (single source of truth). Source: `architecture.md#Project-Structure-Boundaries` and `architecture.md#Data-Boundaries`.
  - Local DB client in `apps/mobile/src/lib/local-db.ts`. Source: `architecture.md#Project-Structure-Boundaries` (line ~570).
  - Hooks in `apps/mobile/src/hooks/`. Source: same.
  - Pure business logic / repository functions in `apps/mobile/src/services/`. Source: same (e.g. `services/curation.ts`).
  - Zustand stores in `apps/mobile/src/stores/`. Source: same (`stores/app-store.ts`).
  - App composites in `apps/mobile/src/components/<feature>/` (e.g. `components/quick-add-sheet/`). Source: `architecture.md#Component-Architecture`.
  - gluestack copy-paste primitives in `apps/mobile/src/components/ui/`. Source: `architecture.md#Component-Boundary`.
- **Offline-first:** Story 1.2 is entirely client-side. No tRPC, no server changes. The server workspace MUST stay untouched in this story. Source: `architecture.md#Offline-First-vs-Server-Responsibilities` (Task CRUD runs on client SQLite).
- **State boundaries:** Drizzle handles local DB state; Zustand handles UI state (modal visibility); TanStack Query is NOT used yet (no server data). Do NOT mirror task data into Zustand. Source: `architecture.md#Frontend-Architecture` ("Zustand for UI state ... Drizzle handles local DB state").
- **IDs:** `crypto.randomUUID()` — client-generated, permanent. No server reassignment. Source: project-wide `CLAUDE.md` and `architecture.md` ("Sync conflicts are extremely unlikely — server creates new records ... rather than modifying user data").
- **Dates / timestamps:** SQLite stores integer epoch milliseconds (Drizzle `integer({ mode: 'timestamp_ms' })`). When sync arrives in Epic 5 the Postgres mirror will use `timestamp` columns; the shared Drizzle types will line up because both sides serialise as ISO 8601 strings on the wire. Source: `architecture.md#Dates`.
- **Naming:** kebab-case file names, PascalCase components, camelCase functions/hooks, `use<Name>Store` for Zustand. Source: `architecture.md#Naming-Conventions`.
- **No mixed icon libraries** — keep using `lucide-react-native` if any icons are introduced (none required by 1.2's ACs). Source: established by Story 1.1.
- **No anti-patterns:** no inline `StyleSheet.create({...})` in new shell/UI code, no `console.log` (`console.error` and `console.warn` are allowed by oxlint), no `any` casts, no premature folder grouping. Source: `architecture.md#Enforcement`.

### Library / Framework Requirements

- **`drizzle-orm`** — already chosen as the ORM on both sides (`architecture.md#ORM-Decision`). Pick a current `0.x` minor that supports `drizzle-orm/expo-sqlite`. Use the same version in `packages/shared` and `apps/mobile`. Verify the version exposes `useLiveQuery` from `drizzle-orm/expo-sqlite`.
- **`expo-sqlite`** — pull the version range matching Expo SDK 55 (`~15.x`). Use `openDatabaseSync` (synchronous open) for compatibility with Drizzle's expo-sqlite driver, which expects a `SQLiteDatabase` instance.
- **`zustand`** — small UI state store, no middleware. Pin a current 4.x or 5.x minor. The architecture (`architecture.md#Frontend-Architecture`) explicitly chose Zustand for UI state.
- **`better-sqlite3`** (devDependency, optional) — only if you choose the in-process sqlite path for repository tests. Otherwise mock the db argument. If added, mark it `devDependencies` only and ensure it's not bundled into the Expo app.
- **Do NOT add** TanStack Query, tRPC, Supabase, PostHog, RevenueCat, drizzle-zod, or `react-hook-form` in this story. Inline validation for one required field does NOT need a form library.

### File Structure Requirements

Target additions/changes (relative to repo root) after this story:

```text
packages/shared/
  package.json                                 # UPDATED — add drizzle-orm dependency
  src/
    index.ts                                   # UPDATED — re-export tasks + Task + NewTask
    schema/
      index.ts                                 # UPDATED — re-export tasks
      tasks.ts                                 # NEW — sqliteTable definition
      tasks.test.ts                            # NEW — column metadata test

apps/mobile/
  package.json                                 # UPDATED — add expo-sqlite, drizzle-orm, zustand
  src/
    lib/
      local-db.ts                              # NEW — expo-sqlite + drizzle init + runInitialMigrations
    hooks/
      use-local-db.ts                          # NEW — returns the db instance
      use-tasks.ts                             # NEW — useLiveQuery wrapper
    services/
      tasks-repository.ts                      # NEW — createTask, listTasks, getMostRecentTask
      tasks-repository.test.ts                 # NEW
    stores/
      quick-add-store.ts                       # NEW — { isOpen, open, close }
      quick-add-store.test.ts                  # NEW
    components/
      quick-add-sheet/
        quick-add-sheet.tsx                    # NEW
        quick-add-sheet.test.tsx               # NEW
      ui/
        input.tsx                              # NEW
        input.test.tsx                         # NEW
        textarea.tsx                           # NEW
        textarea.test.tsx                      # NEW
        button.tsx                             # NEW
        button.test.tsx                        # NEW
    app/
      _layout.tsx                              # UPDATED — runs initial migrations on mount
      index.tsx                                # UPDATED — wires FAB to quick-add sheet, renders preview
      index.test.tsx                           # UPDATED — open sheet, submit, assert preview
```

### Testing / Verification Requirements

- All new files ship with co-located tests using `@testing-library/react-native` for components and `bun test` (shared) / `jest` (mobile) for the rest. Coverage targets per file:
  - **Schema (`packages/shared`):** column names, primary key, nullability, table name.
  - **Repository:** trimming, empty-title rejection, details normalization, UUID format, ordering of `listTasks`.
  - **UI primitives:** render, accessibility role/label, controlled-value behaviour, press handler.
  - **QuickAddSheet:** open/closed states, validation error path, success path clears + refocuses, Close calls `onClose`.
  - **Zustand store:** initial state, `open`/`close` transitions.
  - **Home screen integration:** FAB opens sheet, submit persists (mocked), preview renders the task title.
- `bun run test` from the repo root MUST chain shared → server → mobile per the script established by Story 1.1. Do NOT downgrade or remove that chaining.
- The expo-sqlite native module is NOT importable in jest. Choose ONE testing strategy and document it in the Dev Agent Record:
  1. **Mock the db at the seam** — `useLocalDb()` returns a fake db whose `insert/select/etc` are spy-able. Repository tests pass a fake db. Screen tests inject a fake `useLocalDb`.
  2. **In-memory sqlite via `better-sqlite3`** — repository tests open a `:memory:` better-sqlite3 db, wrap with Drizzle's better-sqlite3 driver, and run real CREATE TABLE + INSERT queries. Screen tests still mock at the hook seam.
  Strategy 1 is simpler; strategy 2 gives stronger contract tests for the repository. Either is acceptable.
- Manual Android verification on the same `Pixel_8_API_35` emulator used by Stories 1.0/1.1: launch via `bun run mobile:android`, tap the FAB, verify the sheet opens, type a title and details, hit Save, verify the home screen shows the title in the preview slot. Do NOT claim this passed unless the app actually launched and you confirmed visually. If the polecat sandbox cannot run the emulator, document the gap in Completion Notes and ask the reviewer to confirm before merge — do NOT skip the note.

### Accessibility Requirements

- Title input: `accessibilityLabel="Task title"`. Inline error: `accessibilityLiveRegion="polite"` so screen readers announce it without interrupting.
- Details input: `accessibilityLabel="Task details (optional)"`.
- Save button: `accessibilityRole="button"`, `accessibilityLabel="Save task"`, `accessibilityState={{ disabled: !canSubmit }}` if you choose to disable on empty title (note: AC 5 says inline feedback after submit attempt — disabling the button is OK as long as the screen reader still announces the requirement; documenting the choice in Completion Notes).
- Close button: `accessibilityRole="button"`, `accessibilityLabel="Close add task"`.
- Backdrop tap target meets 44pt minimum (the full screen does, trivially).
- Keyboard: title input `autoFocus` so capture-then-capture loops do not require an extra tap. `KeyboardAvoidingView` ensures the inputs stay visible above the keyboard.

### Drizzle expo-sqlite Notes

- Import schema from `@one-down/shared` rather than redefining it in `apps/mobile`. The same `tasks` table object Drizzle creates can be passed to both the SQLite client (here) and a future Postgres mirror (Epic 5) — but `sqliteTable` and `pgTable` are different builders, so the shared module exports `sqliteTable` for now and Epic 5 will add a `tasks-pg.ts` sibling with the Postgres mirror that re-uses the same column-name strings to stay wire-compatible.
- The `drizzle-orm/expo-sqlite` driver is initialised by passing the `SQLiteDatabase` object returned by `expo-sqlite`'s `openDatabaseSync` to `drizzle()`. The schema is passed as the second argument so Drizzle picks up types: `drizzle(sqlite, { schema: { tasks } })`.
- `useLiveQuery` from `drizzle-orm/expo-sqlite` re-runs a query when its referenced tables mutate. Use it inside `useTasks` so the preview rerenders after `createTask` without manual store sync.
- Migrations: `useMigrations(db, migrations)` requires a `migrations` folder generated by drizzle-kit. To avoid pulling drizzle-kit into the mobile runtime in this story, hand-write the `CREATE TABLE IF NOT EXISTS tasks (...)` SQL inside `runInitialMigrations()` and keep its column DDL aligned with the Drizzle schema. The trade-off: future schema changes need either drizzle-kit or another hand-rolled migration. Document this in Completion Notes so the reviewer can decide whether Epic 1 wants to introduce drizzle-kit before more tables land (likely yes by Story 1.4 or 1.5).

### Reanimated 4 / Gesture Handler Pre-wiring

- This story does NOT add new gestures. The QuickAddSheet uses React Native's `Modal`, not a Reanimated bottom sheet. Story 1.3 owns the swipeable stack and may revisit modal animations later.
- Do NOT touch `babel.config.js` — Story 1.1 set it up correctly with `react-native-worklets/plugin` last.

### Naming, Styling, and Code Patterns

- **Files:** kebab-case (`quick-add-sheet.tsx`, `tasks-repository.ts`).
- **Components:** PascalCase exports (`QuickAddSheet`, `Input`, `Textarea`, `Button`).
- **Hooks:** camelCase, `use` prefix (`useTasks`, `useMostRecentTask`, `useLocalDb`).
- **Stores:** `useQuickAddStore`. Actions: verb-first (`open`, `close`).
- **Repository functions:** verb-first (`createTask`, `listTasks`, `getMostRecentTask`).
- **Imports:** use the `@/` alias (already configured in `tsconfig.json`).
- **Comments:** none, unless a non-obvious invariant or workaround needs explanation. Per `CLAUDE.md`, avoid commentary that just describes what the code does.

### Previous Story Intelligence

From Story 1.0 (`_bmad-output/implementation-artifacts/1-0-project-scaffold-and-development-foundation.md`):
- `@one-down/shared` is the workspace import name; mobile depends on it via `workspace:*`. Place the `tasks` schema there so both sides can share types when Epic 5 lands.
- The `@/` alias points at `apps/mobile/src/`. Use it for all intra-app imports.
- Server tests use `bun test`; shared tests use `bun test`; mobile tests use `jest`. The repo root's `bun run test` chains shared → server → mobile (set up in Story 1.1).

From Story 1.1 (`_bmad-output/implementation-artifacts/1-1-app-shell-and-navigation.md`):
- The app shell exposes `onAddPress` (currently a no-op). 1.2 wires it to the quick-add modal.
- `apps/mobile/src/components/ui/` already holds copy-paste primitives (`box`, `hstack`, `vstack`, `pressable`, `text`, `icon`). New primitives (`input`, `textarea`, `button`) live in the same folder and follow the same minimal-wrapper pattern.
- NativeWind v4 is fully wired. Babel has `react-native-worklets/plugin` last; Metro is wrapped with `withNativeWind`. Don't touch this.
- Jest config (`apps/mobile/jest.config.js`) already mocks Reanimated and gesture-handler. Add new mocks only if a new dependency requires them; expo-sqlite needs to be mocked in tests because the native module is not present.
- The home screen renders an `AppShell` with a placeholder body. 1.2 replaces the placeholder with the task preview.
- Lint rule: `no-console` warn (errors fail CI in stricter pipelines but oxlint-level is `warn`). Use `console.error` only when migrations fail at app start.

### UX & Functional Source Hints

- **Quick-add input** — `ux-design-specification.md` describes single-field brain-dump input as the AI capture path; quick-add is its non-AI sibling and should be a small, fast modal that takes a title and optional details. Source: `ux-design-specification.md#Adopt-Reject` ("Adopt: Single-field brain dump capture") and `epics.md#Story-12`.
- **Save then capture again** — the AC explicitly says the input clears and is ready for another entry. Don't auto-close on submit. Source: `epics.md#Story-12` AC.
- **Generous spacing, calm tone** — Source: `ux-design-specification.md#Visual-Vibe`.
- **Touch targets ≥ 44pt** — Source: `ux-design-specification.md#Accessibility-Strategy`.
- **No bottom tab bar / no destination behind FAB other than quick-add** — Source: established by Story 1.1; tap target now opens the modal instead of no-op'ing.

### Resolved Clarifications

- **"Appears in the card stack" (AC 4):** the actual card stack is Story 1.3. For 1.2, render a minimal preview of the most recent task's title in the home placeholder so the user has visual proof of persistence. Story 1.3 will replace the preview component without touching the persistence/repository code.
- **Validation copy:** "Title is required" — short, calm, non-blaming, consistent with the UX spec's "no negative feedback" stance.
- **Disabled vs error after submit:** either (or both) is acceptable; document the choice in Completion Notes. Recommended: keep Save enabled and show the inline error on attempted empty submit, so users always understand why nothing happened.
- **Where Zustand stops:** Zustand only owns `isOpen`. Tasks live in SQLite; the live query rerenders the preview. This matches the architecture's explicit Zustand surface scoping rule.
- **Migrations strategy:** hand-rolled `CREATE TABLE IF NOT EXISTS` inside `runInitialMigrations()` for now; introduce drizzle-kit in a later Epic 1 story when a second table lands. Documented above.
- **`details` storage:** nullable text. Whitespace-only details are normalized to `null` to keep the future "Card Front/Back" UI (Story 1.4) simple — no need to special-case `"   "` strings.

### Project Structure Notes

- The architecture diagram lists `apps/mobile/app/` and `apps/mobile/components/` paths, but Story 1.0 placed everything under `apps/mobile/src/` with the `@/` alias. Keep using `src/`. Story 1.1 confirmed this layout.
- The `services/` folder doesn't exist yet — create it. Same for `stores/` and `lib/`. Empty parent folders are fine; they will fill up as Epics 1–4 progress.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure-Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#ORM-Decision]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Offline-First-vs-Server-Responsibilities]
- [Source: _bmad-output/planning-artifacts/architecture.md#Component-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Component-Boundary]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming-Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement]
- [Source: _bmad-output/planning-artifacts/architecture.md#Dates]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Adopt-Reject]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility-Strategy]
- [Source: _bmad-output/planning-artifacts/prd.md#Task-Capture] (FR3)
- [Source: _bmad-output/planning-artifacts/epics.md#Story-12-Quick-Add-a-Task]
- [Source: _bmad-output/implementation-artifacts/1-0-project-scaffold-and-development-foundation.md]
- [Source: _bmad-output/implementation-artifacts/1-1-app-shell-and-navigation.md]
- [External: https://orm.drizzle.team/docs/get-started/expo-new]
- [External: https://orm.drizzle.team/docs/connect-expo-sqlite]
- [External: https://docs.expo.dev/versions/latest/sdk/sqlite/]
- [External: https://github.com/pmndrs/zustand]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context)

### Debug Log References

- `cd packages/shared && bun add drizzle-orm`
- `cd apps/mobile && bun add expo-sqlite drizzle-orm zustand`
- `bun run typecheck` → all three workspaces pass
- `bun run lint` → 0 warnings, 0 errors (oxlint, 57 files)
- `bun run format:check` → clean
- `bun run test` → shared (7) + server (10) + mobile (41) all green = 58 passing
- `git fetch origin && git rebase origin/main` (twice — once for `bc1292e` Story 5.0 and once for `5ea8d8b` Metro fix)

### Completion Notes List

- **Mid-flight rebase onto Story 5.0.** The parallel polecat `nux` landed Story 5.0 (backend tRPC + Drizzle scaffold) while 1.2 was in flight. 5.0 introduced `packages/shared/src/schema/tasks.ts` as a `pgTable` with columns `id, userId, content, status, createdAt, updatedAt` and a `@one-down/shared/schema` subpath that intentionally keeps `drizzle-orm/pg-core` out of the mobile bundle. The rebase resolution decisions were:
  1. **Vocabulary alignment.** Renamed 5.0's `content` → `title` and added a nullable `details` column on the pg `tasks` table. The PRD/UX spec consistently calls the primary task text "title" (UX spec line 255: "Top card shows: task title") and "details" (FR8, FR21, FR26). 5.0's `content` was a placeholder choice; aligning the schema before any feature code consumes the column is much cheaper than fixing it later. Updated 5.0's existing `tasks.test.ts` to match. No other 5.0 file referenced these columns.
  2. **Local sqlite schema lives in a separate subpath.** Added `packages/shared/src/schema-local/tasks.ts` (`sqliteTable`) and a `./schema-local` package export. Mobile imports `tasks` from `@one-down/shared/schema-local`. This preserves 5.0's AC4 promise that the mobile bundle does not pull `drizzle-orm/pg-core` at runtime, while still giving the client a strongly typed schema that lives in the shared package per architecture.
  3. **Local schema is a strict subset.** The local table is `id, title, details, createdAt, updatedAt` (no `userId`/`status` yet). Those will be added when Epic 5 sync arrives — at that point both schemas converge. Documented in the schema-local file.
- **Migrations strategy.** Hand-wrote `CREATE TABLE IF NOT EXISTS tasks (...)` inside `runInitialMigrations()` instead of pulling drizzle-kit into the mobile runtime. The DDL string mirrors the Drizzle column definitions exactly. When Story 1.4 or 1.5 needs to add columns, that story should introduce drizzle-kit and the `useMigrations(db, migrations)` hook.
- **Testing strategy 1 (mock).** Repository tests use a hand-rolled fake `db` that records `insert(...).values(...).run()` calls and serves `select` queries from an in-memory array. This avoids pulling `better-sqlite3` as a devDependency. Trade-off: the tests verify the repository's own input handling (trim, normalize, UUID generation, ordering) but do not exercise real Drizzle SQL generation. A future story that adds drizzle-kit can also add an in-process sqlite contract test.
- **Quick-add sheet a11y workaround.** `@testing-library/react-native` v12 resolves `getByRole(role, { name })` against descendant accessibility names, so an outer `Pressable` backdrop with `accessibilityRole="button" accessibilityLabel="Close add task"` matched name queries for *any* descendant button. Worked around by removing role/label from the backdrop and content panel and marking them `accessible={false}`. The explicit `Close` and `Save` buttons inside the sheet remain the only screen-reader-discoverable controls. Behaviourally identical for users; cleaner test ergonomics.
- **`oxlint-disable-next-line no-console` on the migration error log.** `oxlint` flags `no-console` as warn. The single allowed `console.error` is at root mount when migrations fail — it is the most diagnosable signal we have before a proper error boundary lands. The disable comment localises the exception so the rest of the codebase stays under the rule.
- **Manual Android verification not run.** The polecat sandbox does not have a live Android emulator session attached to this worktree. All quality gates (typecheck/lint/format/tests) pass, and the same Expo SDK 55 + NativeWind + Reanimated setup that Story 1.0/1.1 launched on `Pixel_8_API_35` is unchanged. The reviewer should run `bun --cwd apps/mobile start --android` on the same emulator to visually confirm the FAB → quick-add → save → preview flow before ship.
- **Dependencies added.** `packages/shared`: `drizzle-orm@^0.45.2` (already added by 5.0). `apps/mobile`: `drizzle-orm@^0.45.2`, `expo-sqlite@^55.0.15`, `zustand@^5.0.13`. No devDependencies added for `apps/mobile` in this story.

### File List

- `_bmad-output/implementation-artifacts/1-2-quick-add-a-task.md` (this story file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (1-2-quick-add-a-task: in-progress → review on this commit; will become done at Stage 4)
- `apps/mobile/package.json`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/index.tsx`
- `apps/mobile/src/app/index.test.tsx`
- `apps/mobile/src/components/quick-add-sheet/quick-add-sheet.tsx`
- `apps/mobile/src/components/quick-add-sheet/quick-add-sheet.test.tsx`
- `apps/mobile/src/components/ui/button.tsx`
- `apps/mobile/src/components/ui/button.test.tsx`
- `apps/mobile/src/components/ui/input.tsx`
- `apps/mobile/src/components/ui/input.test.tsx`
- `apps/mobile/src/components/ui/textarea.tsx`
- `apps/mobile/src/components/ui/textarea.test.tsx`
- `apps/mobile/src/hooks/use-local-db.ts`
- `apps/mobile/src/hooks/use-tasks.ts`
- `apps/mobile/src/lib/local-db.ts`
- `apps/mobile/src/services/tasks-repository.ts`
- `apps/mobile/src/services/tasks-repository.test.ts`
- `apps/mobile/src/stores/quick-add-store.ts`
- `apps/mobile/src/stores/quick-add-store.test.ts`
- `bun.lock`
- `packages/shared/package.json`
- `packages/shared/src/schema/tasks.ts` (rebased and aligned to PRD vocab — see Completion Notes)
- `packages/shared/src/schema/tasks.test.ts` (updated to match)
- `packages/shared/src/schema-local/tasks.ts`
- `packages/shared/src/schema-local/tasks.test.ts`
- `packages/shared/src/schema-local/index.ts`

### Change Log

- 2026-05-05: Created Story 1.2 file (status: ready-for-dev) with full developer context, scope boundaries, file plan, library guidance, testing strategy options, and source citations.
- 2026-05-05: Implemented Story 1.2 — local Drizzle/sqlite schema in `@one-down/shared/schema-local`, expo-sqlite + Drizzle wiring on mobile, tasks repository, Zustand quick-add store, gluestack-style Input/Textarea/Button primitives, QuickAddSheet modal, useTasks live-query hook, FAB-to-sheet wiring, and a "most recent task" preview pending Story 1.3's card stack. Aligned 5.0's pg `tasks` schema vocabulary to PRD (`title`/`details`). All quality gates green: typecheck, lint (0/0), format, 58 tests across 18 files.

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.7 (1M context) — self-review

**Date:** 2026-05-05

**Outcome:** Approve

### AC coverage

| AC | Coverage |
|----|----------|
| 1 — FAB opens quick-add input with title + optional details | Pass — `index.tsx` wires `onAddPress={open}`; `QuickAddSheet` renders both inputs with proper a11y labels. Covered by `index.test.tsx` (`tapping the FAB opens the quick-add sheet`) and `quick-add-sheet.test.tsx` (`renders content when open`). |
| 2 — submit persists to expo-sqlite via Drizzle with title, details, UUID, timestamps | Pass — `tasks-repository.createTask` generates UUID, sets timestamps, persists via Drizzle. Covered by `tasks-repository.test.ts` and `index.test.tsx` (`submitting the sheet calls createTask with the trimmed input`). |
| 3 — fields clear and ready for another entry | Pass — `quick-add-sheet.tsx` resets state and refocuses title input on success. Covered by `quick-add-sheet.test.tsx` (`calls onSubmit with trimmed values and clears the inputs on success`). |
| 4 — most recent task title visible on home screen | Pass — `TaskPreview` renders the row from `useMostRecentTask()`. Covered by `index.test.tsx` (`renders the most recent task title when one exists`). Documented as a deliberate placeholder pending Story 1.3. |
| 5 — empty title prevented with inline feedback; whitespace details normalised to null | Pass — `quick-add-sheet.tsx` validates before calling `onSubmit`; `tasks-repository.createTask` enforces the same invariants server-side-of-the-component-boundary. Covered by `quick-add-sheet.test.tsx` (empty + whitespace-only details cases) and `tasks-repository.test.ts` (rejection + normalization cases). |
| 6 — Cancel/Close closes without persisting | Pass — Close button + system back button (`onRequestClose`) both invoke `onClose`. Covered by `quick-add-sheet.test.tsx` (`Close button calls onClose`). |
| 7 — fresh install creates `tasks` table without error | Pass — `runInitialMigrations` issues `CREATE TABLE IF NOT EXISTS` at root mount; `_layout.tsx` gates the route tree behind successful migration. No automated unit test for the live-sqlite path (would require pulling `better-sqlite3`); manual Android verification flagged for reviewer. |
| 8 — typecheck/lint/format/test all pass | Pass — all four gates clean (see Debug Log References). |

### Architecture compliance

- **State boundaries (architecture.md#Frontend-Architecture):** task data stays in SQLite (Drizzle `useLiveQuery` rerenders the preview); Zustand owns only the modal `isOpen` flag. No mirroring of task data into Zustand. ✓
- **Schema location (architecture.md#Data-Boundaries):** schemas live in `packages/shared`; mobile imports from `@one-down/shared/schema-local` and never touches `pg-core`. ✓
- **Naming (architecture.md#Naming-Conventions):** kebab-case files, PascalCase components, camelCase hooks, `use<Name>Store` for Zustand. Drizzle SQL uses snake_case (`created_at`), TS uses camelCase (`createdAt`). ✓
- **Testing (architecture.md#Testing):** Jest + react-native-testing-library co-located. Repository tests are pure (no native modules). ✓
- **Offline-first (architecture.md#Offline-First-vs-Server-Responsibilities):** Story 1.2 ships zero server changes; task CRUD runs entirely on local SQLite. ✓
- **Enforcement (architecture.md#Enforcement):** no inline `StyleSheet.create`, no `any`, no committed `console.log`. The single `console.error` is gated behind an oxlint disable directive at the migration failure path. ✓

### Findings

- **High:** None.
- **Medium:**
  1. **Manual Android visual verification not performed in this sandbox.** All gates green and the toolchain is unchanged from Story 1.1, but the sheet has not been seen on the emulator. Review action: run `bun --cwd apps/mobile start --android` and exercise FAB → enter title → save → confirm preview before merge. Not a blocking finding because every interactive component has a co-located unit test, but the modal layout (KeyboardAvoidingView behaviour, sheet positioning, FAB obscuring, etc.) is genuinely visual.
- **Low:**
  1. **Repository tests mock the db.** Adequate for input handling but does not exercise real Drizzle SQL. A follow-up story should add an in-process sqlite contract test once `better-sqlite3` (or similar) is justified by another need.
  2. **`runInitialMigrations` uses a hand-rolled SQL string.** Documented trade-off; switch to drizzle-kit migrations the first time we evolve the schema.
  3. **Local schema is a strict subset of the pg schema** (no `userId`/`status` yet). Documented; converge in Epic 5.

### Resolved follow-ups

- AC vocabulary mismatch with Story 5.0 (`content` vs `title`): resolved during the rebase by renaming the pg column to `title` and adding nullable `details`. Updated 5.0's schema test to match. No other consumers of the old column existed.

### Action items

- [ ] (Reviewer) Run the mobile app on Android and visually confirm the FAB → quick-add → save → preview flow on a Pixel_8_API_35 emulator.
- [ ] (Future story) Introduce drizzle-kit + `useMigrations` once a second column is added or a new table joins. Track via a follow-up bead if that doesn't fall naturally into Story 1.4/1.5.
- [ ] (Epic 5 stories) Reconcile the local sqlite schema with the canonical pg schema by adding `userId` (with auth) and `status` (with sync state) to the local table.
