---
stepsCompleted: [1, 2]
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# one-down--expo-bmad - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for One Down, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Task Capture (FR1–FR5)**
- FR1: User can enter free-text brain dump to capture multiple tasks at once
- FR2: System can parse brain dump text and extract individual tasks using AI
- FR3: User can add a single task via quick-add input
- FR4: System can infer deadlines, task size, and context requirements from natural language (with confidence thresholds)
- FR5: User can manually add or edit context requirements on a task (home, office, laptop, phone, internet, errand)

**Task Card Stack (FR6–FR12)**
- FR6: User can view a curated stack of actionable tasks as cards
- FR7: System can curate the card stack based on current context selection and calculated importance/urgency
- FR8: User can tap a card to flip it and see details, notes, and task start button
- FR9: User can flick/swipe through the card stack to browse alternatives
- FR10: User can see task size indicators on cards (quick win vs. big time)
- FR11: User can see visual reward indicators on cards reflecting potential star value (more urgent/larger = more reward)
- FR12: User can see a "check needed" indicator on cards that need confirmation of AI-inferred info

**Context Selection (FR13–FR18)**
- FR13: User can select current context (location and available resources) to filter the stack
- FR14: System can filter tasks to show only those actionable in current context
- FR15: User can see a visual indicator when other contexts have urgent tasks
- FR16: User can switch contexts and see the stack update in real-time
- FR17: System can display empty context state with message prompting user to check other contexts
- FR18: User can see greyed-out context options when those contexts have no actionable tasks

**Task Execution (FR19–FR25)**
- FR19: User can start a task (card expands to task running screen, task gets "started" status)
- FR20: User can continue a previously started task (card shows "Continue" instead of "Start")
- FR21: User can view task details and any notes on the task running screen
- FR22: User can add notes to a task during execution
- FR23: User can request AI breakdown help from task details or task running screen
- FR24: User can mark a task as complete
- FR25: System can display satisfying completion feedback (animation, stars)

**Task Management (FR26–FR33)**
- FR26: User can edit task title, description, deadline, and context requirements
- FR27: User can swipe past a task in the card stack to see other options (implicit skip/defer)
- FR28: User can "cut loose" a task (remove without guilt)
- FR29: System can display celebratory animation when user cuts a task loose
- FR30: User can view a task overview list (all tasks, not just curated stack)
- FR31: User can bulk-select tasks in overview for archive (via multi-select mode); permanent delete is only available from the archive/recycle bin as a further action
- FR32: System can identify and flag stale or avoided tasks (long-running without action OR frequently swiped past)
- FR33: System can prompt user about stale or avoided tasks (keep, cut loose, or break down)

**Quick Wins / Big Time Modes (FR34–FR36)**
- FR34: User can toggle between Quick Wins mode and Big Time mode; pressing the active mode again toggles it off (both types show in the stack)
- FR35: System can filter the stack to show only tasks assigned as small/quick win size (AI-auto assigned, then human-reviewed in triage/curation)
- FR36: System can filter the stack to show only tasks assigned as big time size (AI-auto assigned, then human-reviewed in triage/curation)

**AI Task Intelligence (FR37–FR42)**
- FR37: System can prompt user for missing deadline information when detecting time-sensitivity
- FR38: System can prompt user to confirm AI-inferred critical information (deadlines, due dates)
- FR39: System can suggest micro-tasks (smallest first step) for frequently skipped tasks
- FR40: System can break down large tasks into smaller subtasks using AI — default is generating just the first few steps to get started, with option to generate full list
- FR41: User can accept or reject AI-suggested task breakdowns
- FR42: User can revise AI task breakdown via a dedicated feedback input ("why this misses the mark"); AI distils useful info into the task notes and retries the breakdown

