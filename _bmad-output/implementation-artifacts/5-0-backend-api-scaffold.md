# Story 5.0: Backend API Scaffold

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the backend server scaffolded with tRPC, Drizzle ORM, PostgreSQL connectivity, and a shared task schema,
so that subsequent server-side stories (mobile-to-server connection, auth, sync, AI) have a working foundation to build on.

## Acceptance Criteria

1. Given the server project from Story 1.0 (`apps/server` with Fastify 5 + TypeScript + Bun), when the server starts via `bun run --cwd apps/server dev`, then the existing `GET /health` Fastify route still responds successfully and the server boots cleanly with the new tRPC and database wiring in place.
2. Given the server, when tRPC is configured with the Fastify adapter (`@trpc/server/adapters/fastify`), then a tRPC HTTP handler is mounted at `/trpc`, a root router is exported with at least one public scaffold procedure (e.g. `health`) that returns a typed payload, and a `tRPC` context factory is wired through `fastifyTRPCPlugin`.
3. Given the server, when Drizzle ORM is added with the `postgres-js` driver, then `apps/server/src/db/client.ts` constructs a Drizzle client from a validated `DATABASE_URL`, the schema is re-exported from `@one-down/shared`, and a `drizzle.config.ts` at `apps/server/drizzle.config.ts` is configured for `drizzle-kit` migrations targeting `apps/server/src/db/migrations/`.
4. Given the shared workspace, when the task schema is added, then `packages/shared/src/schema/tasks.ts` defines a `tasks` Drizzle `pgTable` with columns that mirror the canonical local task shape (`id`, `userId`, `content`, `status`, `createdAt`, `updatedAt`) plus their TypeScript inferred types, and the schema is exported via a dedicated `@one-down/shared/schema` subpath so that the mobile bundle does not pull `drizzle-orm/pg-core` at runtime.
5. Given the server, when environment variables are loaded, then `apps/server/src/lib/env.ts` validates required variables with Zod (`DATABASE_URL`, `PORT`, `HOST`, `NODE_ENV`), throws a clear error on missing/invalid configuration, and the server entry point uses the validated values instead of reading `process.env` directly. An `apps/server/.env.example` documents the expected variables.
6. Given the monorepo quality gates, when `bun run typecheck`, `bun run lint`, `bun run format:check`, and `bun run test` are run from the repo root, then all of them pass with the new scaffold in place. New unit tests cover: (a) the tRPC `health` procedure response, (b) the env validator rejects missing `DATABASE_URL`, (c) the `tasks` schema exposes the expected column names, and (d) the Drizzle client factory instantiates without throwing for a syntactically valid Postgres URL.

## Tasks / Subtasks

- [x] Add the canonical task schema to `packages/shared` (AC: 4)
  - [x] Add `drizzle-orm` as a dependency of `packages/shared` (no `postgres` runtime — type-level pg-core only).
  - [x] Create `packages/shared/src/schema/tasks.ts` defining `export const tasks = pgTable('tasks', { ... })` with columns: `id uuid primary key`, `user_id uuid not null`, `content text not null`, `status text not null`, `created_at timestamp with time zone not null default now()`, `updated_at timestamp with time zone not null default now()`. Use `camelCase` column names in TS (`createdAt`) mapping to `snake_case` in SQL (`created_at`) per architecture naming rules.
  - [x] Export inferred types: `export type Task = typeof tasks.$inferSelect; export type NewTask = typeof tasks.$inferInsert;`.
  - [x] Replace `packages/shared/src/schema/index.ts` placeholder with a barrel that re-exports from `./tasks` (keep file present for future schema additions).
  - [x] Update `packages/shared/package.json` `exports` to add a dedicated `./schema` subpath that points at `./src/schema/index.ts`. Keep the existing `.` export pointing at `./src/index.ts` and remove the `DRIZZLE_SCHEMA_PLACEHOLDER` re-export from `./src/index.ts` so `@one-down/shared` no longer transitively pulls `drizzle-orm/pg-core` into the mobile bundle.
  - [x] Add `packages/shared/src/schema/tasks.test.ts` (Bun test) asserting column names match the AC4 list and that `Task`/`NewTask` types compile (compile-time assertion via `expectTypeOf` or `satisfies`).
  - [x] Run `bun --cwd packages/shared typecheck` and `bun --cwd packages/shared test`.

