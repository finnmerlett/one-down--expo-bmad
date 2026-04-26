---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-25'
inputDocuments:
  - prd.md
  - product-brief-One-Down-2025-01-04.md
  - ux-design-specification.md
  - research/domain-productivity-psychology-research-2025-12-31.md
  - research/ai-cost-analysis-2025-01-03.md
workflowType: 'architecture'
project_name: 'one-down--expo-bmad'
user_name: 'Finn'
date: '2026-03-26'
---

# Architecture Decision Document

> **⚠️ LIVING DOCUMENT — BEST FIRST GUESS, SUBJECT TO CHANGE**
>
> This architecture represents our best initial decisions based on current knowledge. As implementation progresses and we explore the project hands-on, better approaches will inevitably emerge. **Any agent working on this project who discovers a potentially better pattern, technology choice, or structural approach MUST flag it immediately** and suggest a course-correct via the `bmad-bmm-correct-course` workflow. This document will be updated to reflect those changes. Premature lock-in is the enemy — stay adaptive.

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
65 FRs across 11 capability areas. The system decomposes into three main architectural domains:

1. **Task Lifecycle** (FR1-FR5, FR19-FR33) — Capture, execute, manage, and retire tasks. Includes brain dump AI parsing, task running with subtask breakdown, stale task detection, and "cut loose" release pattern. This is the bulk of the app.

2. **Smart Curation** (FR6-FR18, FR34-FR42) — Card stack presentation, context filtering, Quick Wins/Big Time modes, AI intelligence for deadline prompting, missing info detection, and micro-task suggestions. This is where AI meets UX.

3. **Engagement & Account** (FR43-FR65) — Star reward system, return experience, push notifications, account management, subscription, data sync. Cross-cutting systems that touch everything else.

**Non-Functional Requirements:**
6 NFR categories with architecture-shaping constraints:

| Category | Key Constraint | Architectural Impact |
|----------|---------------|---------------------|
| Performance | 50+ FPS, <2s cold start, <100ms interactions | Requires Reanimated 4 / New Architecture (Fabric), optimized bundle, lazy loading |
| Accessibility | WCAG AA target, TalkBack support | All components need accessibilityLabel/Role/State from day one |
| Reliability | Core offline, AI graceful degradation | Local-first data layer with sync, fallback curation logic |
| Security | TLS 1.2+, secure storage, no PII in analytics | Standard patterns, no special crypto or compliance concerns |
| Scalability | 25k MAU | Modest — single Postgres instance, horizontal API scaling if needed |
| Sync | Last-content-changed wins | Simple conflict resolution, no CRDTs needed |
| Logging | NFR-L1: Basic logging/traceability client + server | MVP baseline via PostHog + pino; enhanced observability in v0.2+ |

**Scale & Complexity:**
- Primary domain: Mobile app (React Native Expo) + API backend (Fastify + Postgres)
- Complexity level: Low-Medium
- Estimated architectural components: ~15 client-side modules, ~4 API routes + services, 1 AI integration layer

### Technical Constraints & Dependencies

| Constraint | Source | Impact |
|-----------|--------|--------|
| React Native New Architecture (Fabric) | Reanimated 4 dependency | Must enable Fabric from project creation. Affects all native module choices. |
| gluestack-ui v3 copy-paste model | UX spec decision | Components live in-project, not in node_modules. Affects project structure. |
| Gemini Flash models | AI cost analysis | Architecture must support model switching and per-user cost tracking |
| AI cost cap £0.50/user/month | Business constraint | Need usage metering, tiered downgrade logic, decision caching |
| Android-only MVP | PRD scope | No iOS-specific concerns initially, but must not make iOS-hostile choices |
| Expo managed workflow | Framework choice | Constrains native module options to Expo-compatible packages |
| Reanimated 4 Babel config | UX spec note | `react-native-worklets/plugin` must be listed last in Babel config |
| Bun as primary runtime | Performance optimization | Faster package installs, 4x faster script startup. Node.js LTS still needed alongside for prebuild. Must manage `trustedDependencies` for postinstall scripts. |
| PostHog analytics/feature flags | All-in-one observability | Official RN SDK with Expo support. Analytics, feature flags, A/B testing, session replay. Replaces need for separate analytics + feature flag services. |

### Cross-Cutting Concerns Identified

1. **AI Cost Management** — Spans task capture (parsing), curation (stack building), execution (subtask breakdown), triage (prompts). Every AI call needs metering. Model selection logic must be centralized.

2. **Star Reward System** — Touched by task completion, cut loose, subtask completion, triage confirmation, subtask deletion (reversal). Centralized config for reward weights. Needs audit log (StarActivityLog).

3. **Offline Capability** — Affects data layer (local-first storage), AI features (graceful degradation), sync (conflict resolution on reconnect). Must be designed in from the start, not bolted on.

4. **Context Filtering** — Drives card stack curation, empty state logic, urgent task indicators on inactive contexts. Context state is app-wide and persisted between sessions.

5. **Task State Machine** — Tasks move through states: new → triaged → started → completed/cut-loose. State transitions trigger rewards, card removal, stack re-curation. This state machine is the backbone of the app.