**Rewards & Motivation (FR43–FR49)**
- FR43: User can earn stars for completing tasks
- FR44: User can earn more stars for completing relatively more urgent tasks from the list
- FR45: User can earn more stars for completing larger tasks
- FR46: User can earn bonus stars for completing tasks further before their deadline (up to a limit)
- FR47: User can earn small rewards for confirming AI-inferred info or adding identified missing info
- FR48: User can see accumulated stars count (grand total + daily amount displayed together)
- FR49: User can tap star count to open star activity log (chronological list of all star transactions with today/all-time filter); completed tasks appear as a dedicated section at the top of the full task list view (scroll position on entry shows a couple of done tasks, user can scroll up to see more)

**Return Experience (FR50–FR52)**
- FR50: System can present gentle welcome-back summary after absence (no guilt)
- FR51: User can see what happened while away (deadlines passed, stale tasks) and enter triage mode for fast keep/cut/defer decisions
- FR52: System can present first card as an achievable quick win after absence

**Push Notifications (FR53–FR56)**
- FR53: User can receive deadline urgency notifications when tasks become time-critical
- FR54: User can receive challenge/novelty notifications inviting engagement
- FR55: User can configure notification preferences (types, frequency)
- FR56: System will not send guilt-inducing reminder notifications

**Account & Subscription (FR57–FR61)**
- FR57: User can create an account
- FR58: User can subscribe to premium via in-app purchase
- FR59: User can use core features on free tier
- FR60: User can access premium features when subscribed
- FR61: User can tap a premium discovery icon (sparkle) to view premium features page

**Data & Sync (FR62–FR65)**
- FR62: User can have tasks synced across devices
- FR63: User can view tasks offline (core viewing capability)
- FR64: User can create tasks manually offline (basic entry without AI parsing)
- FR65: System can gracefully degrade AI features when offline

### NonFunctional Requirements

**Performance**
- NFR-P1: Animations maintain 50+ FPS on devices from 2020 (e.g. Pixel 5)
- NFR-P2: Cold start to usable state in <2 seconds (target), <‍3 seconds (acceptable)
- NFR-P3: AI parsing/breakdown responds within 3 seconds (target <2s); loading indicator fades in after 1s, "taking a bit longer" message after 4s
- NFR-P4: Card interactions (flip, flick, complete) feel instant (<100ms response)

**Accessibility**
- NFR-A1: Core flows designed following WCAG AA patterns
- NFR-A2: UI components support screen readers structurally (TalkBack for Android MVP; VoiceOver post-MVP)
- NFR-A3: Reduced motion mode available (deferred to post-MVP)
- NFR-A4: ADHD-first design patterns throughout (low cognitive load, clear focus, minimal distractions)

**Reliability**
- NFR-R1: Core task viewing works offline
- NFR-R2: Manual task creation works offline (basic entry without AI)
- NFR-R3: AI features gracefully degrade when offline (clear feedback, no silent failure)
- NFR-R4: Sync conflicts resolved by last-content-changed wins
- NFR-R5: Data sync completes within 5 seconds of connection restoration

**Security**
- NFR-S1: User credentials stored securely (device keychain / secure storage)
- NFR-S2: API communications use TLS 1.2+
- NFR-S3: No sensitive task content logged or transmitted to analytics

**Scalability**
- NFR-SC1: Architecture supports 25k MAU without major redesign

**Logging & Traceability**
- NFR-L1: Basic logging and traceability in both app client and server side for MVP; build out more thorough logging in v0.2+

### Additional Requirements

**Starter Template & Project Scaffold**
- Architecture specifies Expo SDK 55 default template: `bun create expo-app one-down --template default@sdk-55` — impacts Epic 1 Story 1
- Backend: Manual Fastify + TypeScript scaffold with Bun
- Monorepo: Bun workspaces (apps/mobile, apps/server, packages/shared)