- [x] Add server environment validation (AC: 5)
  - [x] Add `zod` as a dependency of `apps/server`.
  - [x] Create `apps/server/src/lib/env.ts` exporting `loadEnv(rawEnv = process.env): Env` using a Zod schema with: `DATABASE_URL: z.string().url()`, `PORT: z.coerce.number().int().min(1).max(65535).default(3000)`, `HOST: z.string().min(1).default('0.0.0.0')`, `NODE_ENV: z.enum(['development', 'test', 'production']).default('development')`.
  - [x] Throw a `ZodError`-derived friendly error message when validation fails so the operator sees which variable is missing.
  - [x] Create `apps/server/.env.example` documenting the four variables (use a placeholder `postgres://user:pass@localhost:5432/onedown_dev` for `DATABASE_URL`).
  - [x] Add `.env`, `.env.local`, and any other env variants to `.gitignore` if not already covered by the root `.gitignore`.
  - [x] Add `apps/server/src/lib/env.test.ts` covering: (a) parses a valid env, (b) throws when `DATABASE_URL` is missing, (c) throws when `DATABASE_URL` is not a URL, (d) coerces string `PORT` to number.

- [x] Add Drizzle + Postgres client wiring (AC: 3)
  - [x] Add `drizzle-orm` and `postgres` (`postgres.js`) to `apps/server` dependencies. Add `drizzle-kit` to `apps/server` devDependencies.
  - [x] Create `apps/server/src/db/schema.ts` that re-exports from `@one-down/shared/schema`.
  - [x] Create `apps/server/src/db/client.ts` exporting `createDbClient(databaseUrl: string)` that returns a Drizzle client built from `postgres(databaseUrl, { ... })` and the re-exported schema. The client must lazy-connect (no eager network call at module import time).
  - [x] Add `apps/server/drizzle.config.ts` using `defineConfig` from `drizzle-kit` with `schema: './src/db/schema.ts'`, `out: './src/db/migrations'`, `dialect: 'postgresql'`, and `dbCredentials: { url: process.env.DATABASE_URL ?? '' }`. Do NOT generate migrations yet — that lands in Story 5.3.
  - [x] Create the empty directory `apps/server/src/db/migrations/` with a `.gitkeep` so future drizzle-kit output has a home.
  - [x] Add `apps/server/src/db/client.test.ts` asserting that `createDbClient('postgres://test:test@localhost:5432/test')` returns a client whose `.select` is callable (no live connection asserted).
  - [x] Add a server script alias `db:generate` → `drizzle-kit generate` in `apps/server/package.json` so future stories can run it. Do not invoke it during this story.

- [x] Add tRPC server router with Fastify adapter (AC: 2)
  - [x] Add `@trpc/server` (latest stable v11+) as a dependency of `apps/server`. (Zod is already added in the env task.)
  - [x] Create `apps/server/src/trpc.ts` initializing tRPC: `const t = initTRPC.context<Context>().create();` and exporting `router`, `publicProcedure`, and a `createContext({ req, res })` factory that returns `{ req }` (auth context comes in Story 5.2).
  - [x] Create `apps/server/src/routers/index.ts` defining the root `appRouter` with a `health` public query that returns `{ status: 'ok', service: 'one-down-api', sharedPackage: PROJECT_PACKAGE_NAME, timestamp: new Date().toISOString() }`. Export `type AppRouter = typeof appRouter;`.
  - [x] Update `apps/server/src/index.ts` to register `fastifyTRPCPlugin` from `@trpc/server/adapters/fastify` at prefix `/trpc`, passing `{ router: appRouter, createContext }`. Keep the existing `GET /health` Fastify route untouched.
  - [x] Add `apps/server/src/routers/index.test.ts` covering: (a) `appRouter.createCaller({}).health()` returns the expected payload shape, (b) an injected `GET /trpc/health` HTTP request via `server.inject` returns 200 with JSON containing `result.data.status === 'ok'`.
  - [x] Confirm the existing `apps/server/src/index.test.ts` for the Fastify `/health` route still passes unchanged.

- [x] Wire env validation into the server entry point (AC: 1, 5)
  - [x] Update `apps/server/src/index.ts` so the `import.meta.main` block calls `loadEnv()` once and uses the returned `port`, `host`, `databaseUrl`, and `nodeEnv` instead of reading `process.env.*` ad-hoc.
  - [x] Pass the validated `databaseUrl` into `createDbClient(...)` and attach the result via `server.decorate('db', db)` so subsequent routers can read `request.server.db` if needed. Add a Fastify type augmentation in `apps/server/src/types/fastify.d.ts` (or inline in `apps/server/src/index.ts`) for the `db` decorator.
  - [x] Keep `buildServer(options)` overloadable so tests can construct an instance without requiring a real `DATABASE_URL` (e.g., accept an optional `db` injection).

