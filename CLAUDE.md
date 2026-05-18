# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

## Project: One Down

One Down is a mobile task management app built for people with ADHD. It uses a card-based swipeable interface, AI task parsing, and a star-based reward system.

### Tech Stack
- **Monorepo**: Bun workspaces (apps/mobile, apps/server, packages/shared)
- **Mobile**: Expo SDK 55, React Native, Expo Router, NativeWind, gluestack-ui v3, Reanimated 4
- **Server**: Fastify 5 + tRPC + Bun
- **DB**: expo-sqlite + Drizzle (client), PostgreSQL + Drizzle (server)
- **AI**: Gemini Flash via @google/generative-ai SDK
- **Auth**: Supabase Auth
- **State**: Zustand (UI), TanStack Query via tRPC (server)

### Project Status
- Story 1.0 (Project Scaffold & Development Foundation) is **DONE**
- Epic 1 is in-progress, all other stories are backlog
- The full epic/story breakdown is at `_bmad-output/planning-artifacts/epics.md`
- Architecture docs at `_bmad-output/planning-artifacts/architecture.md`
- PRD at `_bmad-output/planning-artifacts/prd.md`
- UX spec at `_bmad-output/planning-artifacts/ux-design-specification.md`
- Sprint status at `_bmad-output/implementation-artifacts/sprint-status.yaml`

### BMad Workflow for Story Implementation
This project uses the BMad methodology.

Each BMAD stage (create-story, dev-story, code-review, ship) MUST be run with a **fresh context**. Do NOT carry conversation state between stages. The only inputs to each stage are:
- The BMAD workflow documentation in `_bmad/bmm/workflows/`
- The implementation artifacts in `_bmad-output/`
- The code itself

This ensures each stage evaluates the work independently, not influenced by prior reasoning or assumptions.

For each story:
1. Read the story definition from `_bmad-output/planning-artifacts/epics.md`
2. Follow the BMad dev-story skill workflow (`.github/skills/bmad-dev-story/SKILL.md`)
3. Create a detailed story file in `_bmad-output/implementation-artifacts/` before implementing
4. Implement against the story acceptance criteria
5. Run code review before marking done
6. Commit with conventional commits per `.github/commit-conventions.md`. ALWAYS check this file before committing.

### Epic Dependency Order
```
Epic 1 (Core Task Loop) → Epic 2 (Task Execution) → Epic 3 (Smart Curation) → Epic 4 (Rewards)
Epic 5 (Account & Cloud Sync) → Epic 6 (AI Intelligence) → Epic 7 (Task Health) → Epic 8 (Engagement)
```

Epics 1-4 and 5-8 are two parallel tracks. Within each track, stories should be done sequentially.

### Parallelization Guidance
- **Epic 1 stories** (1.1 → 1.2 → 1.3 → 1.4 → 1.5) are sequential
- **Epic 5 stories** (5.0 → 5.1 → 5.2 → 5.3) are sequential
- **Epic 1 track and Epic 5 track can run in parallel** (mobile vs server)
- When creating convoys, group stories that can be parallelized across different agents

### General Structure Notes
- If additional interleaving stories are needed, use sub-numbers (e.g. 1.2.1). Sub-numbers in filenames should use `·` (e.g. `1-2·1-new-story.md`) to keep correct file ordering.

## Build & Test

```bash
# Install all dependencies (from repo root)
bun install

# Lint & format (quality gates)
bun run lint              # Oxlint across all workspaces
bun run format:check      # Oxfmt check mode
bun run typecheck         # TypeScript strict across all workspaces

# Tests
bun run test              # Runs shared + server tests
```

## E2E Testing

Every user-facing change MUST include a Maestro E2E test. Tests live in `.maestro/` as `XX-story-Y-Z-description.yaml`.

### Commands

- `bun run test:e2e` — run all tests against installed APK
- `bun run test:e2e:fresh` — rebuild (after any code changes) + install + test

Requires a running emulator. Check if there is one running. If not, start windowless with:
```
~/Library/Android/sdk/emulator/emulator @Pixel_8_API_35 -no-window -no-audio &
```

