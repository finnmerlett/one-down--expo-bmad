# Story 1.0: Project Scaffold & Development Foundation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the monorepo, mobile app, and server project scaffolded with core dependencies installed,
so that all subsequent stories have a working development environment to build on.

## Acceptance Criteria

1. Given the project is being initialized from scratch, when the scaffold is complete, then a Bun workspaces monorepo exists with `apps/mobile`, `apps/server`, and `packages/shared` directories, and each workspace has a valid `package.json` and TypeScript configuration.
2. Given the mobile workspace (`apps/mobile`), when initialized via the Expo SDK 55 default template, then the Expo app starts successfully on an Android emulator or device, New Architecture/Fabric is enabled by default, and Expo Router is configured with typed routes.
3. Given the server workspace (`apps/server`), when initialized as a manual Fastify + TypeScript scaffold with Bun, then `bun run dev` starts the Fastify server and `GET /health` returns a success response.
4. Given the shared workspace (`packages/shared`), when set up, then it exports TypeScript types importable by both `apps/mobile` and `apps/server`, and a placeholder Drizzle schema file exists for future table definitions.
5. Given all workspaces, when the developer runs `bun install` from the repo root, then dependencies resolve correctly across workspaces.
6. Given the project scaffold, when the developer runs the mobile app, then it renders the default Expo template screen with no custom One Down UI yet.
7. Given the monorepo tooling, when Oxlint and Oxfmt are configured, then `bun run lint` and `bun run format:check` pass on the scaffold code, TypeScript strict mode is enabled, and `bun run typecheck` passes across all workspaces.

## Tasks / Subtasks

- [x] Create the Bun workspace root (AC: 1, 5, 7)
  - [x] Add root `package.json` with `workspaces` covering `apps/*` and `packages/*`.
  - [x] Add a root `packageManager` field pinning the Bun version used for the scaffold.
  - [x] Add root `engines.node` targeting Node 24 LTS (`^24.3.0`) for Expo SDK 55 compatibility.
  - [x] Add root `tsconfig.base.json` with strict TypeScript settings shared by workspaces.
  - [x] Add root `.oxlintrc.json` and `.oxfmtrc.json` following the architecture rules.
  - [x] Add root scripts for `lint`, `format`, `format:check`, `typecheck`, and workspace dev commands.
- [x] Scaffold the Expo mobile app in `apps/mobile` (AC: 2, 6)
  - [x] Use the Expo SDK 55 default template; do not use community starters or SDK 54 templates.
  - [x] Ensure Expo Router remains configured and typed routes are enabled.
  - [x] Verify the default Expo app launches on Android with the New Architecture/Fabric path.
  - [x] Keep the default template UI only; no One Down top bar, cards, task logic, or theme work in this story.
- [x] Scaffold the Fastify server in `apps/server` (AC: 3)
  - [x] Create a Bun + TypeScript Fastify 5 project manually.
  - [x] Add a minimal `src/index.ts` server entry and `GET /health` route.
  - [x] Add a `dev` script that starts the server from `apps/server`.
  - [x] Keep tRPC, auth, sync, AI, database connection, and deployment configuration out of this story unless needed for the health check scaffold.
- [x] Scaffold `packages/shared` (AC: 4)
  - [x] Create a TypeScript package named `@one-down/shared` importable by mobile and server workspaces.
  - [x] Export at least one placeholder type and a placeholder Drizzle schema module.
  - [x] Use local workspace dependency references so imports resolve without publishing.
- [x] Install and verify foundation dependencies (AC: 1, 5, 7)
  - [x] Run `bun install` at the repo root and include the resulting lockfile in the story changes if generated.
  - [x] Verify workspace imports from `packages/shared` work in both mobile and server.
  - [x] Run `bun run lint`, `bun run format:check`, and `bun run typecheck` successfully.
- [x] Document verification evidence in the Dev Agent Record (AC: 2, 3, 5, 7)
  - [x] Record the commands used to run the mobile app, server health check, lint, format check, and typecheck.
  - [x] Note any expected local environment limitations, such as Android emulator availability, without claiming unverified success.

## Dev Notes

This is a scaffold story, not a feature story. The output should be a clean monorepo foundation that later stories can build on safely. Avoid adding domain behavior early.

### Scope Boundaries