- [x] Verify scaffold against quality gates and document evidence (AC: 1, 6)
  - [x] From repo root: run `bun install` (record the output if lockfile changes).
  - [x] Run `bun run lint`, `bun run format:check`, `bun run typecheck`, and `bun run test`. All four MUST pass.
  - [x] From `apps/server` with a placeholder `DATABASE_URL=postgres://stub:stub@localhost:5432/stub`, run `bun run dev` and `curl -sS http://127.0.0.1:3000/health` — confirm the Fastify health route responds. Then `curl -sS http://127.0.0.1:3000/trpc/health` and confirm the tRPC procedure responds (the Drizzle client must NOT eagerly connect during boot).
  - [x] Record commands and outcomes in the Dev Agent Record → Debug Log References and Completion Notes.

## Dev Notes

This story is the second scaffold-class story (after 1.0). It is the *minimum* server foundation needed before Story 5.1 (mobile-to-server connection), 5.2 (auth), and 5.3 (sync) can land.

### Scope Boundaries

- **In scope:** tRPC init + Fastify adapter + one scaffold procedure, Drizzle + postgres-js client wiring, env validation, the canonical `tasks` Drizzle schema in `@one-down/shared`, a `drizzle.config.ts` ready for future `drizzle-kit generate` runs, and the test/quality-gate plumbing for all of the above.
- **Out of scope (deferred to later stories):**
  - Supabase Auth / JWT middleware / `middleware/auth.ts` — Story 5.2.
  - Sync router (`routers/sync.ts`), `services/sync-service.ts`, conflict resolution — Story 5.3.
  - AI router (`routers/ai.ts`), `services/ai-service.ts`, Gemini integration — Epic 6.
  - Notification router, subscription router, RevenueCat, push notifications — Epics 7/8.
  - PostHog Node SDK + `posthog-trpc` middleware — later in Epic 5/8.
  - `@fastify/cors`, `@fastify/rate-limit` — pulled in alongside auth/CORS exposure to mobile in Story 5.1/5.2.
  - Real `drizzle-kit generate` migration files — Story 5.3 owns the first concrete migration.
  - GitHub Actions CI / Railway deployment configuration — deferred per Story 1.0 dev notes.
  - Mobile-side tRPC client / `lib/trpc.ts` — Story 5.1.

### Critical Scaffold Guardrails

- Do NOT add `@fastify/cors`, `@fastify/auth`, or rate-limit plugins to the server in this story. They land with auth/CORS work in 5.1/5.2.
- The mobile workspace must NOT start importing from `@one-down/shared/schema`. Mobile continues to import from `@one-down/shared` (the main barrel). The `./schema` subpath exists specifically so mobile bundlers do not see `drizzle-orm/pg-core`.
- The Drizzle client must be lazy. Boot must succeed even when the database is unreachable. Verification: `bun run dev` with a fake `DATABASE_URL` boots and serves both `/health` and `/trpc/health`.
- Do NOT write production code that calls `process.env` outside `apps/server/src/lib/env.ts`. Tests may stub `process.env` directly.
- Keep tRPC procedures minimal — only the `health` scaffold procedure in this story. Domain procedures land in their owning stories (sync, ai, etc.).
- Naming: tRPC router/procedure names are `camelCase` per architecture. Use `health` (not `healthCheck`) to match the verb-first convention.
- The pre-existing Fastify `GET /health` route stays. We deliberately have two health endpoints during Epic 5: one Fastify-native (used by deployment platforms / liveness probes) and one tRPC (used by Story 5.1 to verify end-to-end tRPC connectivity from the mobile client).

### Architecture Requirements

- API pattern: tRPC with the Fastify adapter (`@trpc/server/adapters/fastify`). End-to-end type safety, no manual response wrappers, errors via `TRPCError`. Source: `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns`.
- Server organization: Fastify plugin-per-domain in `apps/server/src/`. Target tree (only the parts in scope for this story are created here):
  ```
  apps/server/
    drizzle.config.ts
    .env.example
    src/
      index.ts            (Fastify app entry; boots tRPC + decorates db)
      trpc.ts             (tRPC initTRPC, context, router/publicProcedure exports)
      routers/
        index.ts          (root router with `health` procedure)
        index.test.ts
      db/
        client.ts         (Drizzle + postgres.js connection factory)
        client.test.ts
        schema.ts         (re-export from @one-down/shared/schema)
        migrations/       (.gitkeep — populated by 5.3)
      lib/
        env.ts            (Zod env validation)
        env.test.ts
  ```
  Source: `_bmad-output/planning-artifacts/architecture.md#Project-Structure-Boundaries` and the server tree at lines 576–606 of `architecture.md`. Files for sync/ai/notification/subscription/auth/posthog are deliberately NOT created here — they land in their owning stories.
