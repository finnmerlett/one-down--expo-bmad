# Story 5.3: Cloud Sync Layer

Status: ready-for-dev
Date: 2026-07-16
Mode: wave-based autonomous run (spec written up front; implementer reads ONLY this + CLAUDE.md + code)

## Story

As a user, I want my tasks to sync across devices, So that I can access my tasks anywhere (FR62–64 · NFR-R1–R5). Custom timestamp-based sync ("last-content-changed wins", PowerSync rejected), tasks table only for now.

## Pre-work (fold in FIRST — load-bearing for conflict resolution)

Move `createdAt`/`updatedAt` management into the Drizzle schemas so `updatedAt` can never be forgotten:

- `packages/shared/src/schema-local/tasks.ts`: `createdAt ... .$defaultFn(() => new Date())`, `updatedAt ... .$defaultFn(() => new Date()).$onUpdate(() => new Date())`. Same on the pg side (`packages/shared/src/schema/tasks.ts`). Runtime-level only — `drizzle-kit generate` produces no SQL diff for this.
- `tasks-repository.ts`: `updateTask`/`setTaskStatus` stop setting `updatedAt` manually; `createTask` drops explicit timestamps and returns the row from `.insert(...).values(...).returning()` instead of the hand-built object.
- CRITICAL drizzle semantics the sync-apply path relies on: an **explicit value in `.set()`/`.values()` wins over `$onUpdate`/`$defaultFn`** — pulled rows are written with their exact server timestamps, never re-stamped. Add an integration test pinning this (see Testing).

## Acceptance Criteria

1. Authenticated + online: creating/editing/completing a task locally syncs to the server within 5 seconds (debounced local-change trigger).
2. On connectivity restoration (and app foreground, and sign-in): pending local changes push, server changes pull, completing within 5s of the trigger.
3. Conflict (same task edited on two devices): **last-content-changed wins** — whole-row resolution on `updatedAt` (content-change time, client-set), deterministic on both sides; the losing edit is discarded by policy, nothing is partially merged or silently corrupted, and both stores converge to the winning row.
4. Task IDs are client-generated `expo-crypto` `randomUUID()` and permanent — the server upserts by the client id, never reassigns (already structurally true; the pg `tasks.id` has no default).
5. Sync failure → status becomes `retrying`; retry fires automatically on the next trigger (connectivity change/foreground/local change). A **subtle** indicator shows only while sync is pending/retrying; nothing is shown when idle/synced or signed out.
6. Signed out: no sync attempts, no indicator, app unchanged (free tier local-only).
7. Sign-in after local-only use pushes ALL existing local tasks to that account (first-sync = full push); a fresh install + sign-in pulls the account's tasks into the empty local DB.

## Design (concrete — implement as specified)

**Wire format**: superjson, wired **simultaneously** client+server (tRPC v11 enforces symmetry): server `initTRPC...create({ transformer: superjson })`; client `httpBatchLink({ transformer: superjson, ... })`. Dates cross the wire as real Dates from here on.

**Server schema** (`packages/shared/src/schema/tasks.ts` + migration `apps/server/drizzle/0001_*`): add `syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow()` (server-clock write stamp, distinct from content-clock `updatedAt`) and index `idx_tasks_user_id_synced_at` on `(user_id, synced_at)`. Conformance check becomes `Omit<ServerTaskRow, 'userId' | 'syncedAt'>` ≡ `TaskData`.

**Local schema** (`packages/shared/src/schema-local/sync-meta.ts`, new + migration `apps/mobile/drizzle/0002_*` via `bunx drizzle-kit generate`): singleton table `sync_meta` — `id text pk` (always `'singleton'`), `userId text` (account the cursors belong to), `lastPushedAt` + `pullCursor` (`integer { mode: 'timestamp_ms' }`, nullable). If the session user ≠ stored `userId`, reset both cursors (fresh full sync merges device data into the new account) — deliberate, documented behaviour.

