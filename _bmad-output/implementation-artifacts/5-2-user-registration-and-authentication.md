# Story 5.2: User Registration & Authentication

Status: ready-for-dev
Date: 2026-07-16
Mode: wave-based autonomous run (spec written up front; implementer reads ONLY this + CLAUDE.md + code)

## Story

As a user, I want to create an account and log in, So that my tasks are associated with me and can sync across devices (FR57, FR59 · NFR-S1, S2).

## Local-mode strategy (verified against the running stack)

Auth = the **local Supabase stack's GoTrue** at `http://127.0.0.1:54321` (emulator: `http://10.0.2.2:54321`). Facts verified live on this machine (CLI 2.109.1, stack running):

- Signup returns a session immediately (`enable_confirmations = false` in `supabase/config.toml`).
- Access tokens are **ES256-signed** with `kid` matching the local JWKS at `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json` — so the production JWKS/`jose` verification path works IDENTICALLY against the local stack. No HS256 fallback, no `SUPABASE_JWT_SECRET` (the architecture forbids it anyway).
- Token claims: `iss: "http://127.0.0.1:54321/auth/v1"`, `aud: "authenticated"`, `sub: <user uuid>`.
- Anon key (publicly-known local demo constant, safe to hardcode as fallback): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0` (re-check with `supabase status` if the stack was recreated).
- **Google OAuth is OUT of local mode**: no Google client IDs exist on this machine, and the native `@react-native-google-signin/google-signin` flow needs real web+Android client IDs plus a config-plugin research spike. Deviation recorded: email/password ships now; the Google path keeps a clean seam (see Out of Scope) and its epics AC is deferred until credentials exist.

## Acceptance Criteria

1. Signed-out users reach auth from the settings screen: TopBar settings icon (currently a dead placeholder) opens `/settings`; its account section offers "Sign in" and "Create account" → `/(auth)/login` and `/(auth)/signup`.
2. Signup with email/password against local GoTrue creates the account and signs in immediately; the session (JWT) is persisted via a custom `SupportedStorage` adapter over **expo-secure-store** (NFR-S1 — not AsyncStorage).
3. Login with valid credentials authenticates and persists the session; settings then shows the signed-in email and a "Sign out" action; session survives app restart (secure-store persistence + `autoRefreshToken`).
4. Authenticated tRPC requests carry `Authorization: Bearer <jwt>` via the `httpBatchLink` `headers` callback; the header is **omitted entirely when there is no session** (local-only free tier). A protected `whoAmI` tRPC query returns `{ userId }` (= JWT `sub`).
5. Server verifies JWTs in **tRPC middleware** (not a Fastify hook) via `jose` — `createRemoteJWKSet` + `jwtVerify` against `SUPABASE_JWKS_URL`, checking issuer + audience `authenticated`, caching keys. `protectedProcedure = publicProcedure.use(authMiddleware)` throws `UNAUTHORIZED` on missing/invalid tokens; `publicProcedure` (incl. `health`) stays public.
6. Signed out, ALL existing features work unchanged (local-only mode — no login wall, no redirect on launch).
7. Invalid credentials → **inline** error near the form (no modal), fields preserved, retry possible.
8. Network failure during signup/login (stack unreachable) → inline message explaining the issue and suggesting retry.
9. Auth-aware gating is real, not a no-op: with a session, navigating to `/(auth)/*` redirects away (`<Redirect />` in the group layout); signing out from settings lands you back in the signed-out settings state.
10. Maestro E2E covers signup, login, and the invalid-credential inline error (mandatory E2E rule).
11. Screens use NativeWind `className` exclusively (prior-run regression: auth screens used StyleSheet.create).

## Implementation Plan

**Deps** — mobile: `npx expo install expo-secure-store`; `bun add @supabase/supabase-js@^2.107.0`. Server: `bun add jose` (^6). Re-run `lint:check`/`typecheck` LAST (expo CLI rewrites configs).

### Mobile

- **`src/lib/secure-store.ts`** (new): `SupportedStorage` adapter — `getItem/setItem/removeItem` over `expo-secure-store` (async API). Note: SecureStore warns >2048 bytes per value; the Supabase session (~2–4KB) still stores on modern Android — E2E's restart-persistence check is the proof. If writes actually fail on-device, chunk values (split/join) inside the adapter.
- **`src/lib/supabase.ts`** (new): `getSupabaseUrl()` (mirror `getApiBaseUrl` from 5.1: `EXPO_PUBLIC_SUPABASE_URL` override, else android → `http://10.0.2.2:54321`, else `http://127.0.0.1:54321`); anon key from `EXPO_PUBLIC_SUPABASE_ANON_KEY` with the local demo constant as fallback. `createClient(url, key, { auth: { storage: secureStoreAdapter, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`. Register the RN `AppState` listener toggling `supabase.auth.startAutoRefresh()/stopAutoRefresh()` (Supabase RN pattern).
- **`src/components/auth/auth-provider.tsx`** (new): context `{ session, isLoading, signInWithEmail, signUpWithEmail, signOut }` + `useAuth()`. Init via `supabase.auth.getSession()`, subscribe `onAuthStateChange` (unsubscribe on unmount). Sign-in/up/out methods wrap supabase calls, map errors to user-safe message strings, and emit analytics (below) only on success.
- **`src/components/auth/auth-form.tsx`** (new): PRESENTATIONAL — props `{ mode: 'login' | 'signup', onSubmit(email, password), isSubmitting, errorMessage }`. Email + password inputs (gluestack `Input`/`InputField` — use `aria-label`, the 1.2 learning), inline error `Text` under the fields, primary submit ("Sign in"/"Create account"), client-side guard (both fields non-empty, min 6 chars password to match `minimum_password_length`). Wrap in `KeyboardAvoidingView behavior="padding"` (RN 0.85 edge-to-edge learning).
- **Routes**: `src/app/(auth)/_layout.tsx` — `if (session) return <Redirect href="/settings" />` else `<Stack screenOptions={{ headerShown: false }} />` (AC-9). `(auth)/login.tsx` and `(auth)/signup.tsx` — thin: back arrow (match list/detail header pattern), `AuthForm` wired to `useAuth`, cross-link ("No account? Create one" / "Already have an account? Sign in"). Loading state from the mutation promise; network vs credential errors distinguished by supabase error (map `AuthApiError` invalid-credentials → "Email or password didn't match — try again"; fetch/network failure → "Couldn't reach the server — check your connection and retry").
- **`src/app/settings.tsx`** (new): minimal settings screen (route pattern of `task-list.tsx`: back arrow, title "Settings"). Account section: signed out → "Sign in" + "Create account" buttons; signed in → email (`accessibilityLabel="Signed in as <email>"`) + "Sign out". Other settings content = none yet (Epic 8).
- **Wiring**: `top-bar.tsx` gains `onSettingsPress` prop; home `index.tsx` passes `router.push('/settings')` — guard with the same overlay-open inertness rule as the list icon (1.5 landmine: pushed routes don't unmount screens beneath; keep triggers inert while the card-back overlay is open, once-per-focus re-arm per 2.1).
- **`src/app/_layout.tsx`**: `AuthProvider` wraps OUTSIDE `TrpcProvider` (load-bearing order — JWT available to the headers callback).
- **`src/lib/trpc.tsx`**: `httpBatchLink` gains `headers: async () => { const { data } = await supabase.auth.getSession(); return data.session ? { authorization: \`Bearer ${data.session.access_token}\` } : {}; }` (reads supabase directly, not React state — no provider-order race).
- **`.env.example`**: add `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### Server

- **`src/lib/env.ts`**: add `SUPABASE_JWKS_URL` (default `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`) and `SUPABASE_JWT_ISSUER` (default `http://127.0.0.1:54321/auth/v1`). Update `.env.example`.
- **`src/middleware/auth.ts`** (new): `createJwtVerifier(env)` → one module-instance `createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL))` (jose caches keys + cooldown internally); `verify(token)` = `jwtVerify(token, jwks, { issuer: env.SUPABASE_JWT_ISSUER, audience: 'authenticated' })` → `{ userId: payload.sub }`; any failure → null.
- **`src/trpc.ts`**: context gains `verifyJwt` + the raw `req` (Authorization header). `authMiddleware`: parse `Bearer <token>` (malformed/missing → `TRPCError UNAUTHORIZED`), verify, put `userId` on ctx. `export const protectedProcedure = publicProcedure.use(authMiddleware)` — downstream ctx narrows to `{ userId: string }`.
- **`src/routers/index.ts`**: add `whoAmI: protectedProcedure.query(({ ctx }) => ({ userId: ctx.userId }))`. (Root-level procedure; the four named routers stay `sync/ai/notification/subscription` per architecture.)

## Analytics (events.ts additions)

- `auth_signed_up: { method: 'email' }`
- `auth_signed_in: { method: 'email' }`
- `auth_signed_out: Record<string, never>`

Emitted in `auth-provider` on SUCCESSFUL transitions only (change-gated like task_edited). Never include email or any identifier in props (NFR-S3). PostHog `identify()` is a built-in, not a domain event — deferred to 8.3 with the live key.

## Testing Plan

- **Server integration** (real JWTs per CLAUDE.md — no mocked verification):
  - `src/test-utils/auth.ts` (new): `createTestUser()` → POST `${SUPABASE_URL}/auth/v1/signup` with the anon key and a unique email (`e2e-${crypto.randomUUID()}@test.local`) → returns `{ userId, accessToken }`. Prereq: local stack running.
  - `src/middleware/auth.test.ts` / `routers/index.test.ts`: `app.inject GET /trpc/whoAmI` with real Bearer → 200, `userId` equals the GoTrue user id; no header → tRPC UNAUTHORIZED (HTTP 401); tampered token (flip a payload char) → UNAUTHORIZED; token signed by a locally-generated ES256 key (jose `generateKeyPair` + `SignJWT`, correct iss/aud) → UNAUTHORIZED (proves signature actually checked against JWKS, not just decoded).
- **Mobile portable stories** (`auth-form.stories.tsx`): login default, signup, submitting, inline-error states — auto crash-free tests; plus behavior tests in `auth-form.test.tsx` (RNTL v14, await every render/fireEvent): typing + submit calls `onSubmit` with the values; empty-field guard blocks submit; `errorMessage` renders inline. **Do NOT test a mocked `useAuth`** (prior-run regression) — provider logic is thin supabase glue, proven by E2E.
- **Maestro E2E** — `.maestro/52-story-5-2-auth.yaml` (PREREQ header: supabase stack + `bun run server:dev`):
  1. Launch clean → 'Add task' visible (AC-6: signed-out core features live).
  2. `evalScript` unique creds: `${output.email = 'e2e-' + Date.now() + '@test.local'}`.
  3. Settings → Create account → fill form → submit → back on settings, `Signed in as ${output.email}` visible → **`takeScreenshot: .maestro/screenshots/5-2-signed-in`**.
  4. Sign out → signed-out settings state.
  5. Sign in with wrong password → inline error visible, still on login (AC-7).
  6. Sign in with correct creds → signed-in settings again (AC-3).
  7. (Session persistence across restart: `launchApp` WITHOUT `clearState` → still signed in.)
- Gates: `lint:check`, `typecheck`, `test` (mobile + server), `storybook:generate` committed.

## UX Notes

- Barebones-functional: gluestack defaults, no polish. Inline errors near source, retry always visible, NO modal dialogs for errors (UX feedback patterns). No-guilt copy: errors are matter-of-fact, never blaming.
- Auth screens are full-screen pushed routes matching the `task-list.tsx` header pattern (back arrow left, title). Portrait, safe-area respected, keyboard must not cover the submit button (KAV padding).
- Settings screen is deliberately sparse — account section only; it will grow in Epic 8.

## Dependencies

- **5.0** (server, protectedProcedure host) and **5.1** (tRPC client + headers callback slot, cleartext HTTP for release APK) merged.
- Local Supabase stack running (auth + JWKS); E2E additionally needs the API server.

## Out of Scope

- **Google sign-in** (and Apple): requires real client IDs + `@react-native-google-signin/google-signin` config-plugin spike — impossible in local mode. Seam kept clean: `signInWithEmail` lives beside a future `signInWithGoogle` in the provider; when credentials exist, wire native google-signin → `supabase.auth.signInWithIdToken({ provider: 'google', token })` (NEVER `signInWithOAuth(... skipBrowserRedirect: true)` — doesn't complete on-device). Record as deviation in the story file on completion.
- Password reset / email flows (local Mailpit exists at :54324 but deferred), account deletion.
- `@fastify/rate-limit` (deferred per architecture), PostHog identify (8.3), any sync behaviour (5.3).
