# Story 8.1: Push Notifications

Status: done
Date: 2026-07-16
Mode: Wave-based autonomous run — LOCAL MODE (see decisions-log 2026-07-16): **local scheduled notifications via `expo-notifications` only. No EAS, no FCM, no remote push, no server code.** The scheduling seam is designed so a remote path can be added later without reworking callers.

## Story

As a user, I want to receive helpful notifications about deadlines and task engagement, so that I stay on track without feeling nagged or guilty.

FRs: 53, 54, 55, 56 · NFR: anti-nagging philosophy (PRD "Push Notification Strategy")

## Acceptance Criteria

1. A pending/in_progress task with a future deadline gets a local deadline-urgency notification scheduled at `deadline − 24h` (if that moment is already past but the deadline is still >2h away, schedule at `now + 30min` instead). Copy is factual and actionable, never guilt-framed.
2. When challenge invitations are enabled, one upcoming challenge notification ("Got 5 minutes? There's a task waiting in your deck.") is scheduled at the next cadence slot (12:00 local; cadence daily / every 3 days / weekly) — only when at least one pending task exists.
3. No notification anywhere in the catalogue is guilt-inducing (no "you haven't opened the app", no task counts, no "overdue"). All copy comes from a single fixed catalogue module — nothing composes guilt text dynamically.
4. Settings screen (new, opened from the existing top-bar settings icon) has a Notifications section: "Deadline reminders" toggle (default ON) and "Challenge invitations" toggle + frequency select (default OFF / weekly). Changes persist across app restarts.
5. First enable triggers the system permission request (Android 13+ runtime `POST_NOTIFICATIONS`). If denied, the app continues working normally; the section shows a calm banner explaining notifications are off with an "Open system settings" action (`Linking.openSettings()`). Preferences remain editable; scheduling is simply a no-op until permission is granted.
6. Scheduled notifications resync automatically: on app start, on app foreground, and whenever tasks or preferences change (reactive live-query trigger — no per-callsite wiring). Completed/cut-loose tasks' deadline notifications are cancelled on next resync.
7. Tapping a delivered notification opens the app (home) and emits `notification_opened`.

## Implementation Plan

**New dependency:** `expo-notifications` (`npx expo install expo-notifications`), plus its config plugin in `apps/mobile/app.json` `plugins`. Requires prebuild — `bun run test:e2e:fresh` covers it. Re-run `bun run lint:check` + `typecheck` LAST (expo install rewrites package.json). expo-notifications' manifest ships the boot receiver (`RECEIVE_BOOT_COMPLETED`) so scheduled notifications survive reboots; app-open resync is the safety net.