6. **Absence Detection** — The >3-day welcome-back flow requires tracking last-open timestamp and diffing against current time. Simple but must be reliable — false positives would break the calm UX.

## Starter Template Evaluation

### Primary Technology Domain

Mobile app (Expo / React Native) + API backend (Fastify + PostgreSQL) — two starter evaluations needed.

### UX Requirements Impacting Starter Choice

- Rich card stack animations → Reanimated 4 (requires New Architecture / Fabric)
- Gesture handling → react-native-gesture-handler
- Offline-first → local database (expo-sqlite)
- gluestack-ui v3 copy-paste model → components added manually post-scaffold, eliminates UI-opinionated starters

### Starter Options Considered

#### Mobile App

| Option | Template | Pros | Cons |
|--------|----------|------|------|
| **Expo Default (SDK 55)** | `bun create expo-app --template default@sdk-55` | Official, minimal, New Architecture mandatory (no config), Expo Router + TypeScript, well-documented | Requires manual addition of production tooling |
| Community Starter (Bun + Drizzle + SQLite) | GitHub expo-starter (557★) | Batteries-included, Bun-native, has Drizzle | SDK 54 (needs upgrade), TailwindCSS conflicts with gluestack-ui |
| Obytes Expo Starter | Production template | Testing, CI/CD, env management out of box | Heavy opinionation, UI conflicts, overhead to strip |

#### API Backend

| Option | Template | Pros | Cons |
|--------|----------|------|------|
| Manual scaffold | Fastify + TypeScript + Drizzle | Full control, lean, Bun-optimized | ~30 min initial setup |
| DriftOS/fastify-starter | Prisma + Docker + Prometheus | Production-grade observability | Heavy for MVP, Prisma conflicts with Drizzle choice |
| matschik/fastify-typescript-starter | Minimal Fastify + TS | Modern, Node 24+ | Still needs DB layer added |

### Selected Starters

#### Mobile App: Expo Default Template (SDK 55)

**Rationale:** SDK 55 makes New Architecture mandatory — which is exactly what we need for Reanimated 4. The official template provides a clean foundation with Expo Router and TypeScript. Community starters conflict with gluestack-ui v3's copy-paste model and would require stripping more than they save.

**Initialization Command:**

```bash
bun create expo-app one-down --template default@sdk-55
```

**Architectural Decisions Provided by Starter:**

- **Language & Runtime:** TypeScript, Bun as package manager
- **Navigation:** Expo Router (file-based routing) with typed routes
- **Build Tooling:** Expo CLI, Metro bundler, EAS Build support
- **New Architecture:** Fabric enabled by default (mandatory in SDK 55)
- **React Version:** React 19.2 with React Native 0.83

**Must-Add After Scaffold:**

- Reanimated 4 + react-native-gesture-handler
- gluestack-ui v3 components (copy-paste into project)
- Drizzle ORM + expo-sqlite (local-first data layer)
- PostHog React Native SDK (analytics + feature flags)
- State management (decision in Step 4)
- Testing framework (decision in Step 4)

#### API Backend: Manual Fastify + TypeScript Scaffold

**Rationale:** With ~8 API endpoints and Drizzle as the ORM, a manual scaffold provides full control without fighting a starter's opinions. Fastify's plugin architecture makes incremental setup clean. Bun runs Fastify natively.

**Initialization Approach:**

```bash
mkdir one-down-api && cd one-down-api
bun init
bun add fastify @fastify/cors @fastify/auth drizzle-orm postgres
bun add -d drizzle-kit typescript @types/node
```

**Architectural Decisions for Backend:**

- **Language & Runtime:** TypeScript on Bun
- **Framework:** Fastify 5 with plugin architecture
- **ORM:** Drizzle ORM with `postgres.js` driver
- **Database:** PostgreSQL
- **Migrations:** drizzle-kit

### ORM Decision: Drizzle ORM (Both Sides)

**Server-side:** `drizzle-orm` + `postgres.js` for PostgreSQL. Lightweight, Bun-native, fast cold starts. Clean migrations via `drizzle-kit`.

**Client-side:** `drizzle-orm/expo-sqlite` for typed local queries. Enables shared type definitions across client and server for the sync layer — same task model, same types, both sides.

**Why not Prisma:** Query engine binary bloats API, no expo-sqlite driver, heavier cold starts on Bun. Overkill for this scale.

**Why not raw SQL:** Manual type definitions, manual migration tracking, more boilerplate that grows with the project. Not worth the false simplicity.

**Note:** Project initialization using these commands should be the first implementation story. The monorepo vs separate repos decision is deferred to Step 4.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Monorepo structure (Bun workspaces)
- API pattern (tRPC)
- Authentication (Supabase Auth)
- State management (Zustand)
- Hosting (Railway + Railway Postgres)

**Important Decisions (Shape Architecture):**
- Sync strategy (custom timestamp-based)
- Data validation (Zod + drizzle-zod)
- Testing framework (Jest + Maestro)
- Error handling (tRPC + Fastify + TanStack Query)
- AI integration pattern (centralized tRPC service)

