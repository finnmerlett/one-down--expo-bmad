# Story 8.2b: Subscription Purchase & Entitlements

Status: ready-for-dev
Date: 2026-07-16
Mode: Wave-based autonomous run — LOCAL MODE (decisions-log 2026-07-16): **entitlement provider abstraction + local fake provider. NO RevenueCat account, NO `react-native-purchases` dependency, NO real purchases.** The interface is shaped after RevenueCat's model so the real adapter drops in later without touching callers.

## Story

As a user, I want to subscribe to premium via in-app purchase, so that I can unlock enhanced capabilities.

FRs: 58, 60

## Acceptance Criteria (adjusted for local mode)

1. Tapping Subscribe on the premium page runs the purchase flow through an `EntitlementsProvider` interface. With no `EXPO_PUBLIC_REVENUECAT_API_KEY` set (this run), the local fake provider is selected and presents a fake billing sheet (our own dialog: product name, price "£1.50/month", Buy / Cancel — plus a dev-only "Simulate failure" action).
2. Purchase success → entitlement granted immediately: `entitlements-store.isPremium` flips true, sparkles disappear (8.2a), and the premium page shows an inline confirmation ("You're premium — enjoy!") replacing the CTA.
3. Cancelling the billing sheet returns the user to the premium page unchanged — free tier, no error UI, nothing tracked as a failure.
4. A failed purchase shows an inline error near the CTA ("Something went wrong with the purchase — nothing was charged.") with an always-visible Retry button (UX rule: inline errors, never modals).
5. "Restore purchases" (footer link on the premium page) asks the provider for existing entitlements and applies the result: previously-purchased → unlock + confirmation; nothing to restore → calm inline note ("No previous purchase found.").
6. On every app launch the provider's `refresh()` runs and the store is hydrated — a purchased entitlement survives app restarts (fake provider persists via AsyncStorage).
7. The provider seam is honest: swapping in a real RevenueCat adapter later requires only a new provider module + the env key — zero changes to store, UI, or analytics call sites.

## Implementation Plan

**Provider abstraction (`apps/mobile/src/services/entitlements/`):**
- `types.ts` — the contract (mirrors RevenueCat semantics: CustomerInfo→`EntitlementState`, purchasePackage→`purchasePremium`, restorePurchases, getCustomerInfo→refresh):
  ```ts
  type EntitlementState = { isPremium: boolean };
  type PurchaseResult =
    | { outcome: 'purchased'; state: EntitlementState }
    | { outcome: 'cancelled' }
    | { outcome: 'failed'; reason: 'network' | 'payment_declined' | 'unknown' };
  interface EntitlementsProvider {
    refresh(): Promise<EntitlementState>;          // launch + focus refresh (AC6)
    purchasePremium(): Promise<PurchaseResult>;    // opens billing UI, resolves on outcome
    restorePurchases(): Promise<EntitlementState>; // AC5
  }
  ```
- `fake-provider.ts` — persists `EntitlementState` under AsyncStorage key `onedown.entitlements.fake` (AsyncStorage already a dependency; entitlement cache ≠ user data — no sqlite migration). `purchasePremium()` opens the fake billing sheet via `fake-billing-store` and awaits the user's choice; Buy → persist + resolve `purchased`; Cancel → `cancelled`; Simulate failure → `failed('payment_declined')` (nothing persisted). `restorePurchases()`/`refresh()` read storage (malformed/missing → `{ isPremium: false }`).
- `provider.ts` — selection: `EXPO_PUBLIC_REVENUECAT_API_KEY` set → future RevenueCat adapter (documented TODO comment with the drop-in contract; do NOT scaffold dead code); unset (this run) → fake provider singleton. Callers import only from here.

**Fake billing sheet UI:**
- `apps/mobile/src/stores/fake-billing-store.ts` — zustand: `{ request: { resolve(choice) } | null; open(): Promise<Choice>; settle(choice): void }` — the promise bridge between provider and UI.
- `apps/mobile/src/components/premium/fake-billing-sheet.tsx` — gluestack `AlertDialog` (`npx gluestack-ui add alert-dialog` if not present) rendered when a request is pending: "Test billing · One Down Premium", "£1.50 / month", buttons Buy (primary) / Cancel + a small "Simulate failure" text action gated to `__DEV__ || !EXPO_PUBLIC_REVENUECAT_API_KEY` (i.e. always visible in local mode so Maestro can drive it against the release APK). Mounted once in `src/app/_layout.tsx` (inside providers, outside MigrationGate is fine — it touches no DB). Backdrop/back press = Cancel (cancellation is not an error).