**Zod validation** (`packages/shared/src/validation/tasks.ts`, new; exported from the `.` barrel): hand-written `taskUpsertSchema` matching `TaskData` (z.enum from `TASK_STATUSES`/`TASK_SIZES`, `z.date()` timestamps, nullable fields), `satisfies`-checked against `TaskData`. Server input = source of truth; no drizzle-zod dep needed.

**Server** — `src/services/sync-service.ts` (logic, injectable db) + `src/routers/sync.ts` (thin):
- `sync.push` (protectedProcedure mutation, input `{ tasks: taskUpsertSchema[] }` — cap batch at 500): per row in a transaction — select existing by id. Missing → insert with `userId: ctx.userId` (ALWAYS from ctx, ignore any client value), `syncedAt: now`. Exists with `existing.userId !== ctx.userId` → reject row (uuid collision across users; count as `rejected`, never leak the existing row). Else `incoming.updatedAt > existing.updatedAt` → update all content fields + `updatedAt` + `syncedAt: now`; otherwise skip (`stale` — server copy already newer/equal; the authoritative row reaches the client via pull). Returns `{ applied: string[], stale: string[], rejected: string[] }`.
- `sync.pull` (protectedProcedure query, input `{ since: z.date().nullable() }`): rows `where userId = ctx.userId and (since is null or syncedAt > since)` (strip `userId`/`syncedAt` from the response — client shape is `TaskData`), plus `serverTime` (db `now()` read in the same transaction). Client stores `serverTime - 2s` as the next `pullCursor` (safety overlap for commit races; re-delivery is harmless because apply is idempotent).

