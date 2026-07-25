# Contributing to One Down

## Development Setup

See the [README](README.md) for prerequisites and first-time setup (Supabase stack, emulator, env files). Day to day:

```bash
bun install               # Install dependencies
bun run supabase:start    # Local Supabase stack (Docker)
bun run server:dev        # Backend server (hot reload)
bun run emulator          # Headed Android emulator
bun run mobile:android    # Debug build + Metro (bun run mobile thereafter)
```

## Quality Gates

```bash
bun run verify        # All of the below, in order — run before committing
bun run typecheck     # TypeScript strict across all workspaces
bun run test          # Jest (shared + server + mobile)
bun run lint:check    # Oxlint + Oxfmt check mode
```

## E2E Testing with Maestro

### Install

```bash
# macOS (Homebrew)
brew install maestro

# Or via install script
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Run

E2E tests run against the **release APK** — no Metro or dev server involved. Supabase and the backend server must be running (the cloud-sync and AI flows exercise them for real).

1. Start the emulator (`bun run emulator`, or `emulator:headless` for CI-style runs)
2. Start the stack: `bun run supabase:start` and `bun run server:dev`
3. Run the tests:

```bash
bun run test:e2e:fresh                                   # Rebuild APK + install + all flows
bun run test:e2e                                         # All flows against the installed APK
bun run test:e2e .maestro/04-story-1-3-card-stack.yaml   # Single flow
```

Always go through `bun run test:e2e` (which wraps `scripts/maestro-test.sh`) rather than calling `maestro` directly — the wrapper pins adb/Maestro to the emulator (so an attached phone is never touched) and dumps the app's console logs after each run.

### Adding E2E Flows

Every user-facing change needs a Maestro flow. Add new flows to `.maestro/` following the naming convention:

```
<sequence-number>-<story-key>-<short-flow-name>.yaml
```

Reuse the shared subflows in `.maestro/common/` (app launch with clean state, task seeding), select by accessibility label, and end flows with the `assertNotVisible: 'Unhandled'` / `'error occurred'` guard pair — existing flows are the reference.

## Commit Conventions

See `.github/commit-conventions.md` for commit message format.