- Do not create custom One Down UI in Story 1.0. Story 1.1 owns the app shell and navigation.
- Do not create task tables, task CRUD, local SQLite integration, star logic, curation, auth, sync, AI, notifications, RevenueCat, PostHog, or CI/CD in this story.
- Do create only minimal placeholders needed to prove workspace boundaries and shared imports.
- Full CI pipeline, EAS Build, and Railway deployment are deferred by the epics to Epic 5. Do not silently add them here unless explicitly asked.
- Production console stripping is an architecture requirement, but it can be deferred unless Story 1.0 creates or edits the mobile Metro config. If configured now, prefer Expo's documented Metro/Terser `drop_console` minifier config over `babel-plugin-transform-remove-console`; preserve `console.warn` and `console.error` unless the product team explicitly chooses to remove them. Leave Reanimated/worklets Babel setup to Story 1.1.

### Critical Scaffold Guardrails

- The architecture's `one-down/` tree is conceptual. In this repository, `/Users/finnmerlett/Repos/one-down--expo-bmad` is the monorepo root. Do not create an extra nested `one-down/` product directory.
- The mobile app must live at `apps/mobile`.
- The server must live at `apps/server`.
- Shared code must live at `packages/shared`.
- The shared workspace package name must be `@one-down/shared`; mobile and server should depend on it via `workspace:*`.
- If the Expo CLI command generates a standalone folder, move or create it so the final result is `apps/mobile`, not `apps/mobile/one-down` or root-level `one-down`.
- Prefer workspace local imports over relative cross-package paths. Use `workspace:*` dependency references where appropriate.

### Architecture Requirements

- Mobile starter: Expo SDK 55 default template. Architecture documents the command `bun create expo-app one-down --template default@sdk-55`; adapt the target directory so output lands in `apps/mobile`. Source: `_bmad-output/planning-artifacts/architecture.md#Selected-Starters`.
- Expo SDK 55 makes New Architecture/Fabric mandatory; do not add legacy architecture toggles. Source: `_bmad-output/planning-artifacts/architecture.md#Mobile-App-Expo-Default-Template-SDK-55` and Expo SDK 55 changelog research.
- Expo Router and typed routes come from the selected template and should remain intact. Source: `_bmad-output/planning-artifacts/architecture.md#Architectural-Decisions-Provided-by-Starter`.
- Server starter: manual Fastify + TypeScript scaffold with Bun. Source: `_bmad-output/planning-artifacts/architecture.md#API-Backend-Manual-Fastify-TypeScript-Scaffold`.
- Repository structure: Bun workspaces monorepo with `apps/mobile`, `apps/server`, and `packages/shared`. Source: `_bmad-output/planning-artifacts/architecture.md#Project-Structure-Boundaries`.

### Tooling Requirements

- Linter: Oxlint (OXC). Source: `_bmad-output/planning-artifacts/architecture.md#Linting-Formatting`.
- Formatter: Oxfmt, from the Oxc ecosystem, Prettier-compatible. Source: `_bmad-output/planning-artifacts/architecture.md#Linting-Formatting`.
- Oxfmt's current docs support the `oxfmt` CLI, `oxfmt --check`, and `.oxfmtrc.json`; the architecture-selected `.oxfmtrc.json` file name is valid.
- Root scripts should expose lint/format/typecheck behavior. Architecture examples use `lint`, `format`, and `lint:check`; the story AC requires `format:check`, so include both `format` and `format:check` or make the script naming clear in package metadata. Source: `_bmad-output/planning-artifacts/epics.md#Story-10-Project-Scaffold-Development-Foundation`.
- TypeScript strict mode must be enabled and verified across workspaces. Source: `_bmad-output/planning-artifacts/epics.md#Story-10-Project-Scaffold-Development-Foundation`.
- Do not commit `console.log` statements. Oxlint `no-console` should warn. Source: `_bmad-output/planning-artifacts/architecture.md#Enforcement`.
- Bun does not run arbitrary lifecycle scripts by default. Add packages to `trustedDependencies` only when a required dependency needs a postinstall script, and document why it is trusted. Source: `_bmad-output/planning-artifacts/architecture.md#Technical-Constraints-Dependencies` and Expo Bun docs.

### Dependency Guidance

Install only what is needed for this story's scaffold and immediate verification. Future feature dependencies should not be pulled in unless required to satisfy the scaffold.

Minimum expected foundation:
- Root/dev: TypeScript, Oxlint, Oxfmt.
- Mobile: dependencies produced by Expo SDK 55 default template. Reanimated/gesture/gluestack can wait until Story 1.1 unless the chosen template or setup requires them for safe configuration now.
- Server: Fastify 5, TypeScript, Bun dev execution support, and Node types as needed.
- Shared: `@one-down/shared` TypeScript package metadata plus placeholder exports. Drizzle placeholder may be a file stub; actual domain schemas start in later stories.

Do not add Prisma, SDK 54 community starters, Obytes starter, Docker-heavy Fastify starters, or a separate monorepo manager beyond native Bun workspaces.

