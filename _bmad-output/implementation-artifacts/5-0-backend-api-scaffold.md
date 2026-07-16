# Story 5.0: Backend API Scaffold

Status: ready-for-dev
Date: 2026-07-16
Mode: wave-based autonomous run (spec written up front; implementer reads ONLY this + CLAUDE.md + code)

## Story

As a developer, I want the backend server scaffolded with tRPC and database connectivity, So that server-side features (auth 5.2, sync 5.3, AI Epic 6) have a working foundation.

FRs: infrastructure for 62–65 · NFRs: SC1

## Local-mode strategy (decisions-log 2026-07-16)

No Railway on this machine. Postgres = the **local Supabase stack's DB** (already running via `supabase` CLI, config in `supabase/config.toml`):

- Postgres: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Supabase API (GoTrue etc., used from 5.2): `http://127.0.0.1:54321`
- CLI binary: `/private/tmp/claude-501/-Users-finnmerlett-Repos-one-down--expo-bmad--alt/55ea75bf-120f-4f68-89b9-f1cc6d9d2b79/scratchpad/bin/supabase` (v2.109.1); `supabase status` prints URLs/keys. Start with `supabase start` from repo root if containers are down (`docker ps | grep supabase`).

Our tables live in the `public` schema of that DB via Drizzle direct connection (postgres.js). We do NOT use PostgREST/RLS — with `auto_expose_new_tables` unset, new tables are not exposed through the Supabase Data API. Production would be Railway PG; only `DATABASE_URL` changes.

## Acceptance Criteria

1. `bun run server:dev` boots Fastify 5; `GET /health` responds `{ status: 'ok', service: 'one-down-api', timestamp }` (existing endpoint, kept as liveness check).
2. tRPC v11 router is mounted via `@trpc/server/adapters/fastify` at `/trpc`; a tRPC `health` query returns `{ status: 'ok', service, sharedPackage, timestamp }` end-to-end (timestamp = ISO **string** — no Dates on the wire until superjson lands in 5.3; tRPC v11 enforces transformer symmetry, so NO transformer anywhere in this story).
3. Server Drizzle connects to Postgres via postgres.js. `createDbClient(url)` must NOT eagerly connect at import/construction (postgres.js connects lazily on first query) — server boot and non-DB tests succeed with a placeholder `DATABASE_URL`.
4. Server `tasks` pgTable exists in `@one-down/shared/schema`, mapping the full canonical `TaskData` shape plus `userId` (uuid NOT NULL). `tasks.id` has **no** `defaultRandom()` — client-generated UUIDs accepted as-is. Compile-time conformance check against `TaskData` (mirror the `AssertExact` pattern in `packages/shared/src/schema-local/tasks.ts`).
5. drizzle-kit migration generated and applied to the local Postgres; an integration test proves a real insert/select round trip through the pgTable.
6. All `process.env` reads stay confined to `apps/server/src/lib/env.ts` (`loadEnv()` + Zod).
7. `publicProcedure` only — `protectedProcedure` is Story 5.2.
8. Server tests join the root `bun run test` chain (CLAUDE.md: "server tests join the chain in Epic 5").

## Implementation Plan