**Deferred Decisions (Post-MVP):**
- Uptime monitoring service selection
- Advanced AI cost dashboard UI
- Database branching tooling (Neon, Dolt, etc.)

### Data Architecture

**Repository Structure:** Bun workspaces monorepo. Client (Expo) and server (Fastify) share a `packages/shared` workspace for Drizzle schema types and Zod validation schemas. Single repo, single PR for full-stack changes.

**Sync Strategy:** Custom sync layer with timestamp-based conflict resolution ("last-content-changed wins" per PRD). Client writes to expo-sqlite locally, syncs to Postgres via tRPC procedures when online. Simple diffing on ~5 core tables (tasks, contexts, stars, user prefs, activity log). Sync conflicts are extremely unlikely — server creates new records (AI suggestions, subtask breakdowns) rather than modifying user data, and stale detection runs as a client-side calculation. PowerSync evaluated but rejected — $49/mo for a pattern that's straightforward to implement with single-user data.

**Data Validation:** Zod with drizzle-zod for automatic schema-to-validation generation. Single source of truth: Drizzle table definition → TypeScript types → Zod validation schemas. Shared across client and server via monorepo workspace.

### Authentication & Security

**Authentication:** Supabase Auth (free tier, 50k MAU). Email/password + Google OAuth (+ support for AppleID login in the future). JWT tokens verified by Fastify middleware without calling Supabase on every request. Works independently of Supabase's database — we keep Drizzle + Railway Postgres. Firebase Auth and Clerk evaluated but Supabase offers the best free tier alignment with 25k MAU target.

**Token Storage:** `expo-secure-store` for secure credential storage on device.

**API Security:** `@fastify/cors` for CORS, `@fastify/rate-limit` for rate limiting, JWT verification middleware (Supabase tokens), HTTPS only (TLS 1.2+ per NFR), no PII in PostHog analytics. JWT verification should use tRPC middleware (not Fastify hooks) since procedures are the auth boundary. Supabase public key cached locally to avoid network round-trips per request.

**Subscription Billing:** RevenueCat for Google Play billing integration. Free up to $2,500/month revenue, then 1% of revenue. Handles receipt validation, subscription state management, entitlement checking, and analytics. Avoids building custom Play Store billing integration.

### API & Communication Patterns

**API Pattern:** tRPC with Fastify adapter (`@trpc/server/adapters/fastify`). End-to-end type safety between client and server — no API documentation layer needed, types are the contract. Uses TanStack Query under the hood via `@trpc/react-query` for caching, loading states, and optimistic updates. REST, GraphQL, and ts-rest evaluated — tRPC is the best fit for a single-client monorepo with ~8 procedure groups. `trpc-panel` available for debugging/testing UI.

**Error Handling:** tRPC's built-in typed error codes for API errors, Fastify's error handling hooks for unhandled exceptions, TanStack Query's error/loading states on the client.

**AI Integration:** `@google/generative-ai` TypeScript SDK on the server, wrapped in a centralized AI service exposed via tRPC procedures (e.g., `trpc.ai.parseBrainDump.mutate(text)`). Centralizes usage metering per user, model selection logic (Gemini Flash 2.0 default with fallback tiers), decision caching for duplicate calls, and graceful degradation when offline or over budget. No need for LangChain or similar orchestration frameworks at this scale.

### Frontend Architecture

**State Management:** Zustand for UI state (context filter, card stack position, modals) and app state (user preferences, last-open timestamp). TanStack Query (via tRPC) handles all server state. Drizzle handles local DB state. Zustand's surface is deliberately small — just the state that isn't server data or local DB data. Legend State evaluated but overlaps with Drizzle + custom sync approach.

**Testing:** Jest + react-native-testing-library for unit and integration tests (Expo default, proven RN combo). Maestro for E2E testing (YAML-based flows, visual testing, simpler than Detox for a single-developer project). Set up Maestro early in the project to catch Expo integration issues before they compound.

**Component Architecture:** gluestack-ui v3 components in `components/ui/` (copy-pasted from gluestack library). Custom app components in `components/` (task cards, card stack, star display, etc.). Expo Router handles screen organization in `app/` directory. Shared types in `packages/shared` workspace.

### Infrastructure & Deployment

**API Hosting:** Railway with native Bun support. Deploy from GitHub, ~$5/mo hobby plan. No Dockerfile needed for Bun. Scales cleanly when needed.-

**Database Hosting:** Railway Postgres — separate instances for dev, staging, and e2e testing environments. Same platform as API for simplicity. ~$5/mo per instance. Neon branching evaluated but adds complexity and cost beyond what separate Railway instances provide.

**CI/CD:** EAS Build for mobile app builds (Expo cloud build service). Railway auto-deploy from `main` for API. GitHub Actions for CI pipeline (linting, type checking, tests on PR). EAS Update for OTA updates.

**Monitoring:** PostHog for client-side analytics, session replay, and feature flags. Fastify built-in logger + Railway logs for server-side. AI cost monitoring via custom metering stored in Postgres and tracked as PostHog custom events.