Defer Reanimated 4, `react-native-gesture-handler`, NativeWind, and gluestack-ui v3 until Story 1.1 unless the current Expo SDK 55 template requires an early compatibility configuration. Story 1.0 must not copy gluestack components or build app-specific UI.

Node.js LTS must also be available locally because Expo's Bun workflow still needs Node for `bun create expo` and `bun expo prebuild` template handling. Use Node 24 LTS for this project (`engines.node: "^24.3.0"`) because Expo SDK 55 explicitly supports that range. Story 1.0 does not need to run prebuild, but the prerequisite should be recorded if the dev environment is missing it. Do not add EAS `node` or `bun` version pins in this story; EAS configuration remains deferred.

### File Structure Requirements

Target structure after this story:

```text
package.json
bun.lock
tsconfig.base.json
.oxlintrc.json
.oxfmtrc.json
apps/
  mobile/
    package.json
    tsconfig.json
    app.json
    app/
      _layout.tsx
      index.tsx
  server/
    package.json
    tsconfig.json
    src/
      index.ts
packages/
  shared/
    package.json
    tsconfig.json
    src/
      index.ts
      schema/
        index.ts
```

Minor template-generated differences are acceptable if the acceptance criteria still pass and the structure remains aligned with the architecture.

### Testing / Verification Requirements

Because this is a foundation story, verification is command-based:

- `bun install` from repo root succeeds.
- `bun --version` is recorded and the root `packageManager` field pins that Bun version.
- `node --version` satisfies the root `engines.node` range for Node 24 LTS.
- `bun run lint` succeeds.
- `bun run format:check` succeeds.
- `bun run typecheck` succeeds.
- From `apps/server`, `bun run dev` starts Fastify and `GET /health` returns success.
- From `apps/mobile`, the Expo app starts and shows the default template screen on the installed Android emulator/device.

An Android emulated device is expected to be installed and bootable in Finn's environment. If the dev agent cannot start or connect to the emulator, it must ask Finn for help interactively and must not claim the Android run passed until the app actually launches on Android.

### Latest Technical Notes

- Expo docs confirm `--template default@sdk-55` for SDK 55 projects and note SDK 55 removes legacy architecture support; New Architecture/Fabric is mandatory.
- Expo SDK 55 supports Node versions `^20.19.4`, `^22.13.0`, `^24.3.0`, and `^25.0.0`; this project chooses Node 24 LTS.
- Expo Router docs confirm new Expo apps created from the SDK 55 default template include Expo Router and support typed routes.
- Expo minification docs recommend Metro/Terser `drop_console` in `metro.config.js` for production console removal.
- Bun workspaces use root `workspaces` configuration and local package dependency references such as `workspace:*`.
- Oxfmt documentation supports `oxfmt` and `oxfmt --check` scripts; keep formatting separate from linting.
- Oxfmt configuration docs support `.oxfmtrc.json`, `.oxfmtrc.jsonc`, and `oxfmt.config.ts`; use `.oxfmtrc.json` to match the architecture unless a tool incompatibility is discovered during implementation.
- Expo's Bun guide states Node.js LTS is still required for Bun-powered Expo project creation and prebuild commands.
- Expo's Bun guide also documents `trustedDependencies` for packages whose lifecycle scripts must run under Bun.
- Oxc/Oxlint TypeScript config support requires Node v22.18+ or v24+; Node 24 satisfies this if TypeScript config files are used later.

### Resolved Clarifications

- Provide both `format:check` and `lint:check` root scripts if practical. `format:check` should run Oxfmt only because Story 1.0 AC names it directly; `lint:check` may combine lint and format checking to match the architecture examples.
- The Fastify health route is a public scaffold route. It does not need tRPC, auth middleware, a database connection, or PostHog instrumentation in this story.
- Use `@one-down/shared` as the workspace package/import name so later architecture references resolve consistently.
- Pin Node through `engines.node` only for now. Do not add `.nvmrc` or `.node-version`; Finn uses `fnm`, which can read the engine constraint.

### Previous Story Intelligence

No previous story exists in this sprint. This is the first story file and should establish the foundation without relying on prior implementation patterns.

## Dev Agent Record

### Agent Model Used

GitHub Copilot

### Debug Log References

- `bun --version && node --version && command -v bun && command -v node`
- `bun create expo-app apps/mobile --template default@sdk-55 --no-install` after retrying without unsupported `--no-agents-md`
- `bun install`
- `bun run test`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run lint:check`
- `PORT=3000 bun --cwd apps/server start`
- `curl -sS -i http://127.0.0.1:3000/health`
- `bun run mobile:android`
- `adb devices && adb shell pidof host.exp.exponent && adb shell dumpsys activity top | grep -E "ACTIVITY|host.exp.exponent" | head -20`

### Completion Notes List