Dependencies (exact pins from architecture): server `@trpc/server@11.17.0`, `postgres@3.4.9`, `drizzle-orm@^0.45.2` (declare directly — the server executes queries; don't rely on it transitively via `@one-down/shared`); dev `drizzle-kit@^0.31.10`.

**packages/shared/src/schema/tasks.ts** (new; barrel `schema/index.ts` re-exports it, replacing the placeholder):

```ts
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey(), // NO defaultRandom() — client UUIDs are permanent
  userId: uuid('user_id').notNull(), // Supabase auth user id; no FK (auth schema is GoTrue-owned)
  title: text('title').notNull(),
  details: text('details'),
  notes: text('notes'),
  status: text('status').$type<TaskStatus>().notNull().default('pending'),
  size: text('size').$type<TaskSize>(),
  contexts: text('contexts'), // JSON-encoded array, same encoding as local
  deadline: timestamp('deadline', { withTimezone: true }),
  hasCheckNeeded: boolean('has_check_needed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
```

Conformance check: `Omit<ServerTaskRow, 'userId'>` must be exactly `TaskData`. The mobile bundle must NEVER import `drizzle-orm/pg-core` — the `.` barrel of `@one-down/shared` continues to re-export neither schema entry point.

**apps/server/src/db/client.ts**: `createDbClient(url: string)` → `drizzle(postgres(url), { schema: { tasks } })`. Export the return type as `Db`.

**apps/server/src/trpc.ts**: `initTRPC.context<AppContext>().create()` (no transformer). `AppContext = { db: Db }` built by a `createContext` factory closed over the db instance. Export `router`, `publicProcedure`.

**apps/server/src/routers/index.ts**: `appRouter = router({ health: publicProcedure.query(...) })` returning the AC-2 contract (`sharedPackage: APP_NAME` proves the shared import chain). Export `type AppRouter = typeof appRouter` and re-export it from `src/index.ts` (the package `exports` map already points at `./src/index.ts` — mobile imports it type-only in 5.1).

**apps/server/src/index.ts**: extend `buildServer(env, deps: { db })` — register `fastifyTRPCPlugin` with `{ prefix: '/trpc', trpcOptions: { router: appRouter, createContext } }`. Keep the Fastify-native `/health`. `import.meta.main` block: `loadEnv()` → `createDbClient(env.DATABASE_URL)` → `buildServer` → listen.

**apps/server/src/lib/env.ts**: add `DATABASE_URL: z.string().default('postgresql://postgres:postgres@127.0.0.1:54322/postgres')`. Update `.env.example` (Bun auto-loads `.env`; root `.gitignore` already ignores `.env`, keeps `.env.example`).

**apps/server/drizzle.config.ts** (new): `dialect: 'postgresql'`, `schema: '../../packages/shared/src/schema/index.ts'`, `out: './drizzle'`, `dbCredentials: { url: process.env.DATABASE_URL ?? <local default> }`. Scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`. Generate + migrate once; commit `apps/server/drizzle/`.

**Scripts**: server `"test": "bun test src"`. Root `package.json` `"test"` becomes mobile chain + `bun --cwd apps/server test`.

## Analytics

None. Server-side PostHog (`posthog-node` + posthog-trpc middleware) is Story 8.3. Fastify's built-in pino logger (already on) is the ops log.

## Testing Plan

`bun:test` (co-located under `apps/server/src/`, `*.test.ts`):

- `index.test.ts` — `buildServer` with a **placeholder** `DATABASE_URL` db client (proves lazy connect): `app.inject GET /health` → 200 + shape; `app.inject GET /trpc/health` (tRPC GET query over the adapter) → 200, `result.data.status === 'ok'`, `sharedPackage === 'one-down'`. No network, no DB touched.
- `db/client.test.ts` — integration against the local stack (prereq: `supabase start`): insert a task row (random `crypto.randomUUID()` id/userId — Node/Bun global is fine server-side), select it back, assert field round-trip incl. `timestamptz` Dates and JSON `contexts` string; delete the row in `afterAll` (shared dev DB hygiene). Fail fast with a clear "is the supabase stack running?" message on connection refusal.
- No zod-env test (trivial passthrough), no mock-DB tests (methodology: don't test mocks).

**Maestro E2E: none** — no user-facing change (CLAUDE.md rule binds user-facing changes; the 5.1 flow proves connectivity through the app). Gates: `bun run lint:check`, `bun run typecheck`, `bun run test` (now incl. server) before commit.

## UX Notes

None — no UI in this story.

## Dependencies

- None on other stories (runs parallel to the mobile track; touches only `apps/server`, `packages/shared/src/schema`, root `package.json`).
- Environment: local Supabase stack running (see Local-mode section) for the DB integration test and `db:migrate`.

## Out of Scope

- Auth middleware / `protectedProcedure` / JWKS (5.2). Sync router, superjson, `syncedAt` column, indexes (5.3).
- `@fastify/rate-limit` (deferred per architecture; not in any Epic 5 AC).
- PostHog server middleware (8.3). Railway deploy / CI pipeline / EAS (deferred infra).
- No `users` table — Supabase GoTrue owns identity; `tasks.userId` is a plain uuid column.