- ORM: Drizzle ORM with `postgres.js` driver on the server side. Migrations via `drizzle-kit`. Source: `_bmad-output/planning-artifacts/architecture.md#ORM-Decision-Drizzle-ORM-Both-Sides`.
- Database: PostgreSQL (Railway in dev/staging/e2e). For Story 5.0 we only need the connection wiring — the developer is not required to provision a real Railway instance to run tests, but the dev script and `.env.example` must document how to point at one.
- Shared workspace: `packages/shared` is the single source of truth for Drizzle schemas. Add the canonical `tasks` schema here. Source: `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries` ("Data Boundaries").
- Naming patterns:
  - Drizzle table: `snake_case` SQL (`tasks`), `camelCase` TS export (`tasks`), `snake_case` columns in SQL with `camelCase` TS keys (`createdAt → created_at`).
  - tRPC: `camelCase` procedure names (`health`, later `parseBrainDump`, etc.).
  - Files: `kebab-case.ts`.
  - IDs: `crypto.randomUUID()` UUIDs are permanent and client-generated — server accepts incoming UUIDs without rewriting them. The PG `tasks.id` column has no `defaultRandom()` in this story; defaults are decided per-side.
  - Dates: ISO 8601 strings in API; `timestamp with time zone` in Postgres.
  Source: `_bmad-output/planning-artifacts/architecture.md#Naming-Patterns` and `#Format-Patterns`.
- TypeScript strict mode, oxlint, oxfmt, Bun test framework all already configured by Story 1.0. Match the existing style and lint rules. Do not introduce ESLint or Prettier.

### Library / Framework Requirements

- `@trpc/server` v11+ (latest stable) — tRPC server + Fastify adapter live in the same package (`@trpc/server/adapters/fastify`).
- `drizzle-orm` (latest stable) — used by both `packages/shared` (type-level pg-core) and `apps/server` (runtime + type-level pg-core).
- `postgres` v3+ (`postgres.js`) — the Drizzle-recommended driver for PostgreSQL on Bun. Single dependency, no native bindings.
- `drizzle-kit` (latest stable) — devDependency of `apps/server` only. Used for future migration generation; not invoked in this story.
- `zod` v3+ — used by env validation and (in later stories) tRPC input validation.
- All four are listed in the architecture's allowed dependency set (`_bmad-output/planning-artifacts/architecture.md#API-Backend-Manual-Fastify-TypeScript-Scaffold` and `#API--Communication-Patterns`). No new dependencies outside this list — if anything else seems needed, HALT and ask.

### File Structure Requirements

After this story the server tree looks like:

```text
apps/server/
  drizzle.config.ts                  (new)
  .env.example                       (new)
  package.json                       (updated: deps, scripts)
  tsconfig.json                      (unchanged)
  src/
    index.ts                         (updated: wire env, tRPC, db decorator)
    index.test.ts                    (unchanged — still asserts /health)
    trpc.ts                          (new)
    routers/
      index.ts                       (new)
      index.test.ts                  (new)
    db/
      client.ts                      (new)
      client.test.ts                 (new)
      schema.ts                      (new — re-exports from shared)
      migrations/.gitkeep            (new)
    lib/
      env.ts                         (new)
      env.test.ts                    (new)
    types/
      fastify.d.ts                   (new — only if needed for `db` decorator typing)
```

Shared workspace tree after this story:

```text
packages/shared/
  package.json                       (updated: drizzle-orm dep, ./schema export)
  tsconfig.json                      (unchanged)
  src/
    index.ts                         (updated: drop placeholder schema re-export)
    index.test.ts                    (updated if assertions need adjusting)
    schema/
      index.ts                       (rewritten: barrel re-exporting tasks)
      tasks.ts                       (new)
      tasks.test.ts                  (new)
```

Mobile workspace remains untouched in this story.

### Testing / Verification Requirements

