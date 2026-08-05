# 9.3 — v1.5 wrap-up: e2e + infra fixes (round 3)

Post-v1.5 stabilization batch (2026-08-05, autonomous run wrap-up). The final
authoritative Maestro batch after D7b scored 29/33; every failure traced to a
flow-side or environment defect — no app regression, no OTA rollback.

## Fixes

1. **Flow 18 offer-tolerant label assert** — Delta accumulates skips while
   the flow cycles the deck, so a coin-flip don't-skip offer can add a badge
   segment to the card's accessibility label. Final assert now matches the
   prefix (`Task: Delta task\. Worth 5 stars\. Card 1 of 1.*`), same
   treatment flow 25 already had.
2. **Flow 23 dropped-tap retry + real a11y target** — the first tap on
   "Back to the deck" lands the frame the queue-clear view mounts and gets
   dropped (reproduced twice; the retry block fired and saved the re-run).
   Also `+5 today` was never reachable through the accessibility tree — the
   star counter exposes ONE label (`5 stars, 5 earned today`, cf. flows
   16/17); the assert now targets that.
3. **Supabase e2e flows un-broken (tunnel fallout)** — since the Tailscale
   migration (2026-07-27), `apps/mobile/.env` baked the tailnet Supabase URL
   into local builds, which the emulator can't reach (userspace tailscaled
   has no local interface) — flows 52/53 have been red ever since. `.env`
   now points at `10.0.2.2:54321` (supabase-local; demo anon key already the
   code fallback). Phone untouched — its URLs live in the EAS production env.
4. **OTA banner kept out of e2e** — the release e2e APK downloads the newest
   EAS update at launch and pops "A fresh version is ready" mid-flow,
   shifting the home layout. `use-update-ready.ts` now no-ops (checks and
   `isUpdatePending` both) when `EXPO_PUBLIC_OTA_UI=off` is baked in;
   `.env` sets it for all local builds. NEVER set in the EAS env — the
   phone's one-tap restart flow depends on the banner. Residual: the native
   cold-launch check may still download in the background (manifest-level
   config is shared with phone builds); only the UI is silenced.
5. **Appearance fresh-install warning silenced** — `getAppearance` raced the
   migrator on first launch (`no such table: preferences` warn on every e2e
   fresh install). A missing table now reads as "nothing stored" → default;
   other errors still throw.
6. **tailscaled reboot survival** (infra, outside repo) — user LaunchAgent
   `~/Library/LaunchAgents/com.finnmerlett.tailscaled.plist` (RunAtLoad +
   KeepAlive) starts the userspace tailscaled at login; activates on next
   login, the currently-running instance was left in place. Relay runbook
   updated.

## Follow-on fixes (same batch, found by the un-masked flows)

7. **Supabase session storage key pinned** (`cbbc331`) — supabase-js derives
   its default session-storage key from the server URL's hostname
   (`sb-<host>-auth-token`). The embedded APK bundle (10.0.2.2) and a
   downloaded OTA bundle (tailnet host from the EAS env) therefore stored /
   looked up the session under DIFFERENT keys, and expo-updates boots the
   downloaded bundle on the second launch — so flow 52's restart-persistence
   step came back signed out. `storageKey: 'onedown-auth'` in
   `src/lib/supabase.ts` makes the session URL-independent. Migration note:
   sessions stored under old URL-derived keys are orphaned — one re-sign-in
   on any already-signed-in device.
8. **syncedAt stamped from the DB clock** (`2a41269`) — `pushTasks` used
   `new Date()` (app-server clock) while `pullTasks` hands out cursors from
   Postgres `now()`. Skew between the clocks could permanently hide a row
   from the next pull (JS behind PG) and flaked the since-boundary test
   ~1 in 4 (JS ahead). Both sides now use `sql\`now()\`` — 8 consecutive
   clean test runs.

## Test/e2e impact

- Flows 18 + 23 re-run individually against the batch APK: both green.
- Flow 53 green after the .env supabase-URL fix + rebuild.
- Flow 52 green after the storageKey pin (OTA republished first — the
  mid-flow relaunch boots the downloaded OTA bundle, so BOTH bundles need
  the pin).
- With those, every flow in the suite is accounted for green (the 29
  batch-passes + the 4 individually re-verified).
- Known flake unchanged: first maestro attempt after a fresh install can die
  with "Device localhost:5555 was requested" — retry once.
- Residual quirk (documented, not fixed): an e2e mid-flow relaunch without
  clearState may boot the freshly-downloaded OTA bundle, whose EAS-env bakes
  (tailnet URLs, no OTA_UI gate) differ from the local APK. Deeper fix would
  be `updates.checkAutomatically: "NEVER"` + JS-triggered checks — a phone
  UX trade-off left as the owner's call.