**Core Technology Stack**
- API: tRPC with Fastify adapter (`@trpc/server/adapters/fastify`), end-to-end type safety
- Auth: Supabase Auth (email/password + Google OAuth), JWT verification via tRPC middleware
- State: Zustand for UI state, TanStack Query via tRPC for server state
- Local DB: expo-sqlite + Drizzle ORM (client-side)
- Server DB: PostgreSQL + Drizzle ORM (server-side) on Railway
- Shared schemas: packages/shared with Drizzle schema + Zod validation (drizzle-zod) + TypeScript types
- Sync: Custom timestamp-based sync layer ("last-content-changed wins")
- AI: Gemini Flash via @google/generative-ai SDK, centralized AI service exposed via tRPC
- Analytics: PostHog React Native SDK (client) + posthog-node + posthog-trpc middleware (server)
- Billing: RevenueCat for Google Play subscription management

**Tooling & Process**
- Linting: Oxlint + Prettier (Oxfmt) with enforcement rules
- Testing: Jest + react-native-testing-library (unit/integration), Maestro (E2E)
- CI/CD: EAS Build (mobile), Railway auto-deploy (API), GitHub Actions (CI)
- IDs: crypto.randomUUID() for both client and server (client-generated UUIDs are permanent)
- Dates: ISO 8601 strings, date-fns for formatting
- Token storage: expo-secure-store
- Push notifications: FCM via Expo Notifications (Android MVP)
- Logging: PostHog for deployed analytics, pino for server ops, console stripped from production builds

**Implementation Sequence (offline-first order from Architecture)**
1. Monorepo scaffold (Bun workspaces, Expo + Fastify)
2. Drizzle schemas (shared types in packages/shared)
3. Local database (expo-sqlite + Drizzle client)
4. UI component foundation (gluestack-ui v3)
5. Core features against local DB (task CRUD, curation, stars)
6. tRPC router + Fastify server
7. Supabase Auth integration
8. Custom sync layer
9. AI integration service
10. PostHog integration

### UX Design Requirements

