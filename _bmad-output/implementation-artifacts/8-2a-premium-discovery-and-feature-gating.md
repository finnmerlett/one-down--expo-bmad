# Story 8.2a: Premium Discovery & Feature Gating

Status: ready-for-dev
Date: 2026-07-16
Mode: Wave-based autonomous run — LOCAL MODE: no billing SDK, no server. This story is pure mobile UI + a local entitlement state seam that Story 8.2b's provider fills in.

## Story

As a user, I want to see which features are premium and browse what's available, so that I can decide whether to upgrade.

FRs: 59, 61

## Acceptance Criteria

1. On the free tier, premium features are marked with a tappable sparkle icon (Lucide `Sparkles` via gluestack `Icon`). Initial premium surface: the "Help me with this" AI-breakdown button on the task running screen (currently a disabled placeholder from 2.1 — the sparkle sits beside its label). If Epic 6 has landed by implementation time, attach to the live button instead; behaviour is identical.
2. Tapping any sparkle opens the premium features page (`/premium`): a headed list of premium features with one-line descriptions, a full-width "Subscribe" CTA (disabled placeholder — wired in 8.2b, matching the project's disabled-placeholder precedent), and a free-tier reassurance line.
3. All core features keep working on the free tier — this story gates DISCOVERY only; it must not disable or hide anything that works today.
4. When entitlement state is premium (settable via the entitlements store; real provider arrives in 8.2b), sparkles are not rendered on gated features. (End-to-end unlock is verified in 8.2b's E2E; here it is verified at the component/store level.)
5. Premium feature metadata lives in ONE registry module — no hardcoded feature lists in components.

## Implementation Plan

**Entitlement state seam (consumed by every gated surface; 8.2b hydrates it):**
- `apps/mobile/src/stores/entitlements-store.ts` — zustand (UI-state pattern, like `quick-add-store.ts`): `{ isPremium: boolean; setPremium(next: boolean): void }`, initial `false`. Deliberately dumb — no persistence, no provider calls (8.2b owns those). Verb-first action name per architecture conventions.
- `apps/mobile/src/hooks/use-is-premium.ts` — `useEntitlementsStore((s) => s.isPremium)` selector; the single import point for gating checks.

**Premium feature registry:**
- `apps/mobile/src/constants/premium-features.ts` — `PremiumFeatureId = 'ai_breakdown' | 'ai_brain_dump'`; `PREMIUM_FEATURES: { id, title, description }[]`:
  - `ai_breakdown` — "AI task breakdown" / "Stuck? 'Help me with this' turns a task into small, doable steps."
  - `ai_brain_dump` — "AI brain-dump parsing" / "Dump everything on your mind — get it back as ready-made task cards."
  - The premium SET is a product lever (per PRD, AI features carry the per-user cost); the registry is the only place it changes. Do not gate manual task entry, the card stack, completion, or any Epic 1–4 feature (FR59).

**Components (`apps/mobile/src/components/premium/`):**
- `sparkle-badge.tsx` — `SparkleBadge({ feature: PremiumFeatureId })`: renders nothing when `useIsPremium()`; otherwise a `Pressable` sparkle (hitSlop 8, ≥44pt effective target) with `accessibilityRole="button"`, `accessibilityLabel="Premium feature: <title>"`; onPress → `track('premium_sparkle_tapped', { feature })` then `router.push('/premium')`.
- `premium-features-view.tsx` — presentational: heading "One Down Premium", registry-driven feature rows (title + description, sparkle glyph as row icon), reassurance line, full-width primary Button "Subscribe" accepting an optional `onSubscribe` prop — omitted = disabled placeholder (exact pattern of CardBack's optional `onStart` from 2.1). Also accepts optional `footer` slot (8.2b adds Restore purchases there).

**Route + wiring:**
- `apps/mobile/src/app/premium.tsx` — route pushing `PremiumFeaturesView` (plain push like `task-list.tsx`; back arrow "Back"; no BackHandler needed — route screens use the navigator).
- `apps/mobile/src/components/task-running/task-running-view.tsx` — render `<SparkleBadge feature="ai_breakdown" />` beside the "Help me with this" action. NOTE: the running screen is a pushed route; pushing `/premium` from it is safe (no overlay BackHandler beneath — the 1.5 landmine does not apply here, but do not add a sparkle to the home-overlay card back in this story precisely to avoid it).

## Analytics (add to `src/lib/analytics/events.ts`)

- `premium_sparkle_tapped: { feature: 'ai_breakdown' | 'ai_brain_dump' }` — the monetization-funnel entry point.
- NO `premium_page_viewed` domain event — screen views are PostHog built-ins (`posthog.screen`, decisions-log 1.5 precedent); the page view arrives with 8.3's screen tracking.

## Testing Plan

- **Unit:** none — the gating hook and registry are trivial pass-throughs (methodology: skip obvious single-line logic).
- **Storybook (co-located CSF + automatic portable-stories crash tests):** `sparkle-badge.stories.tsx` (free state; premium state renders nothing — story sets the zustand store in a decorator/effect and resets it after, same discipline as Modal stories using local state); `premium-features-view.stories.tsx` (default placeholder CTA; with `onSubscribe` wired). RNTL v14: `await render(...)` / `await fireEvent(...)` in any portable-story assertions. `bun run storybook:generate` + commit.
- **Component behaviour test (portable story or RNTL, co-located):** premium=true → no sparkle in `TaskRunningView`; premium=false → sparkle present with correct a11y label (AC4 at component level). Reset store state between tests (`useEntitlementsStore.setState({ isPremium: false })` in afterEach).
- **Maestro E2E:** `.maestro/31-story-8-2a-premium-discovery.yaml` (renumber to slot after the highest existing flow). Flow: `runFlow common/launch-app.yaml` → quick-add seed task ('Sparkle me task', same steps as flow 07) → open card back → 'Start task' → on running screen assert 'Premium feature: AI task breakdown' visible → tap it → assert 'One Down Premium' + 'AI task breakdown' + 'AI brain-dump parsing' + 'Subscribe' → `takeScreenshot: 8-2a-premium-page` → `back` → assert running screen still intact ('Help me with this' visible) → assertNotVisible 'Unhandled'/'error occurred'. Full-string selectors (Maestro learning: accessible containers hide inner text — assert the full a11y label).
- Gates last: `bun run lint:check` && `bun run typecheck` && `bun run test`.

## UX Notes

- Barebones-functional: gluestack defaults, no theming. One primary action on the premium page (the Subscribe CTA — button hierarchy rule); feature rows are plain VStack rows with Divider.
- Sparkle is an INVITATION, not a lock: no padlock icons, no greyed-out "locked" styling on the gated button itself (the button's own disabled state belongs to Epic 6's wiring, not to gating), no interstitials. Discovery is opt-in via tap (quiet-satisfaction design).
- Copy: reassurance line `Everything you already use stays free.` (factual, no FOMO pressure); CTA label `Subscribe` (price copy arrives with 8.2b's fake offering).
- Page is a full-screen push, portrait, safe-area insets; system back works.

## Dependencies

- **Depends on:** Story 2.1 (task running screen — done). Nothing else. **Early-parallel candidate — independent of Epics 2.2–7 and of 8.1/8.3.**
- **Blocks:** 8.2b (consumes `entitlements-store`, `premium-features-view` CTA + footer slots, `/premium` route).
- **Shared-file conflicts:** `task-running-view.tsx` (+ its stories/tests) is also touched by 2.2/2.3/2.4 and Epic 6 stories; `events.ts` is touched by nearly every story — schedule accordingly. If Epic 6 lands first, place the sparkle beside the then-live "Help me with this" button and consider a second sparkle at the brain-dump entry (quick-add sheet) — registry already covers it.

## Out of Scope

- Purchases, entitlement persistence/hydration, provider abstraction, Restore purchases, confirmation states — all 8.2b.
- Actual enforcement/blocking of AI features (Epic 6 call sites check `useIsPremium()` when they land; free tier has nothing to block today).
- Settings-screen premium row (avoid coupling to 8.1's settings screen; sparkle is the FR61 discovery path). Add later if product wants it.
- Price display, offers, paywall experiments.