- Test framework: Bun test (`bun test`) via the existing root `bun run test` script. Add tests as `*.test.ts` co-located next to source per the architecture's hard-co-location rule.
- Required new tests (each must be a real, executing test, not a stub):
  1. `packages/shared/src/schema/tasks.test.ts` — column names + inferred types compile.
  2. `apps/server/src/lib/env.test.ts` — valid env parses, missing `DATABASE_URL` throws, invalid URL throws, `PORT` coerces.
  3. `apps/server/src/db/client.test.ts` — `createDbClient(...)` returns a Drizzle client (no live connection asserted).
  4. `apps/server/src/routers/index.test.ts` — `appRouter.createCaller({}).health()` returns the expected payload, and `server.inject({ method: 'GET', url: '/trpc/health' })` returns 200 with `result.data.status === 'ok'`.
- The pre-existing test `apps/server/src/index.test.ts` MUST continue to pass unchanged.
- Update `package.json` test script ONLY if a new workspace-level test invocation is required. The current root `test` script already runs `packages/shared` and `apps/server` Bun tests; that is sufficient.
- Run quality gates from repo root before declaring any task complete: `bun run typecheck && bun run lint && bun run test`. Also run `bun run format:check`.
- Manual smoke test (record results in the Dev Agent Record):
  ```bash
  DATABASE_URL=postgres://stub:stub@localhost:5432/stub PORT=3001 bun --cwd apps/server start &
  curl -sS -i http://127.0.0.1:3001/health
  curl -sS -i http://127.0.0.1:3001/trpc/health
  ```
  The server MUST boot even though the Postgres URL is fake (Drizzle is lazy). If boot fails on a fake URL, the lazy-connect requirement (AC3) is violated.

### Latest Technical Notes

- `@trpc/server` v11 is the current major. v11 split `initTRPC` and the Fastify adapter into `@trpc/server` and `@trpc/server/adapters/fastify`; both ship from the same package, so a single dependency suffices.
- `fastifyTRPCPlugin` from `@trpc/server/adapters/fastify` registers tRPC at a configured `prefix`. Pass `{ router, createContext }` in the plugin options.
- `drizzle-orm` for PostgreSQL: import the dialect builders from `drizzle-orm/pg-core` and the runtime client from `drizzle-orm/postgres-js`.
- `postgres.js` v3+ accepts a connection string and lazy-connects on first query. No `await` is required to construct the client.
- `drizzle-kit` `defineConfig` is the v0.30+ recommended config shape (replaces `Config` typed objects). Use `dialect: 'postgresql'`.
- Zod v3's `z.coerce.number()` is the documented pattern for env-string-to-number coercion.
- Bun supports `import.meta.main` (already used in the existing `apps/server/src/index.ts`) — keep that pattern for the entry point gate.

### Resolved Clarifications

- "Server-side task schema mirrors the local schema (via packages/shared)" — the local SQLite schema does not exist yet (Epic 1 has not built it). For this story we define ONLY the canonical PostgreSQL `tasks` schema in `@one-down/shared`. When Epic 1 (or Story 5.3 sync) introduces a parallel SQLite schema, both will live under `packages/shared/src/schema/` and share field shapes by convention (and ideally by a shared interface). Do not pre-emptively add an SQLite version in this story.
- "tRPC HTTP path" — mount at `/trpc` (architecture default). Procedure URL becomes `/trpc/<procedure>` for queries (GET) and mutations (POST batched), matching the standard Fastify adapter behaviour.
- "Health endpoints" — keep both. Fastify `GET /health` is for infrastructure liveness probes (Railway, etc.) and remains identical to its Story 1.0 form. tRPC `health` is for Story 5.1 end-to-end client/server verification.
- "DATABASE_URL during local dev with no real Postgres" — accept any syntactically valid `postgres://...` URL. Drizzle/postgres-js are lazy. Tests must not require a live database.
- "Where does the `tasks` schema live in `@one-down/shared`?" — at `packages/shared/src/schema/tasks.ts`, exposed via the new `./schema` subpath export. Removing the placeholder from the main `.` barrel prevents `drizzle-orm/pg-core` from leaking into the mobile bundle.
- "Should we add `@fastify/cors`, `@fastify/auth`, `@fastify/rate-limit`?" — No. Those plugins are pulled in alongside their owning concern (auth/CORS) in Stories 5.1/5.2.

### Previous Story Intelligence