**Store hydration + purchase orchestration:**
- `apps/mobile/src/services/entitlements/entitlements-service.ts` — thin orchestrators used by UI (fire-and-forget discipline like `task-edits.ts` where fitting, but purchase/restore are awaited by the page for its state machine): `refreshEntitlements()` (provider.refresh → `setPremium`), `purchasePremium()` (track initiated → provider → apply + track outcome), `restorePurchases()` (provider → apply + track).
- `src/app/_layout.tsx` — one `useEffect` calling `refreshEntitlements()` on mount (AC6).
- `apps/mobile/src/components/premium/premium-features-view.tsx` + `src/app/premium.tsx` — wire 8.2a's `onSubscribe`/`footer`: page-local state machine `idle | purchasing | error(reason) | premium` → CTA spinner while purchasing (gluestack `Spinner`), inline error + Retry (AC4), confirmation state replacing CTA (AC2), footer "Restore purchases" link with its own pending/note states (AC5). Premium state also derives from `useIsPremium()` so an already-premium visitor sees the confirmation, not the CTA.

## Analytics (add to `src/lib/analytics/events.ts` — structural data only, NFR-S3-safe by shape)

- `purchase_initiated: { product: 'premium_monthly' }`
- `purchase_completed: { product: 'premium_monthly' }`
- `purchase_cancelled: { product: 'premium_monthly' }`
- `purchase_failed: { product: 'premium_monthly'; reason: 'network' | 'payment_declined' | 'unknown' }`
- `purchases_restored: { restored: boolean }`
- NO event on launch `refresh()` (hot-path noise; logging-best-practices: skip valueless success cases).

## Testing Plan

- **Unit/integration:** `fake-provider.test.ts` — purchase Buy → persisted + `purchased`; Cancel → `cancelled` + NOT persisted; failure → `failed` + not persisted; `refresh()`/`restorePurchases()` roundtrip incl. missing/malformed storage (use the official `@react-native-async-storage/async-storage` jest mock — a pre-built solution, not a hand-rolled mock wall). `entitlements-service.test.ts` — outcome → store flag + exact analytics event per outcome (fake AnalyticsClient via `setAnalyticsClient`, pattern from `track.test.ts`); cancelled emits `purchase_cancelled`, never `purchase_failed`. Reset zustand stores in afterEach.
- **Storybook (co-located + portable-stories crash tests):** `fake-billing-sheet.stories.tsx` (pending request open — use the local-state story pattern from the Modal learning so the dialog can close and Storybook stays usable); `premium-features-view.stories.tsx` gains purchasing / error / premium-confirmation states. `bun run storybook:generate` + commit.
- **Maestro E2E:** `.maestro/32-story-8-2b-subscription-purchase.yaml` (renumber at implementation time). Flow: `runFlow common/launch-app.yaml` → seed task via quick add → start task → tap 'Premium feature: AI task breakdown' → premium page → **cancel path:** tap 'Subscribe' → fake sheet visible → tap 'Cancel' → assert 'Subscribe' still visible, assertNotVisible any error copy (AC3) → **failure path:** tap 'Subscribe' → tap 'Simulate failure' → assert inline error + 'Retry' (AC4) → **success path:** tap 'Retry' → tap 'Buy' → assert "You're premium — enjoy!" → `takeScreenshot: 8-2b-purchase-confirmed` → back to running screen → assertNotVisible 'Premium feature: AI task breakdown' (sparkle gone — closes 8.2a AC4 end-to-end) → **launch-refresh path (AC6):** `launchApp` (plain, NO clearState) → open settings? no — reopen task list → task detail → 'Continue task' → assertNotVisible sparkle (entitlement survived restart via AsyncStorage + launch refresh). Full-string selectors throughout.
- Gates last: `bun run lint:check` && `bun run typecheck` && `bun run test`.

## UX Notes

- Purchase feedback follows the consistency rules: spinner in-place on the CTA (`Purchasing…`), inline error near source with always-visible Retry, never an error modal; cancellation is silent (no toast — nothing happened).
- Confirmation is calm, not confetti (quiet satisfaction; celebration animations are a deferred design pass): swap CTA for `You're premium — enjoy!` + the reassurance line stays.
- Fake billing sheet is clearly labelled "Test billing" so screenshots/dogfooding never look like a real charge; it must NOT imitate Google Play UI.
- Restore is a quiet text link in the footer — secondary hierarchy, 44pt target.

## Dependencies

- **Depends on:** 8.2a (entitlements store, premium page + CTA/footer slots, sparkle surfaces, `/premium` route). Independent of 8.1, 8.3, and Epics 2.2–7 otherwise — can follow 8.2a immediately in the same track.
- **Shared-file conflicts:** `_layout.tsx` (also touched by 8.1's resync hook and 8.3's screen tracking — coordinate); `events.ts` (everyone); `premium-features-view.tsx` (owned by this pair of stories).
- Real RevenueCat adapter later additionally needs: `react-native-purchases` + config plugin + prebuild, Play Console products, and (per architecture) server webhook `routers/subscription.ts` as entitlement source of truth — all explicitly deferred.

## Out of Scope

- Real billing, RevenueCat SDK/account, Google Play products, server webhook + entitlement verification (Epic 5-dependent, post-MVP wiring).
- Subscription management/cancel flows (Play Store owns them), proration, offers, price localization.
- Gating enforcement inside AI features (Epic 6 call sites read `useIsPremium()` when they land).
- Syncing entitlement to the user account (needs 5.2 auth + server source of truth).