### Decision Impact Analysis

**Implementation Sequence (offline-first order):**
1. Monorepo scaffold (Bun workspaces, Expo + Fastify)
2. Drizzle schemas (shared types in packages/shared)
3. Local database (expo-sqlite + Drizzle client)
4. UI component foundation (gluestack-ui v3)
5. Core features against local DB (task CRUD, curation, stars)
6. tRPC router + Fastify server
7. Supabase Auth integration
8. Custom sync layer
9. AI integration service
10. PostHog integration

**Cross-Component Dependencies:**
- tRPC depends on: Drizzle schemas (for input/output types), Zod (for validation)
- Sync layer depends on: Drizzle schemas (both sides), tRPC procedures (for server sync)
- AI service depends on: tRPC (exposure), Drizzle (usage metering storage), Zustand (cost state)
- Star system depends on: Drizzle (storage), tRPC (sync), Zustand (UI state)
- Auth depends on: Supabase SDK (client), Fastify middleware (server), expo-secure-store (token storage)

## Implementation Patterns & Consistency Rules

### Linting & Formatting

**Linter:** Oxlint (OXC) — Rust-powered, 50-100x faster than ESLint. No plugin ecosystem needed; built-in rules cover ESLint core, TypeScript, and OXC-specific checks.

**Formatter:** Prettier (via Oxfmt, which uses Prettier-compatible config). Formatting is the formatter's job, not the linter's — clear separation of concerns.

**Configuration:**

`.oxlintrc.json`:
```json
{
  "env": {
    "browser": true,
    "node": true
  },
  "ignorePatterns": ["dist/**", "node_modules/**", "*.config.js"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ]
  }
}
```

`.oxfmtrc.json` (Prettier-compatible):
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true
}
```

**Scripts:**
```json
{
  "lint": "oxlint src",
  "format": "oxfmt src",
  "lint:check": "oxlint src && oxfmt --check src"
}
```

Reference: [Oxlint x Prettier setup guide](https://dev.to/dmnchzl/oxlint-x-prettier-the-modern-approach-to-starting-your-javascript-project-3p1h)

### Naming Patterns

**Database (Drizzle + Postgres):**
- Tables: `snake_case`, plural (`tasks`, `contexts`, `star_activity_log`)
- Columns: `snake_case` (`created_at`, `user_id`, `is_completed`)
- Foreign keys: `<table_singular>_id` (`task_id`, `context_id`)
- Indexes: `idx_<table>_<column>` (`idx_tasks_user_id`)
- Enums: `snake_case` (`task_status`, `urgency_level`)

**tRPC (API):**
- Router names: `camelCase` (`sync`, `ai`, `notification`, `subscription`)
- Procedure names: `camelCase`, verb-first (`push`, `pull`, `parseBrainDump`, `scheduleReminder`)
- Full path example: `trpc.sync.push`, `trpc.ai.parseBrainDump`

**Code (TypeScript):**
- Files: `kebab-case.ts` / `kebab-case.tsx` (`task-card.tsx`, `use-sync.ts`)
- Components: `PascalCase` (`TaskCard`, `CardStack`, `StarDisplay`)
- Functions/hooks: `camelCase` (`useSync`, `getTaskById`)
- Types/interfaces: `PascalCase` (`Task`, `CreateTaskInput`, `SyncPayload`)
- Constants: `SCREAMING_SNAKE_CASE` (`MAX_STACK_SIZE`, `AI_COST_CAP_GBP`)
- Zustand stores: `use<Name>Store` (`useAppStore`, `useContextStore`)
- Drizzle schemas: `camelCase` export, `snake_case` table name (`export const tasks = pgTable('tasks', ...)`)

**Expo Router:**
- Route files: `kebab-case` in `app/` directory
- Layout files: `_layout.tsx`
- Dynamic routes: `[id].tsx`, `[...catchall].tsx`

### Structure Patterns

**Test Location:** Hard co-located alongside source files — no `__tests__/` subfolder.
```
components/
  task-card.tsx
  task-card.test.tsx
```
Maestro E2E flows in a top-level `.maestro/` directory.

**Sync Testing:** The sync layer (`use-sync.ts` + `sync-service.ts`) deserves integration tests against the e2e Railway Postgres instance, not just unit tests. Sync is where offline-first complexity concentrates — push/pull, conflict resolution, error recovery. Unit tests mock the boundary; integration tests verify it.

**Component Organization:** `components/ui/` for gluestack-ui v3 core copies. `components/` for higher-level app components. Start flat — only group by feature when natural groupings become clear through usage. Hooks and utils may be co-located with components or split into `hooks/` and `utils/` directories as the project structure emerges. Adapt and update this document as groupings crystallize.

**Client Services:** `services/` for pure business logic that runs on-device — `curation.ts` (card stack algorithm) and `star-calculator.ts` (reward logic). These are framework-agnostic, no React dependencies, and import types/constants from `@one-down/shared`. Being pure logic, they are the most testable parts of the app.

**Server organization:** Fastify plugin-per-domain. Only 4 routers — task CRUD, context selection, and star rewards are offline-first client operations synced via `sync.ts`:
```
server/
  src/
    routers/       (sync.ts, ai.ts, notification.ts, subscription.ts)
    services/      (ai-service.ts, sync-service.ts, notification-service.ts)
    db/
      schema.ts    (Drizzle schema, re-exported from packages/shared)
      migrations/
    middleware/     (auth.ts, rate-limit.ts)
    trpc.ts        (tRPC initialization, context)
    index.ts       (Fastify app entry)