- Story 1.0 (project scaffold) already established: Bun workspaces monorepo at `apps/mobile`, `apps/server`, `packages/shared`; `@one-down/shared` workspace name; root scripts `lint`, `format:check`, `typecheck`, `test`; oxlint + oxfmt + TypeScript strict; `apps/server` already has a Fastify 5 server with `buildServer(options)`, `GET /health`, and a passing Bun test at `apps/server/src/index.test.ts`.
- The existing `buildServer` function in `apps/server/src/index.ts` accepts `FastifyServerOptions`. Preserve that signature; extend it (e.g. accept an optional `db` injection) rather than replacing it, so the existing test continues to pass without modification.
- The existing `apps/server/package.json` exposes `dev`, `start`, `lint`, `test`, `typecheck`. Add `db:generate` (drizzle-kit) but do not remove or rename existing scripts.
- The existing `packages/shared/src/index.ts` re-exports `DRIZZLE_SCHEMA_PLACEHOLDER` from `./schema`. Removing that re-export is intentional in this story; update `packages/shared/src/index.test.ts` if it asserts on the placeholder.
- Story 1.0 deferred CI/CD and EAS pipelines to Epic 5. Story 5.0 still does not own those — they are tracked separately and not blocking this story.

### Project Structure Notes

- The architecture's planned tree (architecture.md lines 576–606) lists files we are NOT creating in this story (`routers/sync.ts`, `routers/ai.ts`, `services/*`, `middleware/*`, `lib/posthog.ts`). Those omissions are intentional — they belong to later stories. The structure is therefore aligned with the architecture's *Story 5.0 slice*, not the full end-state.
- `packages/shared/src/schema/index.ts` exists today as a placeholder. We rewrite it in place; the file path stays the same.
- `apps/server/src/db/migrations/` is created empty (with `.gitkeep`) so `drizzle-kit` has a stable target. Story 5.3 will populate it with the first generated migration.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-50-Backend-API-Scaffold] — story user story + acceptance criteria.
- [Source: _bmad-output/planning-artifacts/architecture.md#API-Backend-Manual-Fastify-TypeScript-Scaffold] — manual Fastify + Drizzle + Postgres choice.
- [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns] — tRPC + Fastify adapter pattern, error handling.
- [Source: _bmad-output/planning-artifacts/architecture.md#ORM-Decision-Drizzle-ORM-Both-Sides] — Drizzle on both sides, postgres.js driver.
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming-Patterns] — Drizzle / tRPC / TypeScript / file naming conventions.
- [Source: _bmad-output/planning-artifacts/architecture.md#Format-Patterns] — date format, IDs, JSON casing rules.
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure-Boundaries] — server tree structure.
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries] — `packages/shared/src/schema/` is the data source of truth.
- [Source: _bmad-output/implementation-artifacts/1-0-project-scaffold-and-development-foundation.md] — established scaffold (Bun workspaces, oxlint/oxfmt, Bun test, existing `buildServer` and `/health` route).
- [Source: ./CLAUDE.md] — Bun + oxlint + oxfmt + TypeScript strict, no Prettier/ESLint, kebab-case files, conventional commits.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — polecat nux

### Debug Log References

- `bun add --cwd packages/shared drizzle-orm` → installed `drizzle-orm@0.45.2`.
- `bun add --cwd apps/server zod` → installed `zod@4.4.3`.
- `bun add --cwd apps/server drizzle-orm postgres` → installed `drizzle-orm@0.45.2`, `postgres@3.4.9`.
- `bun add --cwd apps/server -d drizzle-kit` → installed `drizzle-kit@0.31.10`.
- `bun add --cwd apps/server @trpc/server` → installed `@trpc/server@11.17.0`.
- `bun --cwd packages/shared typecheck && bun --cwd packages/shared test` → 4 pass / 0 fail.
- `bun --cwd apps/server test` → 10 pass / 0 fail across `index.test.ts`, `routers/index.test.ts`, `lib/env.test.ts`, `db/client.test.ts`.
- `bun run typecheck` → all three workspaces pass.
- `bun run lint` → 0 warnings, 0 errors across 35 files.
- `bun run format` then `bun run format:check` → all 53 matched files clean.
- `bun run test` → shared (4) + server (10) all pass.
- Smoke test: `DATABASE_URL=postgres://stub:stub@localhost:5432/stub PORT=3001 bun --cwd apps/server start` boots the server with a fake Postgres URL.
  - `curl -sS http://127.0.0.1:3001/health` → `{"service":"one-down-api","sharedPackage":"@one-down/shared","status":"ok"}`.
  - `curl -sS http://127.0.0.1:3001/trpc/health` → `{"result":{"data":{"status":"ok","service":"one-down-api","sharedPackage":"@one-down/shared","timestamp":"2026-05-05T04:30:44.952Z"}}}`.

### Completion Notes List