- Created the Bun workspace root with Node 24 engine metadata, Bun `1.2.13` package manager pin, strict shared TypeScript config, Oxlint, Oxfmt, and root workspace scripts.
- Installed dependencies from the repo root and generated `bun.lock`. No Bun `trustedDependencies` entries were needed during install.
- Generated the Expo SDK 55 default template directly into `apps/mobile`. The template uses `src/app` as the Expo Router root, keeps `experiments.typedRoutes: true`, and launches through the New Architecture-only SDK 55 path.
- Kept the generated default Expo UI unchanged apart from adding a small shared-package import proof and a CSS module declaration required for strict TypeScript.
- Created the Fastify 5 server scaffold with a public `GET /health` route and Bun tests for the health response.
- Created `@one-down/shared` with placeholder package exports and a placeholder Drizzle schema module; both mobile and server depend on it via `workspace:*`.
- Scoped Oxfmt scripts to root scaffold config plus `apps` and `packages` so BMad/IDE skill templates outside the product scaffold are not treated as application formatting targets.
- Verified Android launch on `Pixel_8_API_35`; Expo Go downloaded, Metro bundled successfully, and `adb` showed `host.exp.exponent` running with the project experience activity.

### File List

- `.gitignore`
- `.oxfmtrc.json`
- `.oxlintrc.json`
- `package.json`
- `bun.lock`
- `tsconfig.base.json`
- `apps/mobile/.gitignore`
- `apps/mobile/.vscode/extensions.json`
- `apps/mobile/.vscode/settings.json`
- `apps/mobile/README.md`
- `apps/mobile/app.json`
- `apps/mobile/package.json`
- `apps/mobile/scripts/reset-project.js`
- `apps/mobile/tsconfig.json`
- `apps/mobile/assets/expo.icon/Assets/expo-symbol 2.svg`
- `apps/mobile/assets/expo.icon/Assets/grid.png`
- `apps/mobile/assets/expo.icon/icon.json`
- `apps/mobile/assets/images/android-icon-background.png`
- `apps/mobile/assets/images/android-icon-foreground.png`
- `apps/mobile/assets/images/android-icon-monochrome.png`
- `apps/mobile/assets/images/expo-badge-white.png`
- `apps/mobile/assets/images/expo-badge.png`
- `apps/mobile/assets/images/expo-logo.png`
- `apps/mobile/assets/images/favicon.png`
- `apps/mobile/assets/images/icon.png`
- `apps/mobile/assets/images/logo-glow.png`
- `apps/mobile/assets/images/react-logo.png`
- `apps/mobile/assets/images/react-logo@2x.png`
- `apps/mobile/assets/images/react-logo@3x.png`
- `apps/mobile/assets/images/splash-icon.png`
- `apps/mobile/assets/images/tabIcons/explore.png`
- `apps/mobile/assets/images/tabIcons/explore@2x.png`
- `apps/mobile/assets/images/tabIcons/explore@3x.png`
- `apps/mobile/assets/images/tabIcons/home.png`
- `apps/mobile/assets/images/tabIcons/home@2x.png`
- `apps/mobile/assets/images/tabIcons/home@3x.png`
- `apps/mobile/assets/images/tutorial-web.png`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/explore.tsx`
- `apps/mobile/src/app/index.tsx`
- `apps/mobile/src/components/animated-icon.module.css`
- `apps/mobile/src/components/animated-icon.tsx`
- `apps/mobile/src/components/animated-icon.web.tsx`
- `apps/mobile/src/components/app-tabs.tsx`
- `apps/mobile/src/components/app-tabs.web.tsx`
- `apps/mobile/src/components/external-link.tsx`
- `apps/mobile/src/components/hint-row.tsx`
- `apps/mobile/src/components/themed-text.tsx`
- `apps/mobile/src/components/themed-view.tsx`
- `apps/mobile/src/components/ui/collapsible.tsx`
- `apps/mobile/src/components/web-badge.tsx`
- `apps/mobile/src/constants/theme.ts`
- `apps/mobile/src/global.css`
- `apps/mobile/src/hooks/use-color-scheme.ts`
- `apps/mobile/src/hooks/use-color-scheme.web.ts`
- `apps/mobile/src/hooks/use-theme.ts`
- `apps/mobile/src/lib/shared-package.ts`
- `apps/mobile/src/types/css-modules.d.ts`
- `apps/server/package.json`
- `apps/server/tsconfig.json`
- `apps/server/src/index.ts`
- `apps/server/src/index.test.ts`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/index.test.ts`
- `packages/shared/src/schema/index.ts`

### Change Log

- 2026-05-04: Implemented Story 1.0 project scaffold, verification gates, and story status transition to review.
