# BMAD Workflow

Each BMAD stage (create-story, dev-story, code-review, ship) MUST be run with a **fresh context**. Do NOT carry conversation state between stages. The only inputs to each stage are:
- The BMAD workflow documentation in `_bmad/bmm/workflows/`
- The implementation artifacts in `_bmad-output/`
- The code itself

This ensures each stage evaluates the work independently, not influenced by prior reasoning or assumptions.

# E2E Testing

Every user-facing change MUST include a Maestro E2E test. Tests live in `.maestro/` as `XX-story-Y-Z-description.yaml`.

## Commands

- `bun run test:e2e` — run all tests against installed APK
- `bun run test:e2e:fresh` — rebuild (after any code changes) + install + test

Requires a running emulator. Check if there is one running. If not, start windowless with:
```
~/Library/Android/sdk/emulator/emulator @Pixel_8_API_35 -no-window -no-audio &
```

## Key facts

- E2E runs against **release APK** — no Metro needed
- `scripts/maestro-test.sh` dumps all app console.logs after each run

## Debugging

Instrument first, theorize second. Something wrong? Unexpected? -> `console.log`, run the test, read the logs. Remove logging after the fix.