- Added `drizzle-orm` to `packages/shared` and replaced the placeholder schema with a real `tasks` `pgTable` that mirrors the canonical task shape (`id`, `userId`, `content`, `status`, `createdAt`, `updatedAt`). Inferred `Task` and `NewTask` types are exported.
- Exposed the Drizzle schema via a dedicated `@one-down/shared/schema` subpath so the mobile workspace bundle continues to import only the lightweight string/type barrel from `@one-down/shared`. The mobile workspace was not modified — verified by `bun --cwd apps/mobile typecheck` passing.
- Added `apps/server/src/lib/env.ts` with a Zod 4 schema enforcing `DATABASE_URL` (URL), `PORT` (1–65535), `HOST` (non-empty), `NODE_ENV` (`development|test|production`). On invalid input, `loadEnv` throws an `Error` whose message lists each failed path. `apps/server/.env.example` documents the four variables.
- Added `apps/server/src/db/client.ts#createDbClient(databaseUrl)` returning a Drizzle client built from `postgres-js` with the shared schema attached. Lazy-connects (verified via boot smoke test against a stub Postgres URL). `drizzle.config.ts` is wired at `apps/server/drizzle.config.ts` for future `drizzle-kit generate` runs (Story 5.3 will own the first migration). Added a `db:generate` script.
- Added `apps/server/src/trpc.ts` (initTRPC + `createContext({ req })` factory) and `apps/server/src/routers/index.ts` (root `appRouter` with a `health` public query). Mounted `fastifyTRPCPlugin` at `/trpc` in `apps/server/src/index.ts` while preserving the existing Fastify `GET /health` route. The `buildServer(options)` signature is extended with an optional `db` injection so tests can run without `DATABASE_URL`.
- The pre-existing test `apps/server/src/index.test.ts` (Fastify `/health`) still passes unchanged.
- All four quality gates pass from repo root: `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test`.

### File List

- `packages/shared/package.json` (modified — added `drizzle-orm` dep + `./schema` subpath export)
- `packages/shared/src/index.ts` (modified — dropped `DRIZZLE_SCHEMA_PLACEHOLDER` re-export)
- `packages/shared/src/index.test.ts` (modified — assertion updated to match new barrel)
- `packages/shared/src/schema/index.ts` (rewritten — barrel re-exporting `./tasks`)
- `packages/shared/src/schema/tasks.ts` (new — canonical `tasks` `pgTable`)
- `packages/shared/src/schema/tasks.test.ts` (new)
- `apps/server/package.json` (modified — added deps `@trpc/server`, `drizzle-orm`, `postgres`, `zod`; devDep `drizzle-kit`; script `db:generate`)
- `apps/server/.env.example` (new)
- `apps/server/drizzle.config.ts` (new)
- `apps/server/src/index.ts` (modified — wires tRPC + env + db decorator)
- `apps/server/src/trpc.ts` (new)
- `apps/server/src/routers/index.ts` (new)
- `apps/server/src/routers/index.test.ts` (new)
- `apps/server/src/db/client.ts` (new)
- `apps/server/src/db/client.test.ts` (new)
- `apps/server/src/db/schema.ts` (new — re-exports from `@one-down/shared/schema`)
- `apps/server/src/db/migrations/.gitkeep` (new)
- `apps/server/src/lib/env.ts` (new)
- `apps/server/src/lib/env.test.ts` (new)
- `bun.lock` (modified — generated by `bun add` runs)

### Change Log

- 2026-05-05: Implemented Story 5.0 — added canonical `tasks` schema in `@one-down/shared`, server-side env validation (Zod), Drizzle + `postgres-js` client, drizzle-kit config, tRPC server with Fastify adapter and a `health` scaffold procedure, and end-to-end quality-gate verification.
- 2026-05-05: Self code review — graded each AC, addressed two Low-severity findings (Context `req` made optional; Drizzle test added explicit cleanup). No High or Medium findings.

## Senior Developer Review (AI)

**Reviewer:** Polecat nux (self-review per Stage 3 brief). Performed against the diff before staging.
**Review date:** 2026-05-05
**Outcome:** **Approve.** All six acceptance criteria are satisfied. Quality gates green. No High or Medium severity findings.

### AC-by-AC Grade

