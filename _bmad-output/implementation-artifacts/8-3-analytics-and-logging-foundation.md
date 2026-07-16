# Story 8.3: Analytics & Logging Foundation

Status: ready-for-dev
Date: 2026-07-16
Mode: Wave-based autonomous run — LOCAL MODE (decisions-log 2026-07-16): **PostHog live wiring stays behind `EXPO_PUBLIC_POSTHOG_API_KEY` — the existing no-op seam is the default; a real key is a drop-in with zero code changes.** Server side: pino structured logging (queryable) + `posthog-node` behind `POSTHOG_API_KEY` (no-op stub without it). Follow the `logging-best-practices` skill for all server/ops logging decisions.

## Story

As a product owner, I want the analytics provider and server-side logging fully wired and privacy-verified, so that I can make data-driven decisions and debug production issues without leaking sensitive content.

NFRs: L1 (basic logging/traceability), S3 (no sensitive content in analytics/logs). Per-action event emission is cross-cutting (each story already uses the 1.0a `track()` seam) — this story lands provider config, screen tracking, the server side, privacy verification, and console-stripping verification. It is NOT a retrofit of call sites.

## Acceptance Criteria (adjusted for local mode)

1. Mobile: with `EXPO_PUBLIC_POSTHOG_API_KEY` set, `PostHogProvider` runs with autocapture (touches + lifecycle), `before_send` PII redaction, and feature-flag support (SDK built-ins — verify `useFeatureFlag` is usable, nothing custom built). Without the key, behaviour is byte-identical to today: provider not mounted, `track()` console-debugs in dev / no-ops in prod.
2. Screen views are tracked via manual `posthog.screen()` on every route change (Expo Router / React Navigation v7 cannot be autocaptured — `captureScreens` stays false). Screen names are low-cardinality route templates (`task/[id]`, not `task/<uuid>`), and the hook is a silent no-op when PostHog isn't mounted.
3. Server: Fastify's pino logger is properly configured per logging-best-practices — structured JSON; base fields `service: 'one-down-api'` + `environment`; ISO timestamps; level from `LOG_LEVEL` env (default `info`, `debug` allowed in dev only); request/correlation IDs on every request log (honour inbound `x-request-id`, else `crypto.randomUUID()`); `authorization` header redacted; request completion logged with duration. App code logs via `req.log`/`app.log` with snake_case past-tense `event` fields — never `console.*`.
4. Server: a hand-rolled tRPC middleware (NOT the stale community `posthog-trpc` package) captures per-procedure analytics through `posthog-node`: procedure path, type, `duration_ms`, ok/error code — NEVER input or output payloads (NFR-S3 by construction). distinct id = authenticated user id when ctx has one (5.2+), else `'anonymous'`. Without `POSTHOG_API_KEY` the client is a no-op stub and the middleware adds no overhead beyond a timer. PostHog client is flushed/shut down on server close.
5. Privacy verification: the `before_send` sanitizer redacts denylisted keys on a NON-exception event (regression test exists — extend if gaps found), the typed `AnalyticsEventMap` still constrains props to flat primitives, and a manual dev-run smoke check with a real key is documented in the story file as the final verification step (repo-state caveat: confirm `before_send` fires on ordinary events on the pinned SDK).
6. Console output is stripped from production mobile builds — `babel-plugin-transform-remove-console` is ALREADY wired in `apps/mobile/babel.config.js` (production env): verify it survives and prove it (grep the release bundle for `console.log` as part of the E2E build step), don't re-add it.
7. Session replay is NOT enabled — documented as flag-gated/late-beta only.

## Implementation Plan

**Mobile (all changes inert without the env key):**
- `apps/mobile/src/hooks/use-screen-tracking.ts` — `useSegments()` from expo-router (segments give the route TEMPLATE: `['task', '[id]']` → `task/[id]`; empty → `home`); `usePostHog()`; effect on segment-key change → `posthog.screen(name)`. Guard: hook is mounted inside `AppPostHogProvider`'s child tree, which only exists with a key — additionally null-check the client so Storybook/portable-story renders never throw.
- `apps/mobile/src/lib/posthog.tsx` — mount a `<ScreenTracker />` (renders null, calls the hook) inside `AnalyticsClientBinder`; confirm autocapture config unchanged (`captureTouches: true`, `captureScreens: false`, narrowed `propsToCapture`, EU host default). Feature flags need no code — note in comment that `useFeatureFlag` is available from `posthog-react-native` for 8.x consumers.
- `.env.example` (mobile): document `EXPO_PUBLIC_POSTHOG_API_KEY` + `EXPO_PUBLIC_POSTHOG_HOST` (EXPO_PUBLIC_* inlined at Metro bundle time — restart Metro/rebuild after changing).

**Server — logging (`apps/server/`):**
- `apps/server/src/lib/logger.ts` — exported `buildLoggerOptions(env)`: `level: env.LOG_LEVEL`, `base: { service: 'one-down-api', environment: env.NODE_ENV }`, ISO timestamp (`pino.stdTimeFunctions.isoTime`), level-as-label formatter, `redact: ['req.headers.authorization']`, trimmed req/res serializers (method, url, status — never bodies: tRPC bodies can carry task text, NFR-S3). Dev-only pretty printing via `pino-pretty` transport when `NODE_ENV=development` (devDependency).
- `apps/server/src/index.ts` — `Fastify({ logger: buildLoggerOptions(env), genReqId })` where `genReqId` honours `x-request-id` else `crypto.randomUUID()`; keep default request/response completion logs (they carry reqId + responseTime); replace the boot `.catch` console path with `app.log.error({ event: 'server_start_failed' }, …)` (already uses app.log — verify); log `{ event: 'server_started', port }` on listen.
- `apps/server/src/lib/env.ts` — add `LOG_LEVEL: z.enum(['debug','info','warn','error']).default('info')`, `POSTHOG_API_KEY: z.string().optional()`, `POSTHOG_HOST: z.string().default('https://eu.i.posthog.com')`. All process.env reads stay confined here.

