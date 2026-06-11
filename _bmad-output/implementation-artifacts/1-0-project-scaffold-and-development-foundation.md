# Story 1.0: Project Scaffold & Development Foundation

Status: done
Date: 2026-06-11
Mode: BMad-lite autonomous run (story file → implement → fresh-context review → squash commit)

## Story

As a developer, I want the monorepo, mobile app, and server project scaffolded with core dependencies installed, So that all subsequent stories have a working development environment to build on.

## Acceptance Criteria

1. Bun workspaces monorepo with `apps/mobile`, `apps/server`, `packages/shared`; each workspace has valid `package.json` + TS config
2. Mobile initialized via `bun create expo-app --template default@sdk-56`; app starts on Android emulator; New Architecture (Fabric) enabled; Expo Router with typed routes
3. Server: manual Fastify + TS + Bun scaffold; `bun run dev` starts it; `GET /health` returns success
4. Shared: exports TS types importable by both apps; placeholder Drizzle schema file exists
5. `bun install` from root resolves all workspaces
6. Running the mobile app renders a minimal placeholder screen (template demo UI intentionally stripped per UX spec — no tabs ever; the placeholder's NativeWind classes prove the styling pipeline end-to-end) *(amended from "default template screen" during review — see Dev Notes)*
7. Oxlint + Oxfmt configured; `bun run lint`, `bun run format:check` pass; TS strict; `bun run typecheck` passes across all workspaces

## Implementation decisions (planned)

- **Versions** per architecture digest (re-validated 2026-06-08): Expo SDK 56, React 19.2.0, RN 0.85.3, TS ~6.0.3 all workspaces, Bun 1.3.14+, NativeWind ^4.2.5 + Tailwind ^3.4 (NOT v4/v5), reanimated 4.3.1 + worklets 0.8.3 lockstep, gesture-handler ~2.31.1, safe-area-context ~5.7.0, svg 15.15.4, fastify ^5.8.5, @fastify/cors ^11.2.0, zod 4.4.3.
- **NativeWind + Reanimated/worklets/gesture-handler installed in 1.0** (not deferred to 1.1): Story 1.0's infra note specifies their exact babel/metro config; `react-native-worklets/plugin` LAST in babel.config.js; `withNativeWind(config, { input: "./src/global.css" })` in metro.
- **Server env reads** confined to `apps/server/src/lib/env.ts` (`loadEnv()` + Zod 4, defaults so boot works with no .env).
- **Shared placeholder schema**: `packages/shared/src/schema/index.ts` placeholder without drizzle-orm dependency yet (no tables before Story 1.2 per story scope); canonical types stub in `src/types/`.
- Template tabs/welcome UI reduced to single minimal Stack screen (no bottom tab bar ever, per UX spec).
- No CI, no E2E foundation here (1.0a / Epic 5).

## Tasks

- [x] Upgrade Bun (brew) and remove stale root node_modules
- [x] Root: package.json (workspaces, scripts), tsconfig.base.json, .oxlintrc.json, .oxfmtrc.json
- [x] apps/mobile via create-expo-app sdk-56 template; strip to single Stack screen; babel/metro/tailwind/global.css config
- [x] apps/server: Fastify + env.ts + GET /health + dev script (verified: boots, /health returns contract JSON, shared import works at runtime)
- [x] packages/shared: types + placeholder schema, exports map
- [x] Quality gates green: lint, format:check, typecheck
- [x] Mobile app boots on emulator (release build — bundles JS, no Metro needed; screenshot-verified, NativeWind styles applied)
- [x] Fresh-context code review → fix findings (2 independent reviewers, verdict: approve-with-fixes ×2)
- [x] Re-run gates + rebuild after review fixes; squash commit

### Known-unverified (deferred to Story 1.0a)

- `transform-remove-console` in production bundles: gradle-invoked `expo export:embed` warned `NODE_ENV ... not specified`; whether Metro workers see `NODE_ENV=production` (which my babel `isProduction` check keys off) is unconfirmed. Verify when the Maestro log-dump harness lands (1.0a) — a committed console call in a release build is directly observable there. Backstop: oxlint `no-console` keeps console calls out of committed code anyway.

## Dev Notes

- Brew upgraded Bun 1.2.13 → 1.3.14 (exactly the pinned version).
- Template `default@sdk-56` ships expo ~56.0.11, RN 0.85.3, React 19.2.3 (pin said 19.2.0; kept template's newer patch), TS ~6.0.3, and already includes reanimated 4.3.1 + worklets 0.8.3 + gesture-handler ~2.31.1 + safe-area-context ~5.7.0 with `src/app` router root and typedRoutes — most pins matched out of the box.
- Template demo (tabs, themed components, web variants, expo-device/image/symbols/glass-effect/@expo/ui, react-native-web/react-dom) stripped; deps removed from package.json. Template AGENTS.md/CLAUDE.md deleted (would conflict with root project CLAUDE.md).
- NativeWind added as direct dep pin (^4.2.5 + tailwindcss ^3.4.0) rather than `npx expo install` — architecture pins this combo explicitly (v4+v3 only).
- babel.config.js: conditional `transform-remove-console` for production placed BEFORE `react-native-worklets/plugin` so the worklets plugin is genuinely last in every env (template had no babel config at all).
- TS 6.0.3 strict passes across all 3 workspaces. Mobile needed `src/types/css.d.ts` (`declare module '*.css'`) for the global.css side-effect import (TS 6 TS2882).
- oxfmt bumped to ^0.54.0 (caret on 0.x doesn't float minors); it formats JSON too (reformatted package.json/tsconfig.json/icon.json).
- Server listens on 0.0.0.0 (Android emulator can reach via 10.0.2.2 later); env reads confined to lib/env.ts with dev-safe defaults.

### Review findings & resolutions (fresh-context, 2 reviewers, both approve-with-fixes)

- **Blocker — format gate red at review time:** `expo run:android` rewrites `apps/mobile/tsconfig.json` (re-expands arrays, adds nativewind-env.d.ts to include), invalidating an earlier green `format:check`. Fixed by reformatting; **process rule adopted: re-run `bun run lint:check` + `typecheck` as the LAST step before every story commit** (any expo CLI invocation can touch files).
- **Important — worklets babel plugin was a duplicate and effectively FIRST, not last:** SDK 56's `babel-preset-expo` auto-appends `react-native-worklets/plugin` (verified in `babel-preset-expo/build/configs/expo.js`); top-level config plugins run before preset plugins, so the manual entry workletized code before other transforms. Removed the manual entry — the preset's auto-copy is genuinely last. ⚠️ **Planning-doc correction needed (correct-course):** epics/architecture say "add `react-native-worklets/plugin` LAST in babel.config.js" — under SDK 56 the correct guidance is "do NOT add it manually; the preset auto-appends it". Flagged for batch planning-doc update at epic boundary.
- Unreferenced template assets (~540K: react logos, expo badges, tabIcons/, expo.icon/, favicon, tutorial-web) deleted; only icon.png, android-icon-*, splash-icon.png remain.
- Root `lint:check` script added (architecture enforcement section mandates it per story).
- Mobile tsconfig now re-adds the base strictness flags expo/tsconfig.base lacks (`noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`) — parity with server/shared.
- `/health` return now typed as shared `HealthStatus` (contract is compile-time enforced; AC4 genuinely load-bearing).
- **Decisions recorded:** `experiments.reactCompiler: true` kept — it is the SDK 56 template default (present in the freshly scaffolded app.json), not a carry-over; prior run also shipped it. `apps/mobile/.claude/settings.json` (expo official Claude plugin) kept deliberately — gives future agent sessions Expo-specific guidance.
- AC6 amended (above) to reflect the agreed stripped-template scope.