- UX-DR1: Use gluestack-ui v3 (copy-paste model) — only install components as needed per story, not the full set. Full available component reference at `docs/gluestack-ui-v3-components.md`. Install via `npx gluestack-ui add <component>`
- UX-DR2: Build TaskCard component — front (title, size tag, context badges, check-needed indicator, deadline indicator, star value) and back (details, notes, Start/Cut Loose/inline edit) as single component with mode prop
- UX-DR3: Build CardStack component — swipeable deck using react-native-gesture-handler + Reanimated 4 worklets (useSharedValue, useAnimatedStyle), top card interactive with 1-2 cards peeking behind, loaded/empty/single-card states
- UX-DR4: Build ContextToggleBar — icon buttons for Home, Out & About, Phone, Laptop, Internet with active/inactive/disabled states, multi-select, last-used persisted via Zustand
- UX-DR5: Build ModeToggle — Quick Wins / Big Time segmented control, one active at a time, triggers stack re-curation
- UX-DR6: Build TaskRunningScreen — expanded view with task title, subtask list, editable notes, Done button, "Help me with this" button, Cut Loose button
- UX-DR7: Build SubtaskList — AI-generated steps with tickboxes and delete buttons, star rewards on completion, star reversal on delete, regenerate with feedback input
- UX-DR8: Build TriageCard — extends TaskCard with AI prompt UI, blueprint aesthetic (lighter background, dashed border), inline answer inputs (text, date picker, toggles)
- UX-DR9: Build StarCounter — persistent star icon + count number, tappable to open StarActivityLog, increment highlighting on award, accessibilityLiveRegion="polite"
- UX-DR10: Build StarActivityLog — chronological list of star transactions (timestamp, action type, task name, star amount +/-)
- UX-DR11: Build WelcomeBackSummary — factual absence summary screen (deadlines passed, tasks waiting, suggestions to cut loose), two CTAs ("Let's see what's up" and "Go to main deck")
- UX-DR12: Build BrainDumpInput — large textarea with placeholder ("What's on your mind?"), submit button, loading state while AI parses with spinner + "Parsing your tasks..." text
- UX-DR13: Build EmptyState component — contextual messages for per-context empty, globally empty (brain dump CTA), triage empty (greyed button with "All done!" stamp)
- UX-DR14: Build TaskListView — full scrolling list with active tasks (completed tasks section at top) and recycle bin tabs, bulk actions via multi-select (long-press/checkbox), permanent delete with keep/retract stars toggle confirmation. Grouping/sorting deferred to v0.2+
- UX-DR15: No bottom tab bar. Top bar layout: task list icon (top left), star box (top second-to-left), settings icon (top right). Floating add button in bottom right corner. Persistent across card view and task running screens
- UX-DR16: (merged into UX-DR15)
- UX-DR17: Implement inline editing with auto-save — tap text on card back to edit in place, instantaneous save to local storage, no explicit save button
- UX-DR18: Implement WCAG 2.1 AA accessibility — minimum 44x44pt touch targets, accessibilityLabel/Role/State on all interactive elements, 4.5:1 contrast for text, 3:1 for UI, reduce motion checks via AccessibilityInfo.isReduceMotionEnabled
- UX-DR19: Implement TalkBack screen reader support — logical focus order (top bar → context toggles → current card → tab bar), descriptive semantic labels ("Complete task: Buy groceries" not "Done button"), state change announcements
- UX-DR20: Implement loading state patterns — AI parsing spinner (replaces submit button), subtask generation spinner (in subtask area), skeleton cards for stack loading (<1s local, <3s AI), splash screen (<2s target)
- UX-DR21: Implement feedback patterns — star increment toast, star reversal toast, acknowledgment toasts ("Released", "Saved" ~2s), AI processing indicator, inline error messages (no modal dialogs for errors), retry always visible
- UX-DR22: Implement empty state patterns for all screens — global empty guides to brain dump, context empty suggests other contexts, triage empty shows greyed button, task list empty guides to brain dump
- UX-DR23: NativeWind/Tailwind CSS styling throughout — utility-first, flexbox/percentage-based layouts, safe area insets, consistent horizontal padding
- UX-DR24: Portrait-only orientation for MVP, standard phone sizes (320pt–430pt width)
- UX-DR25: Reanimated 4 Babel config — react-native-worklets/plugin must be listed last in babel.config.js; always reference Reanimated 4 docs to avoid deprecated v2/v3 patterns

### FR Coverage Map