**Server — analytics:**
- `apps/server/package.json` — add `posthog-node` (+ `pino-pretty` dev). pino itself ships with Fastify 5.
- `apps/server/src/lib/posthog.ts` — `createServerPostHog(env): ServerAnalytics` where `ServerAnalytics = { capture(distinctId, event, props): void; shutdown(): Promise<void> }`; real `posthog-node` client when `POSTHOG_API_KEY` set (host from env, sensible flushAt/flushInterval), no-op object otherwise (mirror of the mobile seam philosophy). Register `app.addHook('onClose', () => analytics.shutdown())`.
- `apps/server/src/lib/analytics-middleware.ts` — hand-rolled tRPC middleware factory `createAnalyticsMiddleware(analytics)`: wraps `next()`, times it, then `capture(distinctId, ok ? 'trpc_procedure_completed' : 'trpc_procedure_failed', { procedure: path, procedure_type: type, duration_ms, ...(code on failure) })`. Attach where Story 5.0 defined the base procedure (expected `apps/server/src/lib/trpc.ts` per architecture: `t.procedure.use(analyticsMiddleware)`) so every procedure — current and future — inherits it. It must never read `rawInput`/result. distinct id from ctx user (once 5.2 adds auth ctx) else `'anonymous'`.

**Verification steps (documented in the story file when done):**
- Release-bundle console check: after the E2E build, `grep -c "console.log" apps/mobile/android/app/build/.../index.android.bundle` (or hermes bytecode absence via a string search on a sentinel `console.log` added temporarily then removed) — record the result.
- Dev smoke with a real key (when one drops in later): one ordinary `track()` event lands in PostHog with denylisted keys redacted; `posthog.screen` events visible. Not blocking for local mode — note as follow-up.

## Analytics events

- Server taxonomy (new, server-side only — keep names/props in a comment block or small `events.ts` next to the middleware): `trpc_procedure_completed { procedure, procedure_type, duration_ms }`, `trpc_procedure_failed { procedure, procedure_type, duration_ms, code }`. Structural data only.
- Mobile: NO new domain events — screen views use `posthog.screen()` (built-in), per the seam scope rule in `docs/posthog-integration.md`.

## Testing Plan

- **Unit (mobile):** `use-screen-tracking.test.ts` — segments → name mapping (`[] → 'home'`, `['task','[id]'] → 'task/[id]'`) as a pure exported `screenNameFromSegments()` function; hook itself is a thin effect (don't test the framework). Existing `posthog-hooks.test.ts`/`sanitize.test.ts` already regression-cover before_send redaction — extend only if a gap is found (e.g. add a `$screen`-shaped event case).
- **Server tests** (use the harness Epic 5.0 established; these join the test chain per CLAUDE.md): `analytics-middleware.test.ts` — invoke via a tRPC caller with a fake `ServerAnalytics` (this tests OUR middleware logic, not a mock wall): success event shape, failure event carries code, duration is a number, input payload never appears in captured props (assert deep-absence of a sentinel input string); no-op client → procedure still succeeds. `logger.test.ts` — `buildLoggerOptions` merges level/base/redact correctly (pure options object — cheap, meaningful); skip asserting pino internals.
- **Storybook:** none — no new visual components (ScreenTracker renders null).
- **Maestro E2E:** `.maestro/33-story-8-3-telemetry-smoke.yaml` (renumber at implementation time): no-key no-op mode must never crash navigation — launch → home → open settings → back → quick-add a task → open card back → start task → back → open task list → task detail → back ×2 → `takeScreenshot: 8-3-telemetry-smoke` → assertNotVisible 'Unhandled'/'error occurred'. (This drives every route the screen-tracking hook observes with the provider absent — the realistic failure mode this story could introduce.)
- Gates last: `bun run lint:check` && `bun run typecheck` && `bun run test` (Expo/gradle invocations rewrite configs behind your back).

## UX Notes

None user-visible. The only UI-adjacent rule: screen tracking must not add renders/jank to route transitions (<100ms card interactions, NFR-P4) — the hook is an effect keyed on a joined-segments string, no state.

## Dependencies

- **Depends on:** Story 5.0 (tRPC scaffold — the base procedure the middleware attaches to; expected `apps/server/src/lib/trpc.ts`). Story 5.2 later upgrades the middleware's distinct id from `'anonymous'` to the authed user id (leave a typed ctx-optional read so 5.2 needs no middleware change).
- The MOBILE half (screen tracking, env docs, console verification) has no dependency beyond Epic 1 — if wave scheduling wants it earlier, it can be split out cleanly, but as one story, schedule after 5.0.
- **Shared-file conflicts:** `apps/server/src/index.ts`, `lib/env.ts`, `lib/trpc.ts` are touched by every Epic 5 story; `apps/mobile/src/lib/posthog.tsx` and `_layout.tsx` are touched by 8.1/8.2b — coordinate.

## Out of Scope

- Session replay (flag-gated, late-beta, needs dev build — documented only). Surveys. Group analytics.
- Native crash reporting (PostHog error tracking is JS-only; Sentry decision deferred).
- PostHog identity wiring (`identify`/`alias`/`reset`) and consent opt-in/out toggles — Epic 5 account territory (built-ins, not seam work).
- Creating real PostHog projects/keys, Railway log shipping, alerting/dashboards.
- Retrofitting `track()` call sites — cross-cutting, already owned by each story.
