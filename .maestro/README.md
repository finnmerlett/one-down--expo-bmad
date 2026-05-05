# Maestro E2E Tests

YAML-based end-to-end test flows for the One Down mobile app, run against the Pixel_8_API_35 Android emulator.

## Install Maestro

```bash
# macOS (Homebrew)
brew install maestro

# Or via install script
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## Run Tests

```bash
# Run all flows
bun run test:e2e

# Run a single flow
maestro test .maestro/01-app-launches.yaml
```

## Prerequisites

1. Android emulator running (Pixel_8_API_35)
2. Expo dev server started: `bun run mobile`
3. App loaded in Expo Go on the emulator

## Flow Naming Convention

```
<sequence-number>-<story-key>-<short-flow-name>.yaml
```

Examples:
- `01-app-launches.yaml`
- `02-story-1-1-shell-smoke.yaml`
- `03-story-1-2-quick-add-smoke.yaml`

## App Configuration

Flows target the Expo Go client (`host.exp.exponent`). If migrating to a custom development build, update the `appId` in each flow file.

## Writing New Flows

Each story that adds UI should include a Maestro backfill flow verifying its acceptance criteria. Use `accessibilityLabel` values as selectors — the app does not use `testID`.

```yaml
# Example selector using accessibility label
- tapOn:
    id: "Add task"
```