| FR | Epic | Brief Description |
|----|------|-------------------|
| FR1 | 6 | Brain dump free-text capture |
| FR2 | 6 | AI parses brain dump into tasks |
| FR3 | 1 | Quick-add single task |
| FR4 | 6 | AI infers deadlines, size, context |
| FR5 | 1 | Manual context editing |
| FR6 | 1 | View curated card stack |
| FR7 | 3 | Stack curation algorithm |
| FR8 | 1 | Tap card to flip |
| FR9 | 1 | Swipe through stack |
| FR10 | 1 | Size indicators on cards |
| FR11 | 3 | Star value indicators on cards |
| FR12 | 6 | Check-needed indicator |
| FR13 | 3 | Context selection |
| FR14 | 3 | Filter by context |
| FR15 | 3 | Urgent tasks in other contexts indicator |
| FR16 | 3 | Real-time context switch |
| FR17 | 3 | Empty context guidance |
| FR18 | 3 | Greyed-out empty contexts |
| FR19 | 2 | Start a task |
| FR20 | 2 | Continue in-progress task |
| FR21 | 2 | View task details on running screen |
| FR22 | 2 | Add notes during execution |
| FR23 | 6 | Request AI breakdown from running screen |
| FR24 | 2 | Mark task complete |
| FR25 | 2 | Completion feedback (animation, stars placeholder) |
| FR26 | 1 | Edit task properties |
| FR27 | 2 | Swipe past = implicit skip |
| FR28 | 2 | Cut loose a task |
| FR29 | 2 | Cut loose celebration animation |
| FR30 | 1 | Full task overview list |
| FR31 | 7 | Bulk-archive, delete from archive only |
| FR32 | 7 | Flag stale or avoided tasks |
| FR33 | 7 | Prompt about stale/avoided tasks |
| FR34 | 3 | Toggle Quick Wins / Big Time (tap active to deactivate) |
| FR35 | 3 | Filter quick wins (AI-auto, human-reviewed) |
| FR36 | 3 | Filter big time (AI-auto, human-reviewed) |
| FR37 | 6 | AI prompts for missing deadline info |
| FR38 | 6 | Confirm AI-inferred critical info |
| FR39 | 6 | Suggest micro-tasks for skipped tasks |
| FR40 | 6 | AI breakdown — first-few default, full list option |
| FR41 | 6 | Accept/reject AI breakdowns |
| FR42 | 6 | Feedback input for AI retry |
| FR43 | 4 | Earn stars for completing tasks |
| FR44 | 4 | More stars for urgent tasks |
| FR45 | 4 | More stars for larger tasks |
| FR46 | 4 | Bonus stars for early completion |
| FR47 | 4 | Small rewards for confirming AI info |
| FR48 | 4 | Star count (grand total + daily) |
| FR49 | 4 | Star activity log + done section in task list |
| FR50 | 7 | Welcome-back summary |
| FR51 | 7 | Triage mode for absence |
| FR52 | 7 | Quick win first card after absence |
| FR53 | 8 | Deadline urgency notifications |
| FR54 | 8 | Challenge/novelty notifications |
| FR55 | 8 | Notification preferences |
| FR56 | 8 | No guilt notifications |
| FR57 | 5 | Create account |
| FR58 | 8 | Subscribe to premium |
| FR59 | 5 | Free tier core features |
| FR60 | 8 | Premium feature access |
| FR61 | 8 | Premium discovery sparkle icon |
| FR62 | 5 | Cross-device sync |
| FR63 | 5 | Offline task viewing |
| FR64 | 5 | Offline manual task creation |
| FR65 | 5 | Graceful offline AI degradation |

### NFR Coverage

| NFR | Scope | Notes |
|-----|-------|-------|
| P1–P4 | Cross-cutting | Performance targets applied to all stories |
| A1–A4 | Cross-cutting | Accessibility standards applied to all stories |
| R1–R3 | Epic 5 | Offline reliability (also cross-cutting) |
| R4–R5 | Epic 5 | Sync conflict resolution |
| S1–S3 | Epic 5 | Security requirements |
| SC1 | Epic 5 | Scalability architecture |
| L1 | Cross-cutting | Basic logging (PostHog + pino) |

### UX-DR Coverage

| UX-DR | Epic | Component/Concern |
|-------|------|-------------------|
| 1 | 1 | gluestack-ui v3 setup (install-as-needed) |
| 2 | 1 | TaskCard |
| 3 | 1 | CardStack |
| 4 | 3 | ContextToggleBar |
| 5 | 3 | ModeToggle |
| 6 | 2 | TaskRunningScreen |
| 7 | 6 | SubtaskList |
| 8 | 6 | TriageCard |
| 9 | 4 | StarCounter |
| 10 | 4 | StarActivityLog |
| 11 | 7 | WelcomeBackSummary |
| 12 | 6 | BrainDumpInput |
| 13 | 3 | EmptyState |
| 14 | 1+7 | TaskListView (basic in 1, bulk actions in 7) |
| 15 | 1 | Top bar navigation + floating add |
| 16 | — | Merged into DR15 |
| 17 | 1 | Inline editing with auto-save |
| 18 | Cross-cutting | WCAG AA accessibility |
| 19 | Cross-cutting | TalkBack screen reader |
| 20 | 6 | Loading state patterns (AI-specific) |
| 21 | 2 | Feedback patterns (toasts, animations) |
| 22 | 3 | Empty state patterns (all screens) |
| 23 | 1 | NativeWind/Tailwind styling |
| 24 | 1 | Portrait-only, standard phone widths |
| 25 | 1 | Reanimated 4 Babel config |