| AC | Description | Grade | Notes |
|---|---|---|---|
| 1 | Server still boots; `GET /health` responds | ✅ Pass | Existing `apps/server/src/index.test.ts` passes unchanged. Smoke-tested live server with stub `DATABASE_URL`, both `/health` and `/trpc/health` returned 200. |
| 2 | tRPC + Fastify adapter at `/trpc`, `health` procedure, context factory | ✅ Pass | `apps/server/src/trpc.ts` (initTRPC + `createContext`), `apps/server/src/routers/index.ts` (`appRouter.health`), `fastifyTRPCPlugin` registered at `prefix: '/trpc'`. Two tests cover both direct `createCaller` and Fastify HTTP injection. |
| 3 | Drizzle + `postgres-js`, schema re-exported, `drizzle.config.ts` for migrations | ✅ Pass | `apps/server/src/db/client.ts#createDbClient`, `apps/server/src/db/schema.ts` re-exports from `@one-down/shared/schema`, `drizzle.config.ts` targets `./src/db/migrations/`. `db:generate` script added (intentionally not invoked — Story 5.3 owns the first migration). |
| 4 | `tasks` `pgTable` mirrors local task shape; `./schema` subpath export | ✅ Pass | Six columns with correct primary key + not-null constraints, `Task`/`NewTask` types inferred. `packages/shared/package.json` `exports` adds `./schema`. The main `.` barrel no longer re-exports `drizzle-orm/pg-core`, keeping mobile bundles clean (mobile `tsc` passes). |
| 5 | Zod env validation, error on missing config, `.env.example` | ✅ Pass | `loadEnv` validates all four variables, throws an `Error` listing every failed path. `apps/server/.env.example` documents the four variables. Six tests cover the happy path, defaults, coercion, and three failure modes. |
| 6 | All quality gates pass + four required new tests | ✅ Pass | `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test` all green. Required tests: tRPC `health` payload + HTTP (in `routers/index.test.ts`), env validator missing-DATABASE_URL (`lib/env.test.ts`), `tasks` schema columns (`schema/tasks.test.ts`), `createDbClient` instantiation (`db/client.test.ts`). |

### Findings

| # | Severity | File | Finding | Resolution |
|---|---|---|---|---|
| 1 | Low | `apps/server/src/trpc.ts` | The `Context` type required `req` to always be defined, forcing `appRouter.createCaller({ req: undefined as never })` in unit tests. | **Resolved.** Made `req` optional on `Context`; tests now use `createCaller({})` cleanly. Future Fastify-mounted requests still receive a real `req`; non-HTTP callers (tests, future server-side workers) get a safer type. |
| 2 | Low | `apps/server/src/db/client.test.ts` | The Drizzle client owns a `postgres()` connection pool. Even without a query, leaving it dangling between test files could keep handles open. | **Resolved.** Added an `afterEach` cleanup that calls `sql.end({ timeout: 0 })`. |
| 3 | Info | `apps/server/drizzle.config.ts` | Reads `process.env.DATABASE_URL` directly. | **Accepted.** drizzle-kit is a CLI invoked outside the server runtime; its config file is the documented place to read env vars. The "no `process.env` outside `env.ts`" guardrail applies to the server entry/runtime, not to tooling configs. |
| 4 | Info | `apps/server/src/index.ts` | `server.register(fastifyTRPCPlugin, ...)` is not awaited inside `buildServer`. | **Accepted.** This matches the documented Fastify pattern. Plugins load lazily at `ready()`/`listen()` time, which `server.inject()` triggers internally. The Fastify `/health` test, the new tRPC HTTP test, and the live smoke test all confirm the plugin loads correctly. |
| 5 | Info | Schema mirroring | The story says "server-side task schema mirrors the local schema". The local SQLite schema does not exist yet (Epic 1 has not built it). | **Accepted and documented in Resolved Clarifications.** Story 5.0 defines the canonical PG schema in `@one-down/shared`. When Epic 1 (or Story 5.3) introduces a parallel SQLite schema, both will live under `packages/shared/src/schema/` and share field shapes by convention. |

### Risk Assessment

- **Production impact:** None. This is scaffold work; no end-user-visible behaviour is shipped.
- **Forward-compatibility:** The chosen tRPC v11 + Fastify adapter pattern, the `@one-down/shared/schema` subpath, and the lazy `createDbClient` factory all match the architecture's planned shape and are the foundations Story 5.1 (mobile tRPC client), 5.2 (auth middleware), and 5.3 (sync router + first migration) will build on. No anticipated rework.
- **Test pyramid:** All four required new tests exist as real executing tests (no stubs). The pre-existing Fastify `/health` test was preserved verbatim. Live-DB integration tests are appropriately deferred — Story 5.3 will own them per the architecture's `Sync Testing` note.

### Action Items

- [x] (Low) Make tRPC `Context.req` optional and simplify the direct-caller test.
- [x] (Low) Add explicit cleanup of the postgres pool in `db/client.test.ts`.
- [ ] (No action) Items #3–#5 above are accepted as-is.
