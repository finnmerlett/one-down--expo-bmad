# Story 5.0: Backend API Scaffold

Status: review (implemented, awaiting fresh-context review; do not mark done here — sprint-status.yaml is the source of truth)
Date: 2026-07-16
Mode: wave-based autonomous run (server track worktree, branch `server-track`)

## Story

As a developer, I want the backend server scaffolded with database connectivity, So that server-side features have a working foundation.

## Acceptance Criteria

1. The server project is scaffolded (apps/server with Fastify 5 + TypeScript + Bun); starting via `bun run dev` serves a health check endpoint (`GET /health`) that responds successfully
2. tRPC router is configured with the Fastify adapter
3. Server Drizzle ORM connects to PostgreSQL
4. Server-side task schema mirrors the local schema (via packages/shared)

Infrastructure: apps/server scaffold, tRPC + Fastify, PostgreSQL + Drizzle (server), packages/shared schemas · NFRs: SC1

Epics notes honored: `createDbClient(url)` never connects eagerly (boot/tests succeed with placeholder `DATABASE_URL`); two health endpoints by design (Fastify-native `GET /health` liveness + tRPC `health` query end-to-end); `process.env` reads confined to `lib/env.ts` (`loadEnv()` + Zod); server `tasks` = full canonical `TaskData` + `userId` (uuid NOT NULL); `tasks.id` has NO `defaultRandom()` (client UUIDs accepted as-is); `publicProcedure` only (`protectedProcedure` in 5.2).

## Implementation decisions

- **tRPC v11 (`@trpc/server@11.17.0`, pinned) + `fastifyTRPCPlugin`** mounted at `/trpc` on the existing Fastify 5 `buildServer(env)`. `src/trpc.ts` owns `initTRPC.context<Context>()`, `router`, `publicProcedure`, and `createContextFactory({ env, db })` — server-scoped deps baked in, `req`/`res` added per request (5.2's auth middleware will read headers from there). **No transformer** — superjson deferred to 5.3 (must be wired client+server simultaneously).
- **Root router** `src/routers/index.ts` with the single `health` query returning `{ status: 'ok', service, sharedPackage, timestamp }` — `sharedPackage` echoes `SHARED_PACKAGE_NAME` (new shared constant) to prove the shared import end-to-end. `export type { AppRouter }` re-exported from `src/index.ts` for 5.1's **type-only** client import.
- **pg schema lives in `@one-down/shared/schema`** (`packages/shared/src/schema/tasks.ts`): `pgTable` mirror of schema-local — `uuid` id (no default), `user_id` uuid NOT NULL, `timestamptz` dates, `contexts` stays a JSON string. Compile-time `AssertExact<Omit<ServerTaskRow,'userId'>, TaskData>` — same drift guard as the sqlite side. Package barrel still re-exports NO schema entry (mobile bundle must never see `drizzle-orm/pg-core`); server re-imports via `src/db/schema.ts`.
- **`createDbClient(url)`** in `src/db/client.ts`: postgres.js (`postgres@3.4.9`) + `drizzle-orm/postgres-js` — construction is side-effect free (lazy connect). Underlying pool reachable via `db.$client` (tests call `.end()`). `buildServer` accepts an optional injected `db` for future tests.
- **`DATABASE_URL` added to `lib/env.ts`** defaulting to the local supabase Postgres (`postgresql://postgres:postgres@127.0.0.1:54322/postgres` — well-known local dev credentials, not a secret; Railway injects the real one). `.env.example` updated; `.env` stays gitignored.
- **`drizzle.config.ts` scaffolded** (dialect postgresql, schema → shared pg entry, out `./drizzle`) but NO migration generated — first server migration + `drizzle-kit migrate` wiring are explicitly deferred to Story 5.3 (planning scope-deferral list). Connectivity is proven with `select 1`, not a tasks round-trip (table doesn't exist in the DB until 5.3).
- **Server tests use `bun:test`** (native to the Bun runtime, zero config) — co-located `src/index.test.ts` + `src/db/client.test.ts`. Root `test` script now chains `bun --cwd apps/server test && bun --cwd apps/mobile test` (server joins the chain per Epic 5; shared has no tests yet so it's not in the chain). Verified: `bun --cwd <dir> test` dispatches to the package script, and `bun test` inside a script invokes the builtin runner (no recursion).
- Fastify logger disabled under `NODE_ENV=test` (keeps test output clean); tRPC adapter `onError` logs through `app.log`.

## Tasks

- [x] Shared pg schema (`schema/tasks.ts`) + conformance assert + `SHARED_PACKAGE_NAME` constant
- [x] `db/client.ts` (`createDbClient`, lazy) + `db/schema.ts` re-export + `drizzle.config.ts`
- [x] `trpc.ts` (context factory, router, publicProcedure) + `routers/index.ts` (`health` query, `AppRouter`)
- [x] `index.ts`: fastifyTRPCPlugin at `/trpc`, db built from `env.DATABASE_URL`, `AppRouter` type re-export
- [x] `env.ts` + `.env.example`: `DATABASE_URL` (placeholder-safe default)
- [x] Tests: liveness `/health`, tRPC `/trpc/health` (+ NOT_FOUND path), lazy-client placeholder boot, real `select 1` against local supabase Postgres (integration)
- [x] Root test chain includes server; gates: typecheck, test, lint:check
- [x] Live smoke: `bun src/index.ts` → curl `/health` + `/trpc/health` green, process killed

## Dev Notes / Deviations

- **Story spec file was absent** in this worktree (`5-0-backend-api-scaffold.md` did not exist under implementation-artifacts) — scope reconstructed at implementation time from `epics.md` Story 5.0 (+ its verbatim notes) and `architecture.md` digest (tRPC setup, health contract, monorepo tree, pinned versions). This file records the reconstructed spec.
- **PostgreSQL is the local supabase stack** (127.0.0.1:54322), not Railway — per run coordination (local-first strategy); Railway deploy is a later Epic 5 concern. Integration tests hit it for real.
- **No Maestro flow / no Storybook stories** — server-only story, zero user-facing or visual surface; mobile↔server connectivity E2E arrives with 5.1.
- **No env-schema unit tests** — declarative Zod config, would be testing the framework (project testing philosophy).
- tRPC response envelope without transformer is `{ result: { data } }` — 5.1's client assertions should target `data.status === 'ok'` via the typed client, not the raw envelope.
