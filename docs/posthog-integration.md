# PostHog (React Native) — built-ins vs custom seam

> Reference for One Down's analytics integration. Maps what the **posthog-react-native** SDK
> provides out of the box, so we use built-ins where they exist and only hand-roll what's genuinely
> missing. Verified against live PostHog docs on 2026-06-08. Used by **Story 1.0a** (Test & Telemetry
> Foundation) and **Story 8.3** (Analytics & Logging Foundation).

Our integration is a **hybrid**: initialize the SDK early (autocapture, lifecycle, feature flags,
`before_send` privacy hook) **and** route *custom domain events* through a thin typed
`track(event, props)` wrapper. The seam must NOT re-implement anything below marked "use built-in".

## Capability matrix

| # | Capability | Built-in API | Verdict | Notes |
|---|-----------|--------------|---------|-------|
| 1 | **Event capture** | `posthog.capture('event_name', { prop: 'value' })` — stringly-typed name + free-form props | **Seam wraps this** | The one built-in our typed `track()` sits on. The wrapper adds compile-time event-name/prop typing and PII-safe prop shaping; it must NOT add its own transport, queue, or identity. |
| 2 | **Autocapture (taps + lifecycle)** | `autocapture={{ captureTouches, captureScreens, captureLifecycleEvents, propsToCapture, noCaptureProp: 'ph-no-capture' }}` on `PostHogProvider`. Lifecycle: `Application Installed/Updated/Opened/Became Active/Backgrounded`; touches: `$autocapture`. | **Use built-in** | Do NOT manually track taps or app open/close/install/update. Configure once at init. |
| 3 | **Screen tracking** | `posthog.screen('name', { ...params })`. Auto `$screen` only works with React Navigation v6 or lower. | **Manual built-in call** | **Expo Router / React Navigation v7 do NOT autocapture screens** — set `captureScreens: false` and call `posthog.screen()` manually (e.g. a small `useScreenTracking` hook on the current route). Thin built-in call, not a re-implementation. |
| 4 | **User identification** | `posthog.identify('distinctId', { $set, $set_once })`, `posthog.alias(newId)`, `posthog.reset()` | **Use built-in** | Do NOT hand-roll identity or a user-properties store. `reset()` on logout starts a fresh anonymous id. |
| 5 | **Super properties / global context** | `posthog.register({...})`, `register_once({...})`, `unregister('key')` — attaches props to ALL events, persisted. | **Use built-in** | Do NOT stamp app_version / plan_tier / device context onto every `track()` call manually — register once and let the SDK attach them. |
| 6 | **Group analytics** | `posthog.group('type', 'id', { props })` | **Defer** | B2B multi-entity analytics. Not relevant for a single-user B2C app. |
| 7 | **Feature flags & experiments** | `getFeatureFlag('key')`, `isFeatureEnabled('key')`, `getFeatureFlagPayload('key')`, `useFeatureFlag('key')` hook, `bootstrap={{ distinctId, featureFlags }}`. Cached in AsyncStorage (offline). | **Use built-in** | Do NOT hand-roll a flag system or gating store. `bootstrap` avoids cold-start flicker. |
| 8 | **Surveys** | `PostHogSurveyProvider` (auto-renders popovers); `getActiveMatchingSurveys()` for custom UI. | **Defer / optional** | Don't add until a survey feature is wanted. URL/CSS targeting unsupported in RN. |
| 9 | **Session replay** | `options={{ enableSessionReplay, sessionReplayConfig: { maskAllTextInputs, maskAllImages, ... } }}`. Android API 26+, iOS 13+, SDK ≥ 3.2.0. | **Defer / flag-gate** | Keep off for MVP; gate behind a feature flag if enabled. Masking config is the privacy lever then. |
| 10 | **Error / exception tracking** | `options={{ errorTracking: { autocapture: { uncaughtExceptions, unhandledRejections, console } } }}`; `posthog.captureException()`; `PostHogErrorBoundary`. | **Use built-in (coordinate w/ Sentry)** | JS-layer only — **native crashes NOT captured**. Pick one system-of-record for crashes (likely Sentry for native) and avoid double-capturing. |
| 11 | **Privacy** | `before_send: (event) => event \| null` (mutate props or return null to drop); `ph-no-capture`; replay masking. | **Use built-in — NFR-S3 enforcement point** | Implement NFR-S3 in `before_send` so it covers autocapture, screens, lifecycle AND custom `track()` events uniformly. Don't scatter PII filtering across the seam. |
| 12 | **Offline queueing & flush** | Automatic. `flushAt` (default 20), `flushInterval` (10s), `maxQueueSize` (1000), `persistence: 'file'` (survives restarts); manual `flush()`. | **Use built-in** | Do NOT build a queue, retry, batching, or offline buffer — the SDK already persists and flushes. |
| 13 | **Opt-in / opt-out / consent** | `optIn()` / `optOut()` (`opt_in_capturing` / `opt_out_capturing`), `has_opted_out_capturing()`, init `opt_out_capturing_by_default`. | **Use built-in** | Do NOT hand-roll consent state — wire a settings toggle to these. |