```

### Format Patterns

**tRPC responses:** No manual wrapper — tRPC handles success/error automatically. Procedures return typed data directly. Errors thrown via `TRPCError` with typed error codes.

**Dates:** ISO 8601 strings in all API communication (`2026-04-25T10:30:00.000Z`). Drizzle stores as `timestamp` in Postgres, `TEXT` in SQLite. Parse/format with `date-fns` (lightweight, tree-shakeable).

**JSON fields:** `camelCase` in TypeScript/tRPC. Drizzle handles snake→camel mapping via column name overrides in schema definition.

**IDs:** `crypto.randomUUID()` for both client and server (available in Hermes from RN 0.73+, we're on 0.83). Client-generated UUIDs for offline-created records are permanent — the server accepts them as-is during sync rather than replacing them. No extra UUID dependency needed.

**Migrations:** Drizzle-kit generates SQL migrations from schema changes. Run `bun drizzle-kit generate` to create migration files, `bun drizzle-kit migrate` to apply. Each Railway Postgres instance (dev/staging/e2e) runs migrations independently. Client-side SQLite schema evolves via `drizzle-orm/expo-sqlite` migrations (applied on app start).

### Communication Patterns

**Zustand actions:** verb-first, descriptive: `setActiveContext`, `clearStack`, `toggleModal`.

**TanStack Query keys:** array format following tRPC conventions (handled automatically by `@trpc/react-query`).

### Logging & Observability

**Principle:** `console.log` is for local dev debugging only — never committed. PostHog is the logging and analytics layer for deployed apps (both client and server).

**Client-side logging:**
- PostHog React Native SDK for analytics events, session replay, and error capture
- `console.log`/`console.warn`/`console.error` for temporary local debugging only
- Oxlint `no-console: "warn"` catches accidental console statements at lint time
- `babel-plugin-transform-remove-console` strips all console statements from production builds via Metro Babel config:
  ```js
  // babel.config.js
  module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      env: {
        production: {
          plugins: ['transform-remove-console'],
        },
      },
    };
  };
  ```
- This gives a two-layer safety net: oxlint warns during development, Metro strips in production.

**Server-side logging:**
- PostHog Node SDK (`posthog-node`) for server-side analytics and event tracking
- `posthog-trpc` middleware for automatic tRPC procedure event capture — every mutation auto-tracked, queries opt-in. Events are anonymised by default (using anonymised user IDs); real identity linked only if the user explicitly opts in via a key/consent.
- Fastify's built-in pino logger for structured operational logs (startup, errors, health checks) — these go to Railway logs, not PostHog.
- Log levels: `error` (broken), `warn` (degraded), `info` (business events), `debug` (dev only).

**PostHog tRPC integration pattern:**
```ts
import { posthogMiddleware, ph } from 'posthog-trpc';

