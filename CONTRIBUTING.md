# Contributing to One Down

## Development Setup

```bash
bun install           # Install dependencies
bun run mobile        # Start Expo dev server
bun run server:dev    # Start backend server
```

## Quality Gates

```bash
bun run typecheck     # TypeScript strict across all workspaces
bun run lint          # Oxlint
bun run format:check  # Oxfmt check mode
bun run test          # Unit tests (shared + server + mobile)
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

1. Start the Android emulator (Pixel_8_API_35)
2. Start the Expo dev server: `bun run mobile`
3. Load the app in Expo Go on the emulator
4. Run E2E tests:

```bash
bun run test:e2e                              # All flows
maestro test .maestro/01-app-launches.yaml    # Single flow
```

### Adding E2E Flows

Add new flows to `.maestro/` following the naming convention:

```
<sequence-number>-<story-key>-<short-flow-name>.yaml
```

See `.maestro/README.md` for details on selectors and conventions.

## Commit Conventions

See `.github/commit-conventions.md` for commit message format.
