# Story 1.0a: Test & Telemetry Foundation

Status: done
Date: 2026-06-11
Mode: BMad-lite autonomous run (story file → implement → fresh-context review → squash commit)

## Story

As a developer, I want the testing harnesses and the analytics seam established on top of the scaffold, So that every later story can be tested properly and can emit telemetry safely from day one.

## Acceptance Criteria

1. **Testing foundation:**
   - React Native Storybook installed, runs on-device (Android emulator) — the approach for visual/component testing (no mock-heavy Jest render tests)
   - Portable Stories (`composeStories`) run stories headlessly in Jest for crash-free CI coverage
   - Mobile integration-test harness against a real in-memory SQLite DB (no mocked DB)
   - Maestro E2E foundation: custom dev build (`expo-dev-client`, package `com.onedown.mobile`), shared launch flow, "app launches" smoke test, `scripts/maestro-test.sh` capturing console logs
   - Suite avoids trivial/fake-DB pass-through tests
   - CLAUDE.md documents the methodology
2. **Analytics seam:**
   - Typed `track(event, props)` wrapper + event-taxonomy file (calls `posthog.capture()` internally; compile-time event-name/prop typing)
   - `PostHogProvider` scaffold mounted (autocapture + lifecycle) with `before_send` PII sanitizer (NFR-S3: never emit task title/description/notes)
   - No-op/console fallback when no PostHog key set (live key + server side land in Story 8.3)
   - Seam covers ONLY custom domain events — must NOT re-implement screen tracking, identity, super props, feature flags, lifecycle, or offline queueing (PostHog built-ins per `docs/posthog-integration.md`)

## Implementation decisions (planned)

- Versions per architecture: `jest-expo@~56.0.4` (governs jest — never pin jest directly), `@testing-library/react-native@^14` (no react-test-renderer), `@storybook/react-native@^10` + portable stories, Maestro CLI already on system (2.5.1).
- Integration harness driver: `drizzle-orm` (^0.45.2, becomes runtime dep in 1.2 anyway) + `better-sqlite3` (devDep) — same `sqliteTable` schema definitions as production, real SQL, in-memory. jest runs in Node so expo-sqlite itself can't be the test driver.
- Storybook on-device entry: env-gated (`EXPO_PUBLIC_STORYBOOK=1`) so the normal app is untouched; metro `withStorybook` wrapper.
- E2E build commands use exiting steps (`expo prebuild` + `gradlew assembleRelease` + `adb install`), not the attached `expo run:android` (run-practice memory).
- PostHog: `posthog-react-native` via `npx expo install` (+ its expo peer modules). Provider scaffold reads `EXPO_PUBLIC_POSTHOG_API_KEY`; absent → children rendered bare + `track()` console/no-op fallback. `captureScreens: false` (Expo Router not autocapturable; manual `posthog.screen()` from Epic 1). `before_send` denylist sanitizer = NFR-S3 enforcement; smoke-tested on a non-exception event per docs caveat.
- Event taxonomy seeded with Epic-1 domain events (emitted from their stories): `task_created` etc. — taxonomy file grows per story, "instrument as built".

## Tasks

- [x] Research current exact APIs: Storybook RN v10 setup + portable stories in jest-expo; posthog-react-native before_send (live docs)
- [x] Deps: jest-expo, @testing-library/react-native, @storybook/react-native(+react), drizzle-orm, better-sqlite3, expo-dev-client, posthog-react-native (+expo peers)
- [x] Jest config (jest-expo preset) + first portable-story smoke test (ScreenPlaceholder story)
- [x] Storybook on-device: .rnstorybook config + STORYBOOK_ENABLED entry swap + metro wrapper — VERIFIED on emulator (screenshot: story navigator + canvas rendering foundation/ScreenPlaceholder/Default via dev client)
- [x] Integration harness: src/test-utils/db.ts (in-memory drizzle/better-sqlite3) + harness round-trip test
- [x] Maestro: .maestro/common/launch-app.yaml + 01-story-1-0a-app-launches.yaml + scripts/maestro-test.sh + root scripts — smoke flow PASSES against release APK (twice)
- [x] Analytics: events.ts taxonomy + track.ts seam + posthog.tsx provider scaffold + before_send sanitizer + tests (7 tests green incl. real-SDK NFR-S3 smoke)
- [x] Mount provider in _layout; rebuild release APK; Maestro smoke green
- [x] CLAUDE.md: testing methodology, analytics seam, storybook commands, stale-fact fixes (SDK 56, Bun 1.3.14, @google/genai), gate discipline
- [x] Root `test` script real (mobile jest); all gates green (lint:check, typecheck, test)
- [x] Fresh-context review → fixes → squash commit

