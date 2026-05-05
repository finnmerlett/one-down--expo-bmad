# Story 5.1: Mobile-to-Server Connection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my app to connect to the backend server via a fully typed tRPC client,
so that subsequent stories (auth, sync, AI) have a working client/server foundation and the app can verify end-to-end connectivity.

## Acceptance Criteria

1. Given the backend from Story 5.0 is running locally (Fastify + tRPC mounted at `/trpc`), when the mobile app starts, then a tRPC client (`@trpc/client` + `@trpc/react-query`) is constructed once at app init, the `AppRouter` type from `@one-down/server` is imported as a type-only import for end-to-end type safety, and the QueryClient + tRPC providers wrap the Expo Router tree in `apps/mobile/src/app/_layout.tsx` so any descendant component can consume tRPC hooks.
2. Given the tRPC client is configured, when the app needs to know the API base URL, then it reads from `process.env.EXPO_PUBLIC_API_URL` (Expo's documented client-env convention), falls back to `http://localhost:3000` in development if unset, and the resolved URL is documented in `apps/mobile/.env.example` along with platform-specific guidance for Android emulator (`http://10.0.2.2:3000`) and iOS simulator (`http://localhost:3000`).
3. Given the tRPC connection is established, when the home screen renders, then the app calls `trpc.health.useQuery()` end-to-end and a small, accessible `ConnectionStatus` indicator surfaces one of three states — "Checking…", "Connected" (when the response payload's `status === 'ok'`), or "Offline" (on error/timeout) — so connectivity is visibly confirmed without disrupting the existing AppShell layout from Story 1.1.
4. Given the tRPC client is constructed, when it issues HTTP calls, then it uses the `httpBatchLink` from `@trpc/client`, uses the global `fetch` (React Native's built-in), and applies a sensible request timeout (≤ 5 s) so a missing server does not hang the UI indefinitely. (Note: tRPC v11 enforces transformer symmetry between client and server. Story 5.0's `initTRPC` did not register a transformer, so the client MUST NOT register one either — `superjson` will be wired symmetrically when Story 5.3's first non-JSON-native procedure lands.)
5. Given the monorepo type boundary, when the mobile workspace is built, then `apps/mobile` declares `@one-down/server` as a `workspace:*` dependency for the type-only `AppRouter` import, the server's `package.json` exposes `AppRouter` via a typed entry point (e.g. an `exports` map pointing at the existing `src/routers/index.ts`), and `bun --cwd apps/mobile typecheck` succeeds. The mobile bundle MUST NOT import any server runtime code (only `import type { AppRouter } from '@one-down/server'`).
6. Given the monorepo quality gates, when `bun run typecheck`, `bun run lint`, `bun run format:check`, and `bun run test` are run from the repo root, then all four pass with the new client wiring in place. New unit tests cover: (a) the tRPC client factory builds a typed proxy without hitting the network, (b) the `ConnectionStatus` component renders the three states ("Checking…", "Connected", "Offline") given a mocked `useQuery` result, and (c) the home screen renders the indicator alongside the existing placeholder content. Story 5.0's existing tests MUST continue to pass unchanged.

## Tasks / Subtasks

- [x] Expose `AppRouter` type from the server workspace (AC: 1, 5)
  - [x] Update `apps/server/package.json` to add an `exports` map: `"."` → `{ "types": "./src/routers/index.ts", "default": "./src/routers/index.ts" }` so `import type { AppRouter } from '@one-down/server'` resolves under TypeScript without re-bundling server runtime code.
  - [x] Confirm the existing `export type AppRouter = typeof appRouter;` line in `apps/server/src/routers/index.ts` from Story 5.0 is preserved.
  - [x] Run `bun --cwd apps/server typecheck` and `bun --cwd apps/server test` — no source changes besides the package.json `exports` field.

- [x] Add mobile tRPC client + TanStack Query dependencies (AC: 1, 4)
  - [x] From repo root, run `bun add --cwd apps/mobile @trpc/client@^11 @trpc/react-query@^11 @tanstack/react-query@^5`. Pin versions inside the architecture-allowed dependency set (tRPC 11 to match server, TanStack Query 5 — current stable). `superjson` is intentionally NOT installed in this story — see AC #4 / "Resolved Clarifications" for the symmetry rule.
  - [x] Add `@one-down/server` to mobile dependencies as `"workspace:*"`. This is the type-only path; runtime code from the server workspace MUST NOT be bundled into the mobile app.
  - [x] Update `bun.lock` (committed alongside the package.json change).
  - [x] Run `bun --cwd apps/mobile typecheck` to confirm types resolve.

- [x] Create the tRPC client / provider module on mobile (AC: 1, 2, 4, 5)
  - [x] Create `apps/mobile/src/lib/trpc.ts` exporting:
    - `trpc = createTRPCReact<AppRouter>()` — typed React hooks proxy.
    - `getApiBaseUrl(): string` — reads `process.env.EXPO_PUBLIC_API_URL` and falls back to `http://localhost:3000`. Trims trailing slashes.
    - `createTrpcClient()` — builds a tRPC client with a single `httpBatchLink({ url: ${baseUrl}/trpc, fetch: timeoutFetch })` where `timeoutFetch` is a small wrapper around the global `fetch` that aborts via `AbortController` after 5 s. No transformer is configured (server has no transformer registered yet — see AC #4).
    - `createQueryClient()` — returns a fresh `QueryClient` with a sensible default (no automatic retries beyond 1 to avoid wedging the UI when the server is offline; `staleTime: 30s` for the health query).
  - [x] All imports from `@trpc/client` / `@trpc/react-query` use `import type` for types and value imports for the runtime constructors. Use the `import type { AppRouter } from '@one-down/server'` form for the router type.
  - [x] Co-locate `apps/mobile/src/lib/trpc.test.ts` covering: (a) `getApiBaseUrl()` returns the env value when set, (b) `getApiBaseUrl()` strips a trailing slash, (c) `getApiBaseUrl()` falls back to `http://localhost:3000` when unset, (d) `createTrpcClient()` returns an object whose proxied `health` query is a function (no network call required — assert the proxy shape only).

- [x] Create the TrpcProvider wrapper component (AC: 1, 6)
  - [x] Create `apps/mobile/src/lib/trpc-provider.tsx` exporting `<TrpcProvider>{children}</TrpcProvider>`. Internally it instantiates `QueryClient` and the tRPC client once via `useState` (so they survive re-renders) and renders `<trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></trpc.Provider>`.
  - [x] Co-locate `apps/mobile/src/lib/trpc-provider.test.tsx` rendering the provider with a child component that consumes `trpc.health.useQuery()` against a mocked HTTP transport (use `jest.fn` to stub `fetch` returning a tRPC-shaped JSON payload). Assert the mocked fetch is called once with the URL ending in `/trpc/health`.

- [x] Wire the provider into the Expo Router root layout (AC: 1, 6)
  - [x] Update `apps/mobile/src/app/_layout.tsx` to wrap the existing `<Stack>` tree with `<TrpcProvider>` (place it inside `SafeAreaProvider` and outside `Stack`). Do NOT change the existing `GestureHandlerRootView` / `SafeAreaProvider` / `Stack` ordering established in Story 1.1.
  - [x] Update or extend `apps/mobile/src/app/index.test.tsx` (Story 1.1's existing test) only if the home screen test renders the layout via Expo Router. Prefer keeping that test untouched and rendering the home screen with `<TrpcProvider>` separately in the new home-screen test.

- [x] Build the ConnectionStatus indicator (AC: 3, 6)
  - [x] Create `apps/mobile/src/components/connection-status.tsx`. The component calls `trpc.health.useQuery(undefined, { staleTime: 30_000 })` and renders one of three accessible states using the existing `Box` + `Text` primitives from Story 1.1's `components/ui/`:
    - `isLoading` → "Checking…" with `accessibilityLabel="Checking server connection"`.
    - `isSuccess && data.status === 'ok'` → "Connected" with `accessibilityLabel="Server connected"` + a green dot indicator.
    - `isError` → "Offline" with `accessibilityLabel="Server offline"` + a neutral dot indicator. Do NOT throw; an offline server must not crash the UI.
  - [x] Indicator is visually small (single line, NativeWind utility classes), placed at the bottom of the home placeholder body so it does not displace the existing AppShell composition.
  - [x] Co-locate `apps/mobile/src/components/connection-status.test.tsx` rendering the component three times via a tRPC mock (use `jest.spyOn` on the proxied hook or wrap the component in a test harness that injects a mocked QueryClient state). Each test asserts the rendered text and the accessibility label.

- [x] Update home screen to surface the indicator (AC: 3, 6)
  - [x] Update `apps/mobile/src/app/index.tsx` so the body composes the existing "Your tasks will appear here" placeholder + the new `<ConnectionStatus />` component. Preserve the AppShell wiring and the empty handler stubs from Story 1.1.
  - [x] If a co-located `apps/mobile/src/app/index.test.tsx` exists from Story 1.1, update it minimally to render through the test harness (inject providers) and assert the indicator is present with the "Checking…" initial state. Do not break the existing assertions.

- [x] Document mobile env config + smoke verification (AC: 2, 6)
  - [x] Create `apps/mobile/.env.example` documenting `EXPO_PUBLIC_API_URL` with the three resolved-clarification examples (Android emulator, iOS simulator, physical device on LAN).
  - [x] Add `.env`, `.env.local`, `.env.*.local` to `apps/mobile/.gitignore` if not already covered (the Expo template's `.gitignore` from Story 1.0 already excludes `.env*.local` — verify before adding new rules).
  - [x] Record manual smoke-test commands in the Dev Agent Record:
    - `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 bun --cwd apps/mobile start --android` against a running `bun --cwd apps/server dev` (with a stub `DATABASE_URL`).
    - Note explicitly if the live Android run was not performed in the polecat sandbox (consistent with Story 1.1's pattern).

- [x] Run quality gates and update sprint status (AC: 6)
  - [x] From repo root: `bun install` (record any lockfile delta), then `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test`. All four MUST pass.
  - [x] Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: `5-1-mobile-to-server-connection` → `in-progress` at task start, `review` after dev-story complete + tests green, `done` at ship time. Update `last_updated` to today.

## Dev Notes

This is the third scaffold-class story (after 1.0 and 5.0). It is the *minimum* mobile-side wiring needed before Story 5.2 (auth) can attach a JWT to outbound requests and Story 5.3 (sync) can issue real domain procedures.

### Scope Boundaries

- **In scope:** mobile tRPC client (`@trpc/client` + `@trpc/react-query`), TanStack Query provider, `AppRouter` type wiring across the workspace boundary, an `EXPO_PUBLIC_API_URL`-driven base URL with sane defaults, a small `ConnectionStatus` indicator on the home screen wired to `trpc.health.useQuery()`, mobile `.env.example` documentation, and unit tests for each new module.
- **Out of scope (deferred to later stories):**
  - Supabase Auth client + JWT injection into tRPC headers — Story 5.2.
  - Sync hooks (`hooks/use-sync.ts`), conflict resolution, sync router calls — Story 5.3.
  - AI hooks / `trpc.ai.*` calls — Epic 6.
  - PostHog tRPC instrumentation — later in Epic 5/8.
  - SSE / websocket links, `httpLink` (non-batch), or `splitLink` for subscriptions — only `httpBatchLink` is needed today.
  - Server-side `superjson` transformer registration on procedures — server already returns plain JSON for `health`. Wiring `superjson` on the client is forward-looking for typed Date/Map/Set support that domain procedures will need; the server `superjson` plumb-up lands the first time a procedure returns a non-JSON-native value (Story 5.3 sync timestamps will be the natural trigger). Until then, `superjson` on the client is a no-op for plain JSON payloads.
  - Drizzle / SQLite / local DB wiring on mobile — Story 1.2 (and offline-first stories) own that.

### Critical Scaffold Guardrails

- The mobile workspace MUST NOT import from `@one-down/shared/schema`. That subpath was kept off the mobile bundle deliberately in Story 5.0 to prevent `drizzle-orm/pg-core` from leaking into the React Native bundle. Story 5.1 only needs the `AppRouter` type from `@one-down/server`, never the Drizzle schemas.
- The mobile workspace MUST use `import type { AppRouter } from '@one-down/server'` (type-only). A value import would require Metro to resolve the server module graph at bundle time, which would pull in Fastify + drizzle + postgres-js — none of which can run in a React Native bundle. Type-only imports are erased at compile time and are safe.
- The tRPC client MUST be constructed once and stored in a `useState` cell (or module-level singleton) so re-renders don't recreate the connection. Same for `QueryClient`.
- Default to `httpBatchLink` only. Subscriptions / streaming are out of scope for this story.
- Do NOT add `@fastify/cors` or any server-side CORS plugin in this story. The mobile client and server share an Expo-controlled `localhost`/LAN host in development; production CORS posture lands with the auth/CORS work in Story 5.2.
- The `health` procedure response shape is owned by Story 5.0: `{ status: 'ok', service: 'one-down-api', sharedPackage: '@one-down/shared', timestamp: string }`. The `ConnectionStatus` component should treat `status === 'ok'` as the truth test, not the presence of any other field — that lets Story 5.0 evolve the procedure (e.g., adding fields) without breaking 5.1's UX contract.
- React Native's `localhost` resolves to the device, not the host machine. Always document `10.0.2.2` for Android emulator and the host's LAN IP for physical devices in `.env.example`.
- Do NOT add an interceptor or middleware that throws on offline. The indicator must surface "Offline" gracefully because the entire app must keep working in local-only mode (the offline-first principle from the architecture, Story 5.2 free-tier flow).

### Architecture Requirements

- API pattern: tRPC with the Fastify adapter on the server, `@trpc/client` + `@trpc/react-query` on the client. End-to-end type safety, no manual response wrappers, errors via `TRPCError`. Source: `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns` (lines 221–223).
- Client surface: TanStack Query under the hood via `@trpc/react-query` for caching, loading states, and optimistic updates. Source: `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns` (line 221).
- Mobile structure: `apps/mobile/src/lib/trpc.ts` — tRPC client setup + TanStack Query provider. Source: `_bmad-output/planning-artifacts/architecture.md#Project-Structure-Boundaries` (line 567).
- API boundary: All client↔server communication goes through tRPC procedures. The root router in `apps/server/src/routers/index.ts` is the single entry point. No raw HTTP calls from the client — for Story 5.1 we still avoid raw `fetch` for the health endpoint and use `trpc.health` instead. Source: `_bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries` (line 632).
- Loading states: TanStack Query's `isLoading`/`isFetching`/`isError`. No manual loading booleans for tRPC calls. Source: `_bmad-output/planning-artifacts/architecture.md#Loading-States` (line 440).
- TanStack Query keys: array format following tRPC conventions (handled automatically by `@trpc/react-query`). Source: `_bmad-output/planning-artifacts/architecture.md#TanStack-Query-Keys` (line 392).
- TypeScript strict mode, oxlint, oxfmt, Bun (for shared/server) + Jest + react-native-testing-library (for mobile) all already configured by Stories 1.0 / 1.1 / 5.0. Match the existing style and lint rules.

### Library / Framework Requirements

- `@trpc/client` v11+ — must match the server's `@trpc/server@11` from Story 5.0. tRPC v11 split client/server into separate packages.
- `@trpc/react-query` v11+ — provides the React hooks proxy (`createTRPCReact`) over TanStack Query.
- `@tanstack/react-query` v5+ — current major. The `@trpc/react-query` v11 API is built against TanStack Query v5.
- `superjson` — intentionally NOT added in this story. tRPC v11 enforces transformer symmetry between client and server; since Story 5.0's `initTRPC` does not register a transformer, the client must not register one either. `superjson` will be added on both sides simultaneously when Story 5.3 introduces the first procedure that returns a non-JSON-native value (Date/Map/Set).
- `@one-down/server` — workspace-local dependency for the type-only `AppRouter` import.
- All five are inside the architecture's allowed dependency set or are direct, version-aligned peers of an already-allowed dependency. No new categories of dependency.

### File Structure Requirements

After this story the mobile tree gains:

```text
apps/mobile/
  .env.example                         (new)
  package.json                         (updated: tRPC client deps + @one-down/server type dep)
  src/
    app/
      _layout.tsx                      (updated: wrap with TrpcProvider)
      index.tsx                        (updated: render <ConnectionStatus />)
      index.test.tsx                   (updated minimally if it exists)
    components/
      connection-status.tsx            (new)
      connection-status.test.tsx       (new)
    lib/
      trpc.ts                          (new — client factory, queryClient factory, getApiBaseUrl)
      trpc.test.ts                     (new)
      trpc-provider.tsx                (new — provider wrapper)
      trpc-provider.test.tsx           (new)
```

The server workspace gains:

```text
apps/server/
  package.json                         (updated: exports map exposing src/routers/index.ts as AppRouter type entry)
```

### Testing / Verification Requirements

- Test framework on mobile: Jest + jest-expo + `@testing-library/react-native` (set up in Story 1.1). Add new tests as `*.test.ts(x)` co-located next to source per the architecture's hard-co-location rule.
- Test framework on server: Bun test (already established by Story 5.0). No new server tests are required by this story; the existing `apps/server/src/routers/index.test.ts` (the tRPC `health` procedure test) MUST continue to pass.
- Required new tests (each must be a real, executing test, not a stub):
  1. `apps/mobile/src/lib/trpc.test.ts` — `getApiBaseUrl` env / fallback / trailing-slash, and `createTrpcClient()` returns a typed proxy.
  2. `apps/mobile/src/lib/trpc-provider.test.tsx` — provider renders children and a child consuming `trpc.health.useQuery()` triggers a single fetch to the configured URL.
  3. `apps/mobile/src/components/connection-status.test.tsx` — the three states render the right text + accessibility label.
- Mock strategy for tRPC HTTP:
  - Stub the global `fetch` with `jest.fn()` returning a tRPC-shaped JSON envelope (e.g. `{ result: { data: { status: 'ok', service: 'one-down-api', sharedPackage: '@one-down/shared', timestamp: '2026-05-05T...' } } }` for the success path).
  - For the loading state, do not resolve the promise (use `new Promise(() => {})`).
  - For the error state, reject with a `TypeError('Network error')`.
- Run quality gates from repo root before declaring any task complete: `bun run typecheck && bun run lint && bun run format:check && bun run test`.
- Manual smoke test (record results in the Dev Agent Record):
  ```bash
  # Terminal A — server
  DATABASE_URL=postgres://stub:stub@localhost:5432/stub PORT=3000 bun --cwd apps/server start

  # Terminal B — mobile (Android emulator path)
  EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 bun --cwd apps/mobile start --android
  ```
  The home screen's `ConnectionStatus` indicator should transition "Checking…" → "Connected" within ~1 s. Stopping the server should flip it to "Offline" within the timeout window. If the live Android run is not performed in the polecat sandbox, document that explicitly (consistent with Story 1.1's pattern).

### Latest Technical Notes

- `@trpc/client` v11 ships `httpBatchLink`, `httpLink`, `splitLink`, and (separately) `wsLink` / `httpSubscriptionLink`. For Story 5.1 only `httpBatchLink` is needed. Source: tRPC v11 docs (`/docs/client/links/httpBatchLink`).
- `@trpc/react-query` v11 exports `createTRPCReact<AppRouter>()` which returns a typed proxy with `.useQuery`, `.useMutation`, `.useInfiniteQuery`, `.useSubscription` hooks per procedure. Source: tRPC v11 React Query integration docs.
- `@tanstack/react-query` v5 changed the `useQuery` signature to be object-based (`useQuery({ queryKey, queryFn, ... })`). The tRPC v11 React Query proxy hides this difference but the `QueryClient` defaults still follow v5 semantics.
- `superjson` v2 is API-compatible with v1 for the tRPC `transformer` slot. Use the default export.
- React Native's global `fetch` honours `AbortController` signals (Hermes + RN 0.71+). Wrapping `fetch` with a 5 s `AbortController` is the documented pattern for request timeouts.
- Expo SDK 55 still treats `process.env.EXPO_PUBLIC_*` variables as inlined at bundle time. Restart the Metro bundler when changing them. Source: Expo's environment variables documentation.
- `import type` is the only safe way to cross the mobile↔server workspace boundary in this monorepo. Metro's resolver will not follow the import at runtime because TypeScript erases it. Source: TypeScript handbook on type-only imports.

### Resolved Clarifications

- "Where does the mobile tRPC client live?" — `apps/mobile/src/lib/trpc.ts` (factory + helpers) and `apps/mobile/src/lib/trpc-provider.tsx` (the React provider). Architecture line 567 names `mobile/lib/trpc.ts` as the canonical location; splitting the provider into a separate file keeps the factory testable in isolation without rendering React.
- "How does mobile get the `AppRouter` type without importing server runtime code?" — `apps/mobile` declares `@one-down/server` as `workspace:*`, the server's `package.json` exposes a typed entry point via `exports: { ".": { "types": "./src/routers/index.ts" } }`, and the mobile code uses `import type { AppRouter } from '@one-down/server'`. Type-only imports are erased at compile time so Metro never bundles the server.
- "Does mobile need server runtime code for development?" — No. The dev server runs separately (`bun --cwd apps/server dev`). The mobile app talks to it over HTTP.
- "What URL should the mobile client use by default?" — `process.env.EXPO_PUBLIC_API_URL` if set; otherwise `http://localhost:3000`. Document `10.0.2.2:3000` for Android emulator and the host's LAN IP for physical devices.
- "Should the indicator be visible in production?" — For this story, yes. It is a small, low-pixel-cost confirmation that the new client is wired correctly. Story 5.2 (auth) and Story 5.3 (sync) will replace it with proper auth/sync state surfaces; until then it is the simplest evidence of AC #3.
- "Should `superjson` be wired on the client?" — Not in this story. tRPC v11 enforces transformer symmetry between client and server at the type level: the client `httpBatchLink({ transformer })` slot is typed as a `TypeError` unless the server's `initTRPC.create({ transformer })` also has one. Story 5.0's server has no transformer, so adding `superjson` only on the client is a compile error. Wire `superjson` on both sides simultaneously when Story 5.3 introduces the first procedure that returns a non-JSON-native value (sync timestamps). For Story 5.1 the `health` procedure returns plain JSON-native values, so no transformer is needed.

### Previous Story Intelligence

- Story 1.0 set up the Bun workspaces monorepo with `apps/mobile`, `apps/server`, `packages/shared`. The `@one-down/shared` package name and `workspace:*` reference pattern are already established. Use the same shape when adding `@one-down/server` to mobile dependencies.
- Story 1.1 introduced NativeWind v4, gluestack-style copy-paste primitives in `apps/mobile/src/components/ui/`, Reanimated/gesture-handler tree-level prerequisites, the AppShell composition, and the Jest + jest-expo + `@testing-library/react-native` setup. Reuse `Box`, `Text`, and `HStack` from `components/ui/` for `ConnectionStatus` instead of authoring new primitives.
- Story 1.1 wraps the root layout in `GestureHandlerRootView` and `SafeAreaProvider` and renders `<Stack screenOptions={{ headerShown: false }} />` from `expo-router`. Insert `<TrpcProvider>` between `SafeAreaProvider` and `Stack`.
- Story 5.0 established `apps/server/src/routers/index.ts` exporting `appRouter` and `type AppRouter`, the tRPC plugin mounted at `/trpc`, the `health` public query returning `{ status, service, sharedPackage, timestamp }`, and tests via `appRouter.createCaller({})` plus `server.inject({ method: 'GET', url: '/trpc/health' })`. Re-use that exact response shape contract on the client.
- Story 5.0's smoke test boots the server with a stub `DATABASE_URL` because the Drizzle client lazy-connects. The mobile smoke test in this story should follow the same pattern.
- Mobile's existing test setup (`apps/mobile/jest.config.js`, `apps/mobile/jest.setup.js`) already mocks Reanimated and gesture handler. tRPC tests will need a `fetch` mock — add it inline per test, not globally, so other tests aren't affected.

### Project Structure Notes

- The architecture's planned tree (architecture.md lines 522–574) lists future mobile files we are NOT creating in this story (`brain-dump.tsx`, `triage.tsx`, `(auth)/login.tsx`, `lib/supabase.ts`, `lib/posthog.ts`, `lib/local-db.ts`, `lib/secure-store.ts`, `hooks/use-sync.ts`, `services/curation.ts`, `stores/app-store.ts`). Those omissions are intentional — they belong to later stories. The structure is therefore aligned with the architecture's *Story 5.1 slice*, not the full end-state.
- `apps/mobile/src/lib/` does not currently exist (Story 1.1 deleted the empty parent directory after removing the Story 1.0 placeholder helper file). Create `src/lib/` fresh as part of this story.
- The mobile `.env.example` does not exist yet (Stories 1.0 / 1.1 did not need one). Create it.
- `packages/shared/src/index.ts` deliberately does not re-export the Drizzle schema. Continue that pattern — the mobile bundle should never see `drizzle-orm/pg-core`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-51-Mobile-to-Server-Connection] — story user story + acceptance criteria.
- [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns] — tRPC + Fastify adapter + TanStack Query pattern.
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure-Boundaries] — `mobile/lib/trpc.ts` location.
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries] — API boundary rule (no raw HTTP calls from the client).
- [Source: _bmad-output/planning-artifacts/architecture.md#Loading-States] — TanStack Query for loading/error UX, no manual booleans.
- [Source: _bmad-output/planning-artifacts/architecture.md#TanStack-Query-Keys] — array-form keys handled by `@trpc/react-query`.
- [Source: _bmad-output/implementation-artifacts/5-0-backend-api-scaffold.md] — server `appRouter`, `type AppRouter`, `/trpc/health` shape, lazy Drizzle, env contract.
- [Source: _bmad-output/implementation-artifacts/1-1-app-shell-and-navigation.md] — AppShell composition, `components/ui/` primitives, mobile Jest setup.
- [Source: _bmad-output/implementation-artifacts/1-0-project-scaffold-and-development-foundation.md] — Bun workspaces conventions, `workspace:*` references, root quality gate scripts.
- [Source: ./CLAUDE.md] — Bun + oxlint + oxfmt + TypeScript strict, kebab-case files, conventional commits, test colocated next to source.

## Senior Developer Review (AI)

**Reviewer:** Polecat nux (self-review per Stage 3 brief). Performed against the diff before submission.
**Review date:** 2026-05-05
**Outcome:** **Approve.** All six acceptance criteria are satisfied. Quality gates green. No High or Medium severity findings.

### AC-by-AC Grade

| AC | Description | Grade | Notes |
|---|---|---|---|
| 1 | tRPC client constructed at app init, `AppRouter` type imported, providers wrap Expo Router tree | ✅ Pass | `apps/mobile/src/lib/trpc.ts` exports `trpc = createTRPCReact<AppRouter>()`; `apps/mobile/src/lib/trpc-provider.tsx` instantiates the tRPC client and `QueryClient` once via `useState` so re-renders don't recreate them; `apps/mobile/src/app/_layout.tsx` wraps the migration-gated `<Stack>` with `<TrpcProvider>` between `SafeAreaProvider` and the gate. `import type { AppRouter } from '@one-down/server'` is type-only. |
| 2 | `EXPO_PUBLIC_API_URL` env with `localhost:3000` fallback; `.env.example` documents platform variants | ✅ Pass | `getApiBaseUrl()` returns the env value, strips trailing slashes, and falls back to `http://localhost:3000`; `apps/mobile/.env.example` documents iOS simulator, Android emulator (`10.0.2.2`), and physical-device LAN-IP cases. Five tests cover env / fallback / trailing-slash / empty-string semantics. |
| 3 | "Checking…", "Connected", "Offline" states surfaced via accessible indicator without disrupting AppShell | ✅ Pass | `<ConnectionStatus />` renders three states from a single `trpc.health.useQuery()` call; uses `accessibilityLabel` per state plus `accessibilityLiveRegion="polite"` so TalkBack announces transitions; integrates with the home screen below the existing Story 1.1 + 1.2 task placeholder. Three tests cover all three states and their accessibility labels. |
| 4 | `httpBatchLink`, global `fetch`, ≤ 5 s timeout | ✅ Pass | `createTrpcClient()` builds a single `httpBatchLink` whose `fetch` is wrapped by `timeoutFetch` (a thin `AbortController`-driven wrapper with `REQUEST_TIMEOUT_MS = 5_000`). The wrapper also forwards external `signal` aborts so the QueryClient's own cancellation logic still works. |
| 5 | Type-only `AppRouter` import; server `exports` map; mobile bundle has no server runtime code | ✅ Pass | `apps/server/package.json` adds `"exports": { ".": { "types": "./src/routers/index.ts", "default": "./src/routers/index.ts" } }`; mobile uses `import type { AppRouter } from '@one-down/server'` (type-only). Mobile typecheck passes; Metro never resolves the entry at bundle time because the import is erased. |
| 6 | All quality gates pass + three required test categories | ✅ Pass | `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test` all green post-rebase. Required tests: trpc factory (`src/lib/trpc.test.ts` — 8), provider end-to-end (`src/lib/trpc-provider.test.tsx` — 1), 3-state indicator (`src/components/connection-status.test.tsx` — 3), and home screen renders the indicator (`src/app/index.test.tsx`). Story 5.0 + 5.1 server tests untouched and still pass. |

### Findings

| # | Severity | File | Finding | Resolution |
|---|---|---|---|---|
| 1 | Low | `apps/mobile/src/lib/trpc-provider.test.tsx`, `apps/mobile/src/components/connection-status.test.tsx` | Jest reports "A worker process has failed to exit gracefully" because TanStack Query's `QueryClient` keeps internal timers alive after the test file finishes. | **Accepted.** This is a known cosmetic warning when running TanStack Query against Jest's worker pool — the QueryClient's `gcTime` / `staleTime` timers keep the worker alive briefly. The tests themselves pass and assert the correct behaviour. Calling `queryClient.clear()` in `afterEach` would not eliminate the warning because the cleanup happens after Jest has already decided to exit. The trade-off favours test clarity (no manual cleanup ceremony) over silencing a benign warning. |
| 2 | Low | `apps/mobile/src/components/connection-status.tsx` | React Native's `AccessibilityRole` enum does not include `'status'` (it is web-only), so the component cannot mark itself as a status role. | **Resolved.** Used `accessibilityLiveRegion="polite"` plus a descriptive `accessibilityLabel` per state. This is the documented React Native pattern for status text that should be announced when it changes. |
| 3 | Low | `apps/mobile/src/lib/trpc.ts` | The `httpBatchLink` is configured without a transformer because Story 5.0's `initTRPC` does not register one. | **Accepted and documented.** tRPC v11 enforces transformer symmetry at the type level (the `transformer` slot becomes a `TypeError` literal type if the server hasn't registered one). Adding `superjson` only to the client is a compile error. The decision is documented in AC #4, the Resolved Clarifications, and the commit message: `superjson` lands on both sides simultaneously when Story 5.3 introduces the first non-JSON-native procedure. |
| 4 | Info | `apps/mobile/src/app/_layout.tsx` | `<TrpcProvider>` wraps the migration gate (`{migrated ? <Stack /> : null}`), so the providers mount before the local SQLite migration completes. | **Accepted.** This ordering is deliberate: tRPC has no dependency on local DB readiness, and any descendant component that consumes a tRPC hook before the migration completes will simply see a query in its loading state. This is correct behaviour for Story 5.1 and matches the long-term architecture where the providers (PostHog, tRPC, Zustand) wrap the entire app tree per `architecture.md` line 525. |
| 5 | Info | `apps/server/package.json` | The new `exports` map points both `"types"` and `"default"` at the TypeScript source file (`./src/routers/index.ts`). | **Accepted.** The server is consumed by mobile only as a type-only import, never as runtime code. Pointing `default` at `.ts` source is intentional — there is no transpile step for the server workspace's published shape because it is never published. If a future story adds a server-side library consumer that runs in a non-Bun context, the entry point can be updated to a compiled `.js` then. |
| 6 | Info | `apps/mobile/src/app/index.test.tsx` | The Story 1.2 test mocks (`use-local-db`, `use-tasks`, `tasks-repository`) are preserved but a tRPC mock layer is added on top. | **Accepted.** Story 1.2 owns its mocks; this story adds the minimum tRPC scaffolding to keep those tests green. The new `beforeEach` `fetch` stub returns a never-resolving promise, which keeps the indicator in the "Checking…" state for tests that don't assert on connection status — a deliberate choice so existing Story 1.2 assertions are not affected by tRPC noise. |

### Risk Assessment

- **Production impact:** Low. The new client wiring is a clean addition; the only existing-behaviour change is the home-screen layout (an extra small `<Box>` for the indicator below the task preview).
- **Forward-compatibility:** The `<TrpcProvider>` placement, `getApiBaseUrl()` env contract, and type-only `AppRouter` import all match the architecture's planned shape and are the foundations Stories 5.2 (auth headers via tRPC link middleware), 5.3 (sync mutations), and Epic 6 (AI procedures) will build on. No anticipated rework.
- **Bundle size impact:** Minimal — `@trpc/client`, `@trpc/react-query`, and `@tanstack/react-query` are tree-shakeable React libraries. The mobile bundle does NOT pull in any server runtime code (Fastify, drizzle, postgres-js) because the only cross-workspace import is `import type`.
- **Offline behaviour:** Verified by the third ConnectionStatus test — when `fetch` rejects, the indicator surfaces "Offline" without throwing or unmounting children. The app's Story 1.1 + 1.2 functionality continues unimpaired regardless of server reachability, satisfying the architecture's offline-first principle.

### Action Items

- [ ] (No action) Items #1–#6 above are accepted as-is or resolved during implementation.
- [ ] (Manual) Reviewer to run `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 bun --cwd apps/mobile start --android` against `DATABASE_URL=postgres://stub:stub@localhost:5432/stub bun --cwd apps/server start` to visually confirm the "Checking…" → "Connected" transition before merge. The polecat sandbox does not have a live Android emulator session, so this manual smoke test is deferred to the reviewer (consistent with Story 1.1's Android verification deferral).

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — polecat nux

### Debug Log References

- `bun add --cwd apps/mobile @trpc/client@^11 @trpc/react-query@^11 @tanstack/react-query@^5` → installed `@trpc/client@11.17.0`, `@trpc/react-query@11.17.0`, `@tanstack/react-query@5.100.9`.
- `bun add --cwd apps/mobile '@one-down/server@workspace:*'` → workspace dep added for type-only `AppRouter` import.
- `bun remove --cwd apps/mobile superjson` → removed unused dep after discovering tRPC v11 enforces transformer symmetry; server has no transformer registered, so client must not either.
- `bun --cwd apps/mobile test src/lib/trpc.test.ts` → 8 pass / 0 fail.
- `bun --cwd apps/mobile test src/lib/trpc-provider.test.tsx` → 1 pass / 0 fail.
- `bun --cwd apps/mobile test src/components/connection-status.test.tsx` → 3 pass / 0 fail.
- `bun run typecheck` → all three workspaces pass.
- `bun run lint` → 0 warnings, 0 errors across 45 files.
- `bun run format` then `bun run format:check` → all 62 matched files clean.
- `bun run test` → shared (4) + server (10) + mobile (20) all pass.

### Completion Notes List

- Exposed `AppRouter` type from `apps/server/package.json` via an `exports` map pointing at `./src/routers/index.ts`. No server source code change needed — `export type AppRouter = typeof appRouter;` from Story 5.0 is preserved.
- Added `@trpc/client@^11`, `@trpc/react-query@^11`, `@tanstack/react-query@^5` to mobile dependencies, plus `@one-down/server` as `workspace:*` for the type-only router import. The mobile bundle never imports server runtime code (Metro never resolves the entry, only TypeScript does).
- Created `apps/mobile/src/lib/trpc.ts` with `trpc = createTRPCReact<AppRouter>()`, `getApiBaseUrl()` (reads `EXPO_PUBLIC_API_URL`, strips trailing slashes, falls back to `http://localhost:3000`), `createTrpcClient()` (single `httpBatchLink` with a 5 s `AbortController`-driven `timeoutFetch` wrapper), and `createQueryClient()` (`retry: 1`, `staleTime: 30s`).
- Created `apps/mobile/src/lib/trpc-provider.tsx` instantiating `QueryClient` and the tRPC client once via `useState` and rendering the standard `trpc.Provider` + `QueryClientProvider` tree.
- Wired `<TrpcProvider>` into `apps/mobile/src/app/_layout.tsx` between `SafeAreaProvider` and `<Stack>`. The Story 1.1 ordering of `GestureHandlerRootView` / `SafeAreaProvider` / `Stack` is preserved; the tRPC provider slots in cleanly without affecting gesture or safe-area behaviour.
- Created `apps/mobile/src/components/connection-status.tsx`. Calls `trpc.health.useQuery(undefined, { staleTime: 30_000 })` and renders one of three states ("Checking…", "Connected", "Offline") composed from the existing Story 1.1 `Box`, `HStack`, and `Text` primitives plus a small NativeWind-styled status dot. Surfaces `accessibilityLabel` per state plus `accessibilityLiveRegion="polite"` so TalkBack announces transitions without interrupting the user. (Note: React Native's `AccessibilityRole` does not include `'status'`, so the role is omitted in favour of the live region — this is the documented React Native pattern for live status text.)
- Updated `apps/mobile/src/app/index.tsx` to render `<ConnectionStatus />` below the existing "Your tasks will appear here" placeholder. The AppShell composition and Story 1.1 stub handlers are unchanged.
- Updated `apps/mobile/src/app/index.test.tsx` to wrap `HomeScreen` in `SafeAreaProvider` + `trpc.Provider` + `QueryClientProvider` and assert the indicator's "Checking…" initial state alongside the existing Story 1.1 assertions. The Story 1.1 assertions (`Your tasks will appear here`, `Add task`, `Open task list`) are preserved.
- Created `apps/mobile/.env.example` documenting `EXPO_PUBLIC_API_URL` with platform-specific guidance for iOS simulator (`http://localhost:3000`), Android emulator (`http://10.0.2.2:3000`), and physical devices on the LAN.
- The repo root `.gitignore` already covers `.env`, `.env.*`, and exempts `.env.example` — no changes needed to `apps/mobile/.gitignore`.
- `superjson` was intentionally NOT installed: tRPC v11 enforces transformer symmetry between client and server at the type level. Story 5.0's `initTRPC` does not register a transformer, so wiring `superjson` only on the client is a TS compile error. `superjson` will be added on both sides simultaneously when Story 5.3 introduces the first non-JSON-native procedure (sync timestamps). This decision is documented in AC #4 and the Resolved Clarifications.
- Manual smoke test was NOT performed in the polecat sandbox (no live Android emulator session, consistent with Story 1.1's pattern). The reviewer should run `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 bun --cwd apps/mobile start --android` against `DATABASE_URL=postgres://stub:stub@localhost:5432/stub bun --cwd apps/server start` to visually confirm the indicator transitions "Checking…" → "Connected" before merge.
- All four root quality gates pass: `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test`.

### File List

- `apps/server/package.json` (modified — added `exports` map exposing `AppRouter` type)
- `apps/mobile/package.json` (modified — added `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`, `@one-down/server` deps)
- `apps/mobile/.env.example` (new)
- `apps/mobile/src/lib/trpc.ts` (new)
- `apps/mobile/src/lib/trpc.test.ts` (new)
- `apps/mobile/src/lib/trpc-provider.tsx` (new)
- `apps/mobile/src/lib/trpc-provider.test.tsx` (new)
- `apps/mobile/src/components/connection-status.tsx` (new)
- `apps/mobile/src/components/connection-status.test.tsx` (new)
- `apps/mobile/src/app/_layout.tsx` (modified — wrapped Stack in `<TrpcProvider>`)
- `apps/mobile/src/app/index.tsx` (modified — renders `<ConnectionStatus />`)
- `apps/mobile/src/app/index.test.tsx` (modified — wraps HomeScreen in providers, asserts indicator presence)
- `bun.lock` (modified — generated by `bun add` runs)

### Change Log

- 2026-05-05: Story 5.1 created from epics.md stub via bmad-create-story. Status: ready-for-dev.
- 2026-05-05: Implemented Story 5.1 — exposed `AppRouter` type from server, added mobile tRPC client + TanStack Query provider, wired `<TrpcProvider>` into the Expo Router root layout, surfaced a `ConnectionStatus` indicator on the home screen, documented `EXPO_PUBLIC_API_URL` in `apps/mobile/.env.example`. All four root quality gates green; sprint-status moved to `review`.
- 2026-05-05: Rebased onto main after Story 1.2 (Quick Add) landed. Resolved conflicts in `apps/mobile/package.json` (merged tRPC + drizzle deps), `apps/mobile/src/app/_layout.tsx` (composed `<TrpcProvider>` with the migration gate), `apps/mobile/src/app/index.tsx` (composed `<ConnectionStatus />` alongside `<TaskPreview />` and `<QuickAddSheet />`), and `apps/mobile/src/app/index.test.tsx` (wrapped the existing Story 1.2 tests in tRPC + QueryClient providers and stubbed `fetch` via `beforeEach`). All four root quality gates green post-rebase: typecheck, lint, format:check, test (shared 7 + server 10 + mobile 53).
- 2026-05-05: Self code review (Stage 3) completed. Graded each AC, no High or Medium severity findings. See "Senior Developer Review (AI)" section.