export const trackedProcedure = t.procedure.use(
  posthogMiddleware({
    client: posthogClient,
    getDistinctId: (ctx) => ctx.anonymousId, // anonymised by default
  }),
);
```
All tRPC mutations automatically emit PostHog events. Specific procedures can capture input properties via `ph.capture([ph.string('key')])` or skip via `ph.skip()`. This gives full API visibility while keeping data anonymised and traceable.

### Process Patterns

**Loading states:** TanStack Query's `isLoading`/`isFetching`/`isError` for server data. No manual loading booleans for tRPC calls. Zustand only for UI loading (e.g., animation-in-progress).

**Error recovery:**
- Network errors: TanStack Query automatic retry (3 attempts, exponential backoff)
- Auth errors: Redirect to login, clear expo-secure-store
- AI errors: Graceful degradation — show manual task entry, no AI features
- Sync errors: Queue failed syncs, retry on next app foreground

**Validation timing:** Validate at tRPC procedure boundary (input validation via Zod). Client-side validation for UX only (immediate feedback), server is source of truth.

### Enforcement

**All AI Agents MUST:**
- Run `bun run lint:check` before completing any story
- Run `bun run test` and ensure all tests pass
- Follow the naming patterns above — no exceptions
- Co-locate tests directly alongside source files (no `__tests__/` subfolders)
- Use tRPC procedures for all client-server communication (no raw fetch)
- Use Drizzle for all database access (no raw SQL strings)
- Use Zustand for UI state, TanStack Query for server state — never mix
- Use PostHog for all logging/analytics intended for deployed environments
- Never commit `console.log` statements (oxlint `no-console` rule enforces this)

**Anti-patterns to avoid:**
- `any` type assertions
- `console.log` in committed code (use PostHog for deployed logging, pino for server ops)
- Direct database access outside Drizzle
- Inline styles (use gluestack-ui v3 styling)
- Manual loading/error state tracking for API calls
- Premature component grouping — start flat, refactor when patterns emerge

## Project Structure & Boundaries

Based on all decisions (Bun workspaces monorepo, Expo SDK 55, Fastify + tRPC, Drizzle on both sides, Zustand, PostHog, gluestack-ui v3), here's the complete structure. **Offline-first principle:** task CRUD, context selection, star rewards, and card stack curation all run on-device against local SQLite. Only 4 server routes exist — for operations that genuinely require a backend.

```
one-down/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions: lint, typecheck, test on PR
├── .maestro/                         # E2E test flows (YAML-based)
│   ├── brain-dump-flow.yaml
│   └── task-complete-flow.yaml
├── .oxlintrc.json                    # Oxlint config (monorepo root)
├── .oxfmtrc.json                     # Prettier/Oxfmt config (monorepo root)
├── package.json                      # Bun workspaces root
├── bun.lock
├── tsconfig.base.json                # Shared TS config extended by workspaces
│
├── packages/
│   └── shared/                       # Shared types, schemas, validation
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── schema/               # Drizzle table definitions (source of truth)
│       │   │   ├── tasks.ts
│       │   │   ├── contexts.ts
│       │   │   ├── stars.ts
│       │   │   ├── users.ts
│       │   │   ├── sync.ts
│       │   │   └── index.ts
│       │   ├── validation/           # Zod schemas (auto-generated via drizzle-zod)
│       │   │   ├── tasks.ts
│       │   │   ├── contexts.ts
│       │   │   └── index.ts
│       │   ├── types/                # Shared TypeScript types
│       │   │   ├── task.ts
│       │   │   ├── curation.ts
│       │   │   ├── sync.ts
│       │   │   └── index.ts
│       │   └── constants/            # Shared constants
│       │       ├── star-weights.ts   # Star reward configuration
│       │       ├── ai-limits.ts      # Cost cap, model config
│       │       └── index.ts
│       └── index.ts                  # Package entry point
│
├── apps/
│   ├── mobile/                       # Expo React Native app
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── app.json                  # Expo config
│   │   ├── babel.config.js           # Metro Babel (includes transform-remove-console)
│   │   ├── metro.config.js
│   │   ├── eas.json                  # EAS Build config (Bun version pin)
│   │   ├── app/                      # Expo Router (file-based routing)
│   │   │   ├── _layout.tsx           # Root layout (providers: PostHog, tRPC, Zustand)
│   │   │   ├── index.tsx             # Home / card stack screen
│   │   │   ├── brain-dump.tsx        # Brain dump capture screen
│   │   │   ├── task/
│   │   │   │   ├── [id].tsx          # Task detail / running screen
│   │   │   │   └── overview.tsx      # Task overview list
│   │   │   ├── triage.tsx            # Welcome-back triage screen
│   │   │   ├── settings.tsx          # Account, notifications, subscription
│   │   │   └── (auth)/              # Auth group
│   │   │       ├── login.tsx
│   │   │       └── signup.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # gluestack-ui v3 copies (copy-paste)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── text.tsx
│   │   │   │   └── ...
│   │   │   ├── task-card.tsx         # Task card (front/back)
│   │   │   ├── task-card.test.tsx    # Co-located test
│   │   │   ├── card-stack.tsx        # Swipeable card stack
│   │   │   ├── card-stack.test.tsx
│   │   │   ├── context-filter.tsx    # Context selector bar
│   │   │   ├── star-display.tsx      # Star count + animation
│   │   │   ├── brain-dump-input.tsx  # Free-text capture
│   │   │   ├── completion-animation.tsx
│   │   │   └── ...                   # Start flat, group later as patterns emerge
│   │   ├── hooks/
│   │   │   ├── use-sync.ts           # Offline sync hook
│   │   │   ├── use-sync.test.ts
│   │   │   ├── use-local-db.ts       # expo-sqlite + Drizzle client wrapper
│   │   │   ├── use-absence-check.ts  # >3 day detection
│   │   │   └── use-posthog.ts        # PostHog wrapper hook
│   │   ├── services/
│   │   │   ├── curation.ts           # Card stack algorithm (runs on-device)
│   │   │   ├── curation.test.ts
│   │   │   ├── star-calculator.ts    # Star reward logic (runs on-device)
│   │   │   └── star-calculator.test.ts
│   │   ├── stores/
│   │   │   ├── app-store.ts          # Zustand: context filter, last-open, prefs
│   │   │   └── app-store.test.ts
│   │   ├── lib/
│   │   │   ├── trpc.ts              # tRPC client setup + TanStack Query provider
│   │   │   ├── supabase.ts          # Supabase Auth client
│   │   │   ├── posthog.ts           # PostHog RN client init
│   │   │   ├── local-db.ts          # expo-sqlite + Drizzle client init
│   │   │   └── secure-store.ts      # expo-secure-store wrapper
│   │   └── assets/
│   │       ├── fonts/
│   │       └── images/
│   │
│   └── server/                       # Fastify + tRPC API
│       ├── package.json
│       ├── tsconfig.json
│       ├── drizzle.config.ts         # drizzle-kit config (Postgres connection)
│       ├── src/
│       │   ├── index.ts              # Fastify app entry point
│       │   ├── trpc.ts              # tRPC init, context creation, PostHog middleware
│       │   ├── routers/
│       │   │   ├── index.ts          # Root router (merges all sub-routers)
│       │   │   ├── sync.ts           # Bidirectional data sync (all entity types)
│       │   │   ├── sync.test.ts
│       │   │   ├── ai.ts             # AI procedures (brain dump, breakdown, suggestions)
│       │   │   ├── ai.test.ts
│       │   │   ├── notification.ts   # Push notification scheduling
│       │   │   └── subscription.ts   # RevenueCat webhook + entitlement verification
│       │   ├── services/
│       │   │   ├── ai-service.ts     # Gemini SDK wrapper, metering, caching
│       │   │   ├── ai-service.test.ts
│       │   │   ├── sync-service.ts   # Conflict resolution, diff logic
│       │   │   └── notification-service.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts           # Supabase JWT verification (tRPC middleware)
│       │   │   └── rate-limit.ts     # @fastify/rate-limit config
│       │   ├── db/
│       │   │   ├── client.ts         # Drizzle + postgres.js connection
│       │   │   ├── schema.ts         # Re-exports from packages/shared
│       │   │   └── migrations/       # drizzle-kit generated migrations
│       │   └── lib/
│       │       ├── posthog.ts        # PostHog Node client init
│       │       └── env.ts            # Environment variable validation (Zod)
│       └── .env.example
│
└── docs/                             # Project documentation (project_knowledge)
```

### Offline-First vs Server Responsibilities

| Responsibility | Runs Where | Rationale |
|----------------|-----------|-----------|
| Task CRUD (create, edit, complete, cut loose) | Client (SQLite) | Instant response, works offline. Synced via `sync.ts`. |
| Context selection & filtering | Client (Zustand) | Pure UI state — no server involvement. |
| Card stack curation algorithm | Client (`services/curation.ts`) | Operates on local task data. No network needed for basic curation. |
| Star reward calculation | Client (`services/star-calculator.ts`) | Instant feedback on task completion. Weights from `packages/shared`. |
| Stale task detection | Client | Timestamp comparison on local data. |
| Absence detection (>3 days) | Client (`hooks/use-absence-check.ts`) | Timestamp comparison, triggers triage screen. |
| AI brain dump / breakdown / suggestions | Server (`routers/ai.ts`) | Requires Gemini API key + cost metering. |
| Push notifications | Server (`routers/notification.ts`) | Server-initiated — can't send push from device alone. |
| Subscription management | Server (`routers/subscription.ts`) | RevenueCat webhook verification, entitlement source of truth. |
| Data sync (bidirectional) | Server (`routers/sync.ts`) | Batch push/pull of local changes to/from Postgres. |

### Star Reward Configuration

Star weights live in `packages/shared/src/constants/star-weights.ts` — importable by both client and server. The client uses them for instant reward calculation on task completion. The server can push updated weights via sync, enabling A/B testing through PostHog feature flags without app updates.

### Architectural Boundaries

**API Boundary:** All client↔server communication goes through tRPC procedures. The root router in `server/src/routers/index.ts` is the single entry point. No raw HTTP calls from the client.

**Auth Boundary:** Supabase JWT verified in tRPC middleware (`server/src/middleware/auth.ts`). Every procedure except public health checks runs through this middleware. Client stores tokens in expo-secure-store.

**Data Boundaries:**
- `packages/shared/src/schema/` is the **single source of truth** for data models
- Server accesses Postgres via Drizzle (`server/src/db/client.ts`)
- Client accesses SQLite via Drizzle (`mobile/lib/local-db.ts`)
- Both import schemas from `@one-down/shared`

**Component Boundary:** gluestack-ui v3 uses a copy-paste model (like shadcn/ui) — components in `components/ui/` are owned by us and can be customised as needed. For MVP, keep modifications minimal and purposeful. Higher-level app components in `components/` compose from `ui/`.

### FR Category → Structure Mapping

| FR Category | Client Location | Server Location |
|-------------|----------------|-----------------|
| Task Capture (FR1-5) | `brain-dump.tsx`, `brain-dump-input.tsx` | `routers/ai.ts` (AI parsing only) |
| Card Stack (FR6-12) | `index.tsx`, `card-stack.tsx`, `services/curation.ts` | — (runs on-device) |
| Context Selection (FR13-18) | `context-filter.tsx`, `stores/app-store.ts` | — (pure client state) |
| Task Execution (FR19-25) | `task/[id].tsx`, `completion-animation.tsx` | — (local CRUD, synced) |
| Task Management (FR26-33) | `task/overview.tsx`, `task/[id].tsx` | — (local CRUD, synced) |
| Quick Wins/Big Time (FR34-36) | `stores/app-store.ts`, `services/curation.ts` | — (runs on-device) |
| AI Intelligence (FR37-42) | `task/[id].tsx` | `routers/ai.ts`, `services/ai-service.ts` |
| Rewards (FR43-49) | `star-display.tsx`, `star-activity-log.tsx`, `services/star-calculator.ts`, `task/overview.tsx` (done section) | — (calculated on-device, synced) |
| Return Experience (FR50-52) | `triage.tsx`, `hooks/use-absence-check.ts` | `routers/sync.ts` (pull latest on return) |
| Push Notifications (FR53-56) | `settings.tsx` | `routers/notification.ts` |
| Account/Subscription (FR57-61) | `(auth)/*`, `settings.tsx` | `routers/subscription.ts`, `middleware/auth.ts` |
| Data & Sync (FR62-65) | `hooks/use-sync.ts`, `lib/local-db.ts` | `routers/sync.ts`, `services/sync-service.ts` |

### Data Flow

```
[Offline Path — majority of operations]
User Action → Expo Screen → Service/Hook → Drizzle Client → expo-sqlite (local)
                                              ↓ (on task complete)
                                         star-calculator.ts → local star record

[Sync Path — periodic background + on foreground]
Sync Hook → tRPC sync.push → Fastify → sync-service → Drizzle → Postgres
         ← tRPC sync.pull ← Fastify ← sync-service ← Drizzle ← Postgres
                                                         ↓
                                                   PostHog ← posthog-trpc middleware

[Server-Only Path — AI, notifications, subscriptions]
User Request → tRPC ai.* → Fastify → ai-service → Gemini API
Push Trigger → notification-service → push notification → device
RevenueCat → webhook → subscription router → entitlement update
```

### External Integration Points

| Service | Client Integration | Server Integration |
|---------|-------------------|-------------------|
| Supabase Auth | `lib/supabase.ts` | `middleware/auth.ts` (JWT verify) |
| PostHog | `lib/posthog.ts` (RN SDK) | `lib/posthog.ts` (Node SDK) + `posthog-trpc` middleware |
| Gemini AI | — | `services/ai-service.ts` |
| RevenueCat | `settings.tsx` (RN SDK) | `routers/subscription.ts` (webhook validation) |
| Railway | — | Deployment target |
| EAS | `eas.json` | — |

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices are version-compatible and work together without conflicts. Expo SDK 55 + Fabric + Reanimated 4, Bun + Fastify 5, tRPC end-to-end, Drizzle on both sides with shared schemas, Zustand + TanStack Query complementary state split, PostHog + posthog-trpc analytics layer, Supabase Auth JWT + tRPC middleware, Oxlint + Prettier separation.

**Pattern Consistency:** Naming conventions consistent across all layers. Co-located test pattern consistent across all workspaces. Offline-first principle consistently reflected in routes, structure, and FR mapping. Enforcement rules align with all documented patterns.

**Structure Alignment:** Project tree reflects Bun workspaces monorepo. Client services folder contains pure business logic (curation, stars). Only 4 server routers. FR mapping table accounts for all 65 FRs.

### Requirements Coverage Validation ✅

All 65 functional requirements verified against architectural structure. Every FR category has clear client and/or server locations. NFR categories (performance, accessibility, reliability, security, scalability, sync) all architecturally supported. See FR Category → Structure Mapping table in Project Structure section for complete mapping.

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical technology choices documented with specific versions/libraries. Implementation sequence defined (10-step, offline-first order). Code examples provided for key patterns. Naming conventions comprehensive across all layers.

**Structure Completeness:** Complete directory tree with annotated file purposes. Clear boundaries (API, Auth, Data, Component). FR-to-structure mapping provides implementation guidance. External integration points tabulated.

**Pattern Completeness:** Error recovery, loading states, validation timing all specified. Enforcement rules actionable by AI agents. Sync testing strategy documented for integration tests.

**Key Strength:** Offline-first architecture means core business logic (curation, star calculation) is isolated in pure `services/` — highly testable without network mocking.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified (Bun, PostHog, Fabric)
- [x] Cross-cutting concerns mapped (6 identified)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined (tRPC + Drizzle + sync)
- [x] Performance considerations addressed (Fabric, Reanimated 4)

**✅ Implementation Patterns**
- [x] Naming conventions established (DB, API, Code, Expo Router)
- [x] Structure patterns defined (co-located tests, flat components, client services)
- [x] Communication patterns specified (Zustand actions, TanStack Query keys)
- [x] Process patterns documented (loading, error recovery, validation)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete
- [x] Offline-first vs server responsibilities documented

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clean offline-first architecture — app works without server
- Only 4 server routes — minimal backend surface area
- Shared Drizzle schemas — single source of truth across client and server
- Pure business logic in testable services (no framework coupling)
- End-to-end type safety via tRPC + Zod + drizzle-zod

**Areas for Future Enhancement (post-MVP):**
- React error boundary pattern for crash recovery
- Deep linking configuration
- App versioning and release strategy
- Advanced AI cost dashboard UI