### Key facts

- E2E runs against **release APK** — no Metro needed
- `scripts/maestro-test.sh` dumps all app console.logs after each run

### Debugging

Instrument first, theorize second. Something wrong? Unexpected? -> `console.log`, run the test, read the logs. Remove logging after the fix.

## Dev Server

```bash
# Mobile app
bun run mobile            # Start Expo dev server
bun run mobile:android    # Start on Android

# Server
bun run server:dev        # Start Fastify with hot reload (bun --hot)
```

## Architecture Overview

**Local-first mobile app with sync layer:**

```
apps/mobile/src/
├── app/              # Expo Router file-based routes
├── components/       # UI components (gluestack-ui v3 copy-paste model)
├── constants/        # App constants
├── hooks/            # Custom React hooks
├── lib/              # Utilities, services
└── types/            # TypeScript types

apps/server/src/
└── index.ts          # Fastify 5 server (tRPC router to be added in Epic 5)

packages/shared/src/
├── schema/           # Drizzle ORM schemas (shared between client & server)
└── index.ts          # Exported types, constants
```

**Key architectural decisions:**
- **Offline-first**: expo-sqlite with Drizzle as primary data store; server sync is additive (Epic 5)
- **Local-first task CRUD**: No server needed for Epics 1-4 — all task operations work against local DB
- **tRPC end-to-end type safety**: Added in Epic 5, shared types via packages/shared
- **AI service via tRPC**: Gemini Flash calls go through server (Epic 6), not directly from client
- **Star reward system**: Centralized weight constants in packages/shared
- **Curation algorithm**: Pure function in services/curation.ts (testable, adjustable)

## Conventions & Patterns

**Commits:** Conventional commits with gitmojis — `type(scope): emoji description`
- Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
- Scopes: app, backend, api, ui, tasks, ai, config, planning, bmad
- Story squash-merges: `story(X.Y): emoji description`

**Tooling:**
- Package manager: Bun (v1.2.13)
- Linting: Oxlint (not ESLint)
- Formatting: Oxfmt (not Prettier)
- TypeScript: Strict mode, v6.0

**UI patterns:**
- gluestack-ui v3 components installed per-story via `npx gluestack-ui add <component>`
- NativeWind/Tailwind CSS for styling (utility-first) — always use `className`, never `StyleSheet.create`
- Reanimated 4 for animations (worklets plugin must be LAST in babel.config.js)
- Portrait-only, 320pt–430pt width target

**File naming:** kebab-case for files, PascalCase for components

**IDs:** crypto.randomUUID() — client-generated, permanent (no server reassignment)

## Testing & Quality Methodology

### Testing Levels

- **Unit tests** for algorithmic pure functions eg. curation, star calculation, conflict resolution.
- **Local integration tests** for real collaborations across mobile layers (DB + service + hook) using in-memory SQLite.
- **Server integration tests** for tRPC procedures against a real test Postgres instance with real JWT tokens.
- **Storybook UI tests** for visual components and screens.
- **Maestro E2E tests**  for user journeys on-device.

### Philosophy

- **Don't test the framework.** Ensure tests genuinely check written logic, not that a library's internals functions correctly.
- **Don't test mocks.** If the mock is getting heavy, use an in-memory real instance or pre-built solution. Research online the standard way of testing for that layer
- **Only test meaningful logic.** Every test should validate non-trivial handwritten code. Skip placeholder tests and checking simple pass-through or obvious single-line logic
- **Integration over isolation.** Test real collaborations (DB + service + hook) rather than isolated units behind mock walls, unless specific complex logic needs to be verified.

### UI Storybook Tests

All UI component testing uses **React Native Storybook**, not Jest render tests. Grouped by:
- Base UI components (button, input, textarea, etc.)
- Feature sections (app-shell, card-stack, quick-add-sheet, auth), with individual component + full screen stories

### Integration Tests

- **Mobile:** Real flows against in-memory SQLite
- **Server:** tRPC procedures against a real test Postgres instance with real JWT tokens.