### Review findings & resolutions

Fresh-context review: config/contract reviewer returned **approve-with-fixes** (all addressed); the second reviewer (AC/test-quality lens) was lost to a session usage limit — its ground was partially covered by in-flight checks; accepted given budget constraints.

- **Important — autocapture PII leak path closed:** `captureTouches: true` with the SDK's default `propsToCapture` captures element text (`$el_text` via 'children') and `attr__accessibilityLabel` in `$autocapture` events — task titles on cards would have leaked on tap once a live key exists. Fixed both ends: provider narrows `propsToCapture: ['testID', 'ph-label']`, and the before_send denylist now includes `$el_text` + `attr__accessibilitylabel`, with a $autocapture-shaped regression test.
- Phantom dependency removed: `BeforeSendFn` now derived from `posthog-react-native`'s own `PostHogOptions` instead of importing undeclared transitive `@posthog/core`.
- jest transformIgnorePatterns: re-appended the preset's auxiliary entries (reanimated babel plugin, @react-native/babel-preset must not pass through babel-jest — would have bitten Story 1.1); comment corrected.
- EU host fallback uses `||` (empty-string env var no longer silently routes to the US region).

## Dev Notes

- **Research-first paid off** (live-docs agent): Storybook RN v10.4.4 entry-swap wrapper (`withStorybook` NAMED export, outermost around `withNativeWind`); `deviceAddons` key (not `addons`); posthog-react-native moved to the `PostHog/posthog-js` monorepo (posthog-js-lite is stale); `before_send` (snake_case) exists in RN SDK since 4.22.0 and fires for ALL captures at enqueue.
- **TS 6 stopped auto-including `@types/*`**: jest globals (describe/it/expect) unresolved until `"types": ["jest"]` was set explicitly in mobile tsconfig (server already had `"types": ["bun"]`).
- **RNTL v14 `render()` is async** — `await render(...)` in every test. No `react-test-renderer` (v14 uses the new `test-renderer`).
- **jest-expo preset's `transformIgnorePatterns` must be replaced wholesale** (single negative-lookahead regex — can't be extended additively): took the Storybook expo-example's known-good pattern + storybook/@storybook/nativewind/react-native-css-interop/posthog additions.
- **NFR-S3 smoke test is real**: instantiates the actual `PostHog` class (`persistence: 'memory'`, `flushAt: 1`, `disableCompression: true` — batch bodies are gzipped otherwise) with our `posthogBeforeSend`, captures a non-exception event carrying `title`, asserts the wire payload (mocked fetch) has it redacted. Satisfies the docs/posthog-integration.md caveat.
- **Event props constrained to flat primitives** (`AnalyticsProperties = Record<string, string|number|boolean|null>`) — compile-time guarantee that nested objects (where task content could hide) can't enter the taxonomy; also matched PostHog's `capture` signature variance.
- `storybook.requires.ts` is generated but COMMITTED (typecheck on fresh clones); metro regenerates it on every storybook start.
- `.maestro/common/launch-app.yaml` shared flow + `01-story-1-0a-app-launches.yaml` smoke; `scripts/maestro-test.sh` guards on adb device, clears logcat, dumps ReactNativeJS after run.
- `mobile:build` uses exiting steps (prebuild → gradlew), not the attached `expo run:android`.
- Native deps added for Storybook's controls addon (slider/datetimepicker) and selection persistence (async-storage) are regular deps so dev-client builds autolink them.
- **`.rnstorybook/index.tsx` must call `registerRootComponent(StorybookUIRoot)`** — the entry swap replaces `expo-router/entry`, which normally does the "main" registration; without it the dev client throws `"main" has not been registered`.
- On-device verification fought through: Docker squatting port 8081 (used 8082 + `adb reverse`); host disk full mid-NDK-build (user freed 16GB); emulator /data full (259MB debug APK + 95MB release — uninstall before install); `adb install -r` over a running app leaves the old process running (force-stop before relaunch).
- `transform-remove-console` verification (deferred from 1.0): still pending a committed console call in a release build — tracked for Story 8.3 (console stripping is its AC); oxlint no-console remains the active net.