## Scope of the custom `track()` seam

The seam SHOULD cover **only**:

- **Custom domain events** autocapture can't infer — `task_completed`, `card_swiped`, `star_awarded`, `quick_add_parsed`, etc. (app-semantic, not UI-mechanical).
- **Compile-time typing** — a typed union of event names + per-event props types, so call sites can't typo names or pass wrong shapes. PostHog's `capture()` is stringly-typed; this is the genuine value-add.
- **PII-safe prop shaping at the call site** — encouraging safe prop construction (no raw task text, no emails), with the global `before_send` hook as the actual hard backstop.

The seam MUST NOT re-implement: screen tracking (`screen()`), identity (`identify`/`alias`/`reset`), super properties (`register`), feature flags, lifecycle & tap events (autocapture), offline queue/batching/retry/flush, consent gating (`optIn`/`optOut`), or global PII filtering (`before_send`). In short: **the seam is a typed, PII-aware façade over `capture()` only** — everything else is initialized once on the SDK and used directly.

## Hook up as you go (built-in → first-needed story)

| Built-in | First needed |
|----------|-------------|
| SDK init + autocapture + `before_send` + offline queue (defaults) + `register()` super props | **Story 1.0a** (seam + provider scaffold) → live key/config in **Story 8.3** |
| `posthog.screen()` (manual, Expo Router) | **Epic 1 onward** — as each screen is added |
| Typed `track()` seam over `capture()` | **Epic 1 onward** — alongside the first custom domain event |
| `identify()` / `alias()` / `reset()` | **Epic 5** (account & auth) — identify on login, alias prior anon id, reset on logout |
| `optIn()` / `optOut()` / `has_opted_out_capturing()` | **Epic 5** (settings/consent toggle) |
| Feature flags (`useFeatureFlag`, `bootstrap`) | **Epic 8** (or earlier if any rollout gating appears) |
| `captureException` / error autocapture / `PostHogErrorBoundary` | **Foundation / cross-cutting** — after deciding Sentry-vs-PostHog crash ownership |
| Session replay (`enableSessionReplay` + masking) | **Deferred** — flag-gate when ready |
| Surveys (`PostHogSurveyProvider`) | **Deferred** |
| Group analytics (`group()`) | **Not planned** (B2B-oriented) |

## Caveat to verify at implementation time

PostHog's general *data-collection* docs imply `before_send` is "JavaScript Web only," but the
error-tracking capture page shows an explicit `before_send` snippet for React Native and the
property-redaction tutorial confirms it sanitizes/drops events generally. Treat `before_send` as
available in `posthog-react-native` and as the NFR-S3 enforcement point — but pin the SDK version and
smoke-test that the hook fires on a non-exception event in the target version before relying on it.

## Sources

- RN SDK overview & config — https://posthog.com/docs/libraries/react-native
- RN SDK API reference — https://posthog.com/docs/references/posthog-react-native
- `PostHogOptions` / `PostHogProviderProps` types — https://posthog.com/docs/references/posthog-react-native/types/PostHogOptions
- Capturing events — https://posthog.com/docs/product-analytics/capture-events
- Autocapture — https://posthog.com/docs/product-analytics/autocapture
- Feature flags (RN) + bootstrapping — https://posthog.com/docs/feature-flags/installation/react-native , https://posthog.com/docs/feature-flags/bootstrapping
- Session replay (RN) — https://posthog.com/docs/session-replay/_snippets/react-native-installation
- Error tracking (RN) + `before_send` — https://posthog.com/docs/error-tracking/installation/react-native , https://posthog.com/docs/error-tracking/capture
- Privacy / data collection — https://posthog.com/docs/privacy/data-collection
- Property redaction with `before_send` — https://posthog.com/tutorials/web-redact-properties
- Surveys (RN) — https://posthog.com/docs/surveys/installation/react-native
- RN analytics / remote-config tutorials — https://posthog.com/tutorials/react-native-analytics , https://posthog.com/tutorials/react-native-remote-config