**Preferences storage — new local table (generic KV, designed for reuse by Story 3.1's context persistence):**
- `packages/shared/src/schema-local/preferences.ts` — `preferences` sqliteTable: `key` text PK, `value` text NOT NULL (JSON-encoded), `updatedAt` integer timestamp_ms. Export from `packages/shared/src/schema-local/index.ts`.
- Migration: `bunx drizzle-kit generate` in `apps/mobile` → new `apps/mobile/drizzle/0002_*.sql` + regenerated `migrations.js`/`meta`. Jest picks it up automatically via `loadLocalMigrationsSql` (`src/test-utils/migrations.ts`). Register the table in `src/lib/local-db.ts` drizzle schema.
- `apps/mobile/src/services/preferences-repository.ts` — repository pattern (db injected as first arg, like `tasks-repository.ts`): `getPreference<T>(db, key): Promise<T | null>`, `setPreference<T>(db, key, value): Promise<void>` (upsert). JSON parse tolerant of malformed values (return null).

**Notification domain (`apps/mobile/src/services/notifications/`):**
- `notification-prefs.ts` — `NotificationPrefs = { deadlineUrgency: boolean; challenges: 'off' | 'daily' | 'every_3_days' | 'weekly' }`, `DEFAULT_NOTIFICATION_PREFS = { deadlineUrgency: true, challenges: 'off' }`, preference key constant, typed read/write helpers over the preferences repository.
- `notification-copy.ts` — the fixed copy catalogue (AC3): deadline title/body builders (task title in the notification body is fine — it renders on the user's own device and is never transmitted; NFR-S3 applies to analytics/logs only) and the challenge invitation strings.
- `notification-planner.ts` — PURE: `planNotifications(tasks: TaskData[], prefs: NotificationPrefs, now: Date): PlannedNotification[]` where `PlannedNotification = { key: string; title: string; body: string; fireAt: Date; type: 'deadline_urgency' | 'challenge' }`. Deadline rule per AC1, stable key `deadline:{taskId}:{deadlineMs}`; challenge rule per AC2, key `challenge:{yyyy-mm-dd}`. Thresholds (`24h`, `2h`, `30min`, `12:00`) are exported constants.
- `notification-diff.ts` — PURE: `diffScheduled(desired, existingKeys)` → `{ toCancel: string[]; toSchedule: PlannedNotification[] }` (match on the `key` stored in notification `content.data.key`).
- `notification-scheduler.ts` — thin impure layer: `resyncNotifications(db)` reads tasks + prefs, checks `Notifications.getPermissionsAsync()` (no-op unless granted), calls planner + diff against `getAllScheduledNotificationsAsync()`, then `cancelScheduledNotificationAsync` / `scheduleNotificationAsync` (DATE trigger). Also `setupNotifications()`: `setNotificationChannelAsync('default', …)` (Android 8+) and `setNotificationHandler` (show banner while foregrounded). Keep it dumb — all logic lives in the pure modules.

**Reactive resync (AC6):** `apps/mobile/src/hooks/use-notification-resync.ts` — mounted once in `src/app/_layout.tsx` inside `MigrationGate`: `useLiveQuery` over tasks + preferences (the existing `enableChangeListener` makes this fire on every mutation from ANY epic's code — no cross-epic wiring); debounce ~1s, then fire-and-forget `resyncNotifications(db)`. Plus an `AppState` 'active' listener (catches time passage). Also add the `Notifications.addNotificationResponseReceivedListener` here → `track('notification_opened', { type })` (AC7).

**Settings UI:**
- `apps/mobile/src/app/settings.tsx` — new route, same pattern as `task-list.tsx` (full-screen push, back arrow, `headerShown: false` stack).
- `apps/mobile/src/components/settings/settings-view.tsx` — screen scaffold (heading "Settings", sections stack). Future stories (5.2 account, 8.2 premium) add sections here — keep it a simple composition point.
- `apps/mobile/src/components/settings/notification-preferences-section.tsx` — permission banner + the two prefs (gluestack `Switch` via `npx gluestack-ui add switch`, `Select` or simple segmented pressables for cadence). Writing a pref: `setPreference` (fire-and-forget like `applyTaskPatch`) + `track`. First enable when permission is `undetermined` → `requestPermissionsAsync()` → `track('notification_permission_resolved', { granted })`.
- Wire the top bar: `top-bar.tsx` settings icon is currently an inert placeholder — add `onSettingsPress` prop (same shape as `onListPress`); `src/app/index.tsx` pushes `/settings`, **guarded while the card-back overlay is open** (same 1.5 landmine guard the list icon uses — pushed routes don't unmount the overlay's BackHandler).

## Analytics (track() seam — add to `src/lib/analytics/events.ts`)

- `notification_pref_changed: { pref: 'deadline_urgency' | 'challenges'; value: string }` — value is the new setting ('true'/'false' or cadence), never task content.
- `notification_permission_resolved: { granted: boolean }`
- `notification_opened: { type: 'deadline_urgency' | 'challenge' }`
No event for each scheduled notification (hot-path noise). Screen view of settings = PostHog built-in, no domain event.

## Testing Plan

- **Unit (pure logic):** `notification-planner.test.ts` — deadline at T-24h; past-window fallback (now+30min); <2h → nothing; no deadline / completed / cut_loose → nothing; prefs off → nothing; challenge cadence slots incl. no-pending-tasks case; stable keys. `notification-diff.test.ts` — cancel/schedule/keep partitioning.
- **Integration (createTestDb + real migration SQL):** `preferences-repository.test.ts` — set/get roundtrip, upsert overwrites, malformed JSON → null, unknown key → null. Proves the 0002 migration wiring for free.
- **Storybook (co-located CSF stories + automatic portable-stories crash tests):** `settings-view.stories.tsx`, `notification-preferences-section.stories.tsx` (states: permission granted / denied-banner / defaults / challenges-on-with-cadence). Run `bun run storybook:generate` and commit `storybook.requires.ts`.
- **Maestro E2E:** `.maestro/30-story-8-1-notification-settings.yaml` (renumber to slot after the highest existing flow at implementation time). Flow: `runFlow common/launch-app.yaml` → tap 'Open settings' → assert 'Notifications' + 'Deadline reminders' → toggle 'Challenge invitations' on → handle system permission dialog (`tapOn: 'Allow'` with `optional: true` — `clearState`/reinstall makes the dialog deterministic on fresh installs, but tolerate its absence) → `takeScreenshot: 8-1-notification-settings` → relaunch WITHOUT clearState (`launchApp` plain) → reopen settings → assert challenge toggle still on (AC4 persistence). Do NOT try to assert the notification shade — scheduling correctness is covered by the unit/integration layers.
- Gates last: `bun run lint:check` && `bun run typecheck` && `bun run test`.

## UX Notes

- Barebones-functional pass: gluestack defaults, no theming. Section heading "Notifications"; rows ≥44pt touch targets; `accessibilityLabel`s on switches ("Deadline reminders, on").
- Copy tone (ADHD-first, from PRD/UX): factual, inviting, zero guilt. Deadline: title `"<task title>" is due tomorrow`, body `Open it when you're ready — one step at a time.` Challenge: title `Got a quick 5 minutes?`, body `There's a task in your deck when you're ready.` Denied-permission banner: `Notifications are off. You can enable them any time in system settings.` — never framed as a loss.
- Settings screen is a plain push (UX: simple push/pop, no custom transitions); hardware back just works (route screen — no BackHandler needed, per 1.5 learning).

## Dependencies

- **Depends on:** nothing outside Epic 1 + 2.1 (all done): tasks schema already has `deadline`; top bar + routes exist. **Early-parallel candidate — independent of Epics 2.2–7.**
- **Scheduling conflicts to watch:** (a) any parallel story generating a drizzle migration (`apps/mobile/drizzle/*` is sequential — 3.1 context persistence, 4.1 star transactions, 6.1) — coordinate ordering; 3.1 should REUSE this `preferences` KV table rather than adding its own. (b) `settings-view.tsx` will be touched by 5.2 (account) and 8.2 (premium row) — keep sections as separate components to minimize conflicts. (c) `_layout.tsx`, `index.tsx`, `top-bar.tsx`, `events.ts` are shared hot files.
- No UI sets deadlines yet (card-back deadline is display-only until Epic 6 triage) — deadline-path E2E is impossible; unit/integration cover it. Do not add a deadline editor here.

## Out of Scope

- Remote push (FCM/EAS), push tokens, server `routers/notification.ts` — deferred; the planner/scheduler seam is the future insertion point (a remote sender consumes the same `PlannedNotification` output).
- Celebration/streak notifications (Epic 4 territory), welcome-back absence detection (7.3).
- Notification settings for quiet hours / per-task muting — post-MVP.
- iOS anything.