**Mobile** — `src/services/sync.ts` (pure logic, injected db + transport for testability):
- `runSync(db, transport, session)`: (1) read/repair `sync_meta` for `session.userId`; (2) **push**: local rows with `updatedAt > lastPushedAt` (null → all) → `transport.push`; on success `lastPushedAt = max(updatedAt of pushed)`; (3) **pull**: `transport.pull({ since: pullCursor })` → apply each row: local missing → insert with exact incoming values; `local.updatedAt >= incoming.updatedAt` → skip (own echo, or a local pending edit that wins and pushes next round); else update ALL content fields with **explicit** `updatedAt` (bypasses `$onUpdate`); (4) `pullCursor = serverTime - 2000ms`. Push-before-pull so a stale local edit gets overwritten by the pulled winner in the same run. Serialize runs (in-flight guard — no concurrent syncs).
- `src/stores/sync-store.ts` (new, Zustand UI-only): `{ status: 'idle' | 'syncing' | 'retrying', lastSyncedAt }`, verb-first actions.
- `src/hooks/use-sync.ts` (new): triggers — (a) local change: `useLiveQuery` on `select max(updatedAt) from tasks`, debounce ~1.5s (meets AC-1's 5s); (b) NetInfo `addEventListener` reconnect edge; (c) `AppState` → active; (d) session becomes non-null. Only runs with a session. Failure → status `retrying` (next trigger retries); success → `idle` + `lastSyncedAt`.
- `src/components/sync/sync-manager.tsx` (new): null-rendering component hosting `useSync()`; mounted in `_layout.tsx` INSIDE `MigrationGate` (sync touches SQLite) and inside Auth/Trpc providers.
- `src/components/app-shell/sync-indicator.tsx` (new): tiny spinner/cloud glyph, `accessibilityLabel="Sync pending"` / `"Sync retrying"`, rendered in `TopBar` (left of settings icon) ONLY when status ≠ idle; reads the store.
- Transport = the tRPC client (`trpc.sync.push.useMutation` is wrong altitude — use the vanilla client `trpcClient.sync.push.mutate` handed to `runSync`; expose the client instance from `trpc.tsx`).

**Deps**: mobile `npx expo install @react-native-community/netinfo` (config-plugin-free; add its jest mock in jest setup) + `bun add superjson`; server `bun add superjson`.

## Analytics (events.ts additions)

- `sync_completed: { pushed: number; pulled: number; duration_ms: number; trigger: 'local_change' | 'reconnect' | 'foreground' | 'sign_in' }`
- `sync_failed: { reason: 'network' | 'server' | 'unknown'; trigger: <same union> }`

Counts and timings only — never task content (NFR-S3).

## Testing Plan

- **Server integration** (`sync-service.test.ts` / `routers/sync.test.ts`; local stack + real JWTs via `test-utils/auth.ts` from 5.2; clean up rows by test userIds): push inserts new rows with ctx userId + server syncedAt; stale push (older `updatedAt`) rejected as `stale`, server row untouched; newer push wins; pull returns only rows `syncedAt > since` for the caller's user; **isolation**: user B pushing a row with user A's task id → `rejected`, A's row untouched; B's pull never contains A's rows; unauthenticated push/pull → UNAUTHORIZED.
- **Mobile integration** (`src/services/sync.test.ts`, `createTestDb(loadLocalMigrationsSql())` + a stub transport — acceptable seam: it's the network boundary; OUR merge/diff logic runs against real SQLite): first sync pushes all rows then advances `lastPushedAt`; only rows edited after `lastPushedAt` push on the second run; pulled newer row overwrites local with EXACT timestamps preserved ($onUpdate bypass — the pre-work pin); pulled older/equal row skipped (echo); local-newer kept then re-pushed next run; user-switch resets cursors; failure leaves cursors untouched (no progress marked on error).
- **Repository regression** (`tasks-repository.test.ts` additions): `updateTask` still bumps `updatedAt` (now via `$onUpdate`); `createTask` returns DB-authoritative row. Migration wiring is proven free by `loadLocalMigrationsSql` picking up `0002_*`.
- **Portable stories**: `sync-indicator.stories.tsx` (pending / retrying states).
- **Maestro E2E** — `.maestro/53-story-5-3-cloud-sync.yaml` (PREREQ header: supabase stack + `bun run server:dev`): the round-trip proof —
  1. Launch clean → settings → create account (`evalScript` unique email, pattern from flow 52) → back home.
  2. Quick-add task 'Sync me task' → `extendedWaitUntil: notVisible: 'Sync pending'` (sync drained).
  3. `launchApp` with `clearState: true` (wipes SQLite + secure store) → home is empty → sign in with the SAME creds → wait for card 'Task: Sync me task. Card 1 of 1' → **`takeScreenshot: .maestro/screenshots/5-3-task-restored-from-cloud`** — proves local → Postgres → fresh-install restore.
  4. Sanity: assertNotVisible 'Unhandled'/'error occurred'.
- Gates: `lint:check`, `typecheck`, `test` (mobile + server), `storybook:generate`.

## UX Notes

- Indicator is a whisper, not a nag: no numbers, no red, no toast; signed out or synced = nothing rendered (ADHD-first calm). Offline is a NORMAL state — never an error surface (UX: no guilt).
- 5.1's ConnectionStatus dot keeps its reachability job; the sync indicator only communicates in-flight/retry. If the pair reads noisy on-device, hide the ConnectionStatus dot while signed in — judgement call, record it.

## Dependencies

- **5.2** merged (protectedProcedure, session, real-JWT test helper); transitively 5.0/5.1. Local stack + server for tests/E2E.
- **Scheduling conflicts**: touches `tasks-repository.ts`, `schema-local/`, `_layout.tsx`, `top-bar.tsx`, `apps/mobile/drizzle/` — hot files for Epics 2–4. Drizzle migration numbering (`0002_*` local) MUST be generated serially on the main tree — coordinate with any Epic 3/4 story that also generates local migrations (regenerate after rebase, never hand-renumber).

## Out of Scope

- **Deletion sync / tombstones** — no hard-delete operation exists until Story 7.1 (`cut_loose` is a status and syncs fine). 7.1 MUST extend sync with a tombstone (`deletedAt`) rather than hard deletes; flag this in its spec.
- Syncing stars / contexts / user-prefs / activity-log tables (don't exist yet; the sync layer's per-table pattern extends when they land), server-pushed star weights.
- Periodic background sync while the app is backgrounded (foreground/reconnect/change triggers only), exponential backoff (trigger-based retry suffices per AC), multi-device real-time (pull-on-trigger only).
- FR65 (AI offline degradation) — Epic 6.