## Epic List

### Epic 1: Core Task Loop
Users can manually add tasks, view them as a swipeable card deck, flip cards for details, edit task properties inline, and browse a full task list.

**FRs:** 3, 5, 6, 8, 9, 10, 26, 30
**UX-DRs:** 1, 2, 3, 14 (basic list), 15, 17, 23, 24, 25
**Infrastructure:** Monorepo scaffold (Bun workspaces), Drizzle schemas, expo-sqlite local DB, gluestack-ui v3 setup, NativeWind

---

### Epic 2: Task Execution
Users can start working on tasks, track in-progress state, add notes, mark tasks complete with satisfying feedback, cut loose unwanted tasks, and swipe past tasks to browse.

**FRs:** 19, 20, 21, 22, 24, 25, 27, 28, 29
**UX-DRs:** 6 (TaskRunningScreen — "Help me" button placeholder for Epic 6), 21

---

### Epic 3: Smart Curation
Users can filter tasks by context, toggle Quick Wins / Big Time mode, and see a smartly curated stack with empty state guidance.

**FRs:** 7, 11, 13, 14, 15, 16, 17, 18, 34, 35, 36
**UX-DRs:** 4, 5, 13, 22

---

### Epic 4: Rewards & Motivation
Users earn stars for completing tasks, see progress via star counter (grand total + daily), view star activity log, and see completed tasks in a dedicated "done" section.

**FRs:** 43, 44, 45, 46, 47, 48, 49
**UX-DRs:** 9, 10

---

### Epic 5: Account & Cloud Sync
Users can create accounts, authenticate, sync tasks across devices, and use core features offline with graceful degradation.

**FRs:** 57, 59, 62, 63, 64, 65
**NFRs:** S1–S3, R1–R5, SC1
**Infrastructure:** tRPC + Fastify server, Supabase Auth, custom sync layer

---

### Epic 6: AI Intelligence
Users can brain dump thoughts and have AI parse them into tasks, confirm AI-inferred info via triage cards, request AI task breakdowns, and provide feedback to improve results.

**FRs:** 1, 2, 4, 12, 23, 37, 38, 39, 40, 41, 42
**UX-DRs:** 7, 8, 12, 20
**Infrastructure:** Gemini Flash AI service via tRPC

---

### Epic 7: Task Health & Return
Users can bulk-archive tasks, manage stale/avoided tasks, and get a gentle welcome-back experience after absence with quick triage.

**FRs:** 31, 32, 33, 50, 51, 52
**UX-DRs:** 11, 14 (bulk actions, recycle bin)

---

### Epic 8: Engagement & Monetization
Users receive helpful non-guilty push notifications and can discover/subscribe to premium features.

**FRs:** 53, 54, 55, 56, 58, 60, 61
**Infrastructure:** FCM via Expo Notifications, RevenueCat, PostHog analytics

---

### Cross-Cutting Requirements
Applied across all epics as story-level acceptance criteria:
- **NFR-P1–P4:** Performance targets (50+ FPS, <2s cold start, <3s AI, <100ms interactions)
- **NFR-A1–A4:** Accessibility (WCAG AA, TalkBack, reduced motion, ADHD-first)
- **NFR-L1:** Basic logging (PostHog + pino)
- **UX-DR18:** WCAG 2.1 AA (touch targets, labels, contrast)
- **UX-DR19:** TalkBack screen reader support

### Dependency Flow

```
Epic 1: (Core Task Loop) → Epic 2: (Task Execution) → Epic 3: (Smart Curation) → Epic 4: (Rewards)
                                                                                   ↓
Epic 5: (Account & Sync) → Epic 6: (AI Intelligence) → Epic 7: (Task Health & Return)
                                                          ↓
                                                     Epic 8: (Engagement & Monetization)
```
