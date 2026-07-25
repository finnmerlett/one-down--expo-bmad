# One Down

Mobile task management for people with ADHD — one task at a time.

Instead of an overwhelming list, One Down deals your tasks as a swipeable card stack: swipe past what doesn't fit right now, work one card at a time, earn stars for finishing *and* for letting go. A brain-dump box turns free-form rambling into structured tasks via AI, and task-health nudges catch the things you keep avoiding — without guilt.

**Status:** all 8 epics (26 stories) implemented; 32 Maestro E2E flows green against the release build. Runs fully locally with zero external API keys.

## Tech stack

| Layer | Tech |
|---|---|
| Monorepo | Bun workspaces — `apps/mobile`, `apps/server`, `packages/shared` |
| Mobile | Expo SDK 56 · React Native · Expo Router · NativeWind v4 (Tailwind v3) · gluestack-ui v3 · Reanimated 4 |
| Server | Fastify 5 · tRPC · Bun |
| Data | expo-sqlite + Drizzle on device (offline-first) · PostgreSQL + Drizzle on the server (sync) |
| Auth | Supabase Auth (JWKS-only ES256 verification — no shared JWT secret) |
| AI | Gemini Flash via `@google/genai`, server-side only; deterministic fake provider when no key is set |
| State | Zustand (UI) · TanStack Query via tRPC (server state) |
| Quality | TypeScript strict · Oxlint · Oxfmt · Jest + Storybook portable stories · Maestro E2E |

## Repository layout

```
apps/mobile/          Expo app (src/app routes, src/components, src/services, src/lib)
apps/server/          Fastify + tRPC API (src/routers, src/lib), Drizzle migrations
packages/shared/      Schemas (client + server), types, validation, star/curation constants
.maestro/             E2E flows (numbered per story) + common/ subflows
scripts/              maestro-test.sh — device-pinned E2E runner with app-log dump
supabase/             Local Supabase stack config
_bmad-output/         Planning artifacts: PRD, architecture, epics, UX spec, story specs
```

## Prerequisites

- **Bun** 1.3.x (package manager + server runtime)
- **Node** 24 (Expo/Metro tooling)
- **Docker Desktop** (runs the local Supabase stack)
- **Supabase CLI** (`brew install supabase/tap/supabase` or the [release binary](https://github.com/supabase/cli/releases))
- **Android Studio + SDK** with an AVD named `Pixel_8_API_35` (the scripts assume this name)
- **Maestro** (`curl -Ls "https://get.maestro.mobile.dev" | bash`) — E2E only

## First-time setup

```bash
bun install

# Optional — the defaults target the local stack out of the box:
cp apps/server/.env.example apps/server/.env
cp apps/mobile/.env.example apps/mobile/.env

bun run supabase:start    # boots Postgres + Auth via Docker (URLs + keys printed)
bun run db:migrate        # applies server Drizzle migrations to local Postgres
```

The server binds `:3000` by default. If that port is taken, set `PORT` in `apps/server/.env` **and** `EXPO_PUBLIC_API_URL=http://10.0.2.2:<port>` in `apps/mobile/.env` to match (`10.0.2.2` is how the Android emulator reaches your machine). `EXPO_PUBLIC_*` values are baked in at bundle time — restart Metro or rebuild the APK after changing them.

## Everyday development

Three terminals:

```bash
bun run supabase:start    # 1 — one-shot; containers keep running in Docker
bun run server:dev        # 2 — Fastify with hot reload
bun run emulator          # 3 — headed emulator (or emulator:headless for CI-style)
```

Then the app itself:

```bash
bun run mobile:android    # first time: builds + installs the DEBUG app, starts Metro
bun run mobile            # thereafter: just Metro — open the installed app on the emulator
```

> **Debug ↔ release gotcha:** the debug app and the release APK share an application ID but not signatures. Switching between them needs `bun run mobile:uninstall` first, in both directions.

Everything works offline and key-free by design: without a `GEMINI_API_KEY` the AI endpoints run a deterministic fake, without a PostHog key analytics are a no-op, and subscriptions use a fake billing sheet. Sign-up/sign-in and cloud sync run against the local Supabase stack.

## Testing

```bash
bun run verify            # the full gate: typecheck → tests → lint + format check
bun run test              # Jest: unit, integration (in-memory SQLite), portable stories
bun run storybook:android # on-device component browser (needs the debug build installed)
```

### E2E (Maestro)

E2E runs against the **release APK** — no Metro involved. Supabase + the server must be running (the cloud-sync and AI flows exercise them for real).

```bash
bun run test:e2e:fresh                                   # rebuild APK + install + run all flows
bun run test:e2e                                         # all flows against the installed APK
bun run test:e2e .maestro/04-story-1-3-card-stack.yaml   # a single flow
```

Run flows with a headed emulator (`bun run emulator`) to watch Maestro drive the app. `scripts/maestro-test.sh` pins all adb/Maestro traffic to the emulator (a plugged-in phone is never touched) and dumps the app's console logs after each run. Flows save screenshots under `.claude/run-notes/screenshots/`.

Flow files are named `<nn>-story-<epic-story>-<name>.yaml`; shared steps live in `.maestro/common/`.

## Environment reference

All variables are optional in development — defaults target the local stack. Never commit `.env` files.

| Variable | Where | Unset behaviour |
|---|---|---|
| `GEMINI_API_KEY` | server | Deterministic fake AI provider (local/E2E mode) |
| `DATABASE_URL` | server | Local Supabase Postgres (`127.0.0.1:54322`) |
| `SUPABASE_JWKS_URL` / `SUPABASE_JWT_ISSUER` | server | Local Supabase Auth |
| `POSTHOG_API_KEY` / `EXPO_PUBLIC_POSTHOG_API_KEY` | server / mobile | Analytics no-op |
| `EXPO_PUBLIC_API_URL` | mobile | `http://10.0.2.2:3000` on the emulator |
| `EXPO_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` | mobile | Local stack + well-known local demo key |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | mobile | Fake entitlements + fake billing sheet |

## Known limitations

- **Permanent delete is local-only:** sync has no tombstones yet, so a task deleted from the recycle bin can resurrect from the server on a fresh-install full pull.
- Android-only for now (portrait, 320–430pt widths); iOS is untested.

## Further reading

- Product/architecture docs: `_bmad-output/planning-artifacts/` (PRD, architecture, epics, UX spec)
- Analytics integration: `docs/posthog-integration.md`
- Contributing + commit conventions: [CONTRIBUTING.md](CONTRIBUTING.md)
