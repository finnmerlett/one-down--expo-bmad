# Story 1.2: Quick-Add a Task

Status: done
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

- [x] Deps: expo-sqlite, expo-crypto (expo install), zustand, drizzle-kit (dev) + babel-plugin-inline-import
- [x] `@one-down/shared`: TaskData type + `schema-local/tasks.ts` (+ conformance typing); barrel hygiene
- [x] drizzle-kit config + generate initial migration; commit SQL (`drizzle/0000_messy_next_avengers.sql`)
- [x] Mobile `lib/local-db.ts` (open + enableChangeListener) + MigrationGate in `_layout.tsx` (useMigrations)
- [x] `services/tasks-repository.ts` (createTask) + `hooks/use-tasks.ts` (useLiveQuery)
- [x] Quick-add sheet component + zustand store + FAB wiring + interim task list in home content area
- [x] `task_created` event emit on save (taxonomy entry already seeded in 1.0a — shapes matched)
- [x] Stories (sheet open state) + portable-story tests (3) + integration tests on real migration SQL (3)
- [x] Maestro flow `03-story-1-2-quick-add.yaml` (empty-title feedback, save, input clears, task visible)
- [x] Gates: lint:check, typecheck, test (16/16)
- [x] Fresh-context review (with 1.1): approve-with-fixes → all fixes applied
- [x] E2E release build → Maestro 01/02/03 all green → screenshots (`1-2-quick-add-sheet.png`, `1-2-quick-add-task-in-list.png`)

## Dev Notes

- **Migrations**: drizzle-kit `driver: 'expo'` generates `drizzle/migrations.js` importing the `.sql` raw — needs `babel-plugin-inline-import` (extensions ['.sql']) + metro `sourceExts.push('sql')`. Typecheck needs a `drizzle-migrations.d.ts` ambient module (generated JS is untyped). jest never sees `.sql` imports (tests read the SQL via fs: `test-utils/migrations.ts` walks `meta/_journal.json`).
- **gluestack InputField/TextareaInput inject a default `aria-label` ("Input Field")** which beats `accessibilityLabel` for both RNTL label queries AND the platform a11y tree — pass **`aria-label`** on form fields instead. Buttons/Pressables are unaffected.
- gluestack `InputField` forwardRef typing bug (`ComponentRef` resolves to the props type) fixed in our copy (copy-paste ownership) — needed for `titleRef.focus()` refocus-after-save.
- Repository takes db as first arg (`BaseSQLiteDatabase<'sync' | 'async', …>`) so integration tests pass the better-sqlite3 test db; expo-crypto mocked to node:crypto in tests (native module).
- Sheet keeps drafts across close/reopen deliberately (interrupted capture ≠ lost capture); stays open after save + refocuses title for rapid multi-entry.
- expo-sqlite config plugin added to app.json by `expo install` (kept).

- **E2E-caught (would have shipped broken): RN 0.85 Android is edge-to-edge — `adjustResize` never resizes the Modal window, so the whole sheet hid behind the soft keyboard.** Fix: `KeyboardAvoidingView behavior="padding"` on BOTH platforms (the old `Platform.OS === 'ios'` conditional is exactly wrong on SDK 56). Verified by screenshot.
- **gluestack Button also swallows `accessibilityLabel`** (like the inputs) — `aria-label` required for Maestro/TalkBack. Rule of thumb: on gluestack creator-based components, always use `aria-label`; plain RN Pressables can keep `accessibilityLabel`.
- Debugging method that found both: probe Maestro flow + `takeScreenshot` + `maestro hierarchy` dump (instrument first, theorize second).

### Review findings & resolutions (single reviewer, batch with 1.1)

Verdict: **approve-with-fixes** (no blockers; gates independently re-run by reviewer). All fixes applied:

1. Stale validation error persisted across sheet close/reopen → error cleared on `isOpen` change (drafts still retained, now commented as deliberate).
2. Backdrop Pressable missing `accessibilityRole="button"` → added.
3. `accessibilityLiveRegion` is Android-only — accepted (Android-only target until iOS lands; revisit with `announceForAccessibility`).
4. `use-tasks` ordering nondeterministic for same-millisecond saves → `desc(id)` tiebreaker added.
5. MigrationGate leaked raw driver error text to users → dev-only detail, generic message in release.
6. Maestro save step not self-checking → `assertNotVisible: 'Could not save your task'` added.
7. (process) Approval conditional on E2E passing — both stories stay un-done until Maestro 01/02/03 green on-device.
