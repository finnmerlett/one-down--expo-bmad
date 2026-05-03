---
stepsCompleted: [1, 2, 3, 4]
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
| FR27 | 1 | Swipe past = implicit skip (covered by Story 1.3 swipe mechanic) |
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

**FRs:** 3, 5, 6, 8, 9, 10, 26, 27, 30
**UX-DRs:** 1, 2, 3, 14 (basic list), 15, 17, 23, 24, 25
**Infrastructure:** Monorepo scaffold (Bun workspaces), Drizzle schemas, expo-sqlite local DB, gluestack-ui v3 setup, NativeWind

---

### Epic 2: Task Execution
Users can start working on tasks, track in-progress state, add notes, mark tasks complete, and cut loose unwanted tasks.

**FRs:** 19, 20, 21, 22, 24, 25, 28, 29
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
- **NFR-R1–R3:** Offline reliability (local-first architecture ensures core viewing and manual creation work offline, AI degrades gracefully)
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

---

## Epic Stories

### Epic 1: Core Task Loop

#### Story 1.1: App Shell & Navigation

As a user,
I want to open the One Down app and see a clean interface with navigation controls,
So that I have a usable app foundation.

**Acceptance Criteria:**

**Given** a fresh install of the app
**When** the user launches the app
**Then** they see a top bar with task list icon (top-left), star box placeholder (top-second-to-left), and settings icon (top-right)
**And** a floating add button in the bottom-right corner
**And** the app is locked to portrait orientation
**And** the layout uses NativeWind/Tailwind CSS utilities with safe area insets

**Infrastructure:** Bun monorepo (apps/mobile, packages/shared), Expo SDK 55, gluestack-ui v3, NativeWind, react-native-gesture-handler, Reanimated 4, Babel config (worklets plugin last)
**UX-DRs:** 1, 15, 23, 24, 25

---

#### Story 1.2: Quick-Add a Task

As a user,
I want to tap the add button and enter a task title and details,
So that I can capture tasks without friction.

**Acceptance Criteria:**

**Given** the user taps the floating add button
**When** they enter a task title and optionally free-text details, then submit
**Then** the task is saved to local storage (expo-sqlite) with both title and details
**And** the add input clears and is ready for another entry
**And** the task appears in the card stack

**Given** the user enters an empty task title
**When** they try to submit
**Then** the submission is prevented with inline feedback

**Creates:** Task Drizzle schema (local), Zustand task store, quick-add input with title + details fields
**FRs:** 3

---

#### Story 1.3: Task Card Stack & Swiping

As a user,
I want to see my tasks as a stack of cards and drag through them,
So that I can browse tasks one at a time in a focused way.

**Acceptance Criteria:**

**Given** the user has tasks in their local database
**When** they view the main screen
**Then** tasks display as a card stack: top card fully visible, next card visible underneath, 3rd card faintly visible at bottom
**And** each card shows task title, size tag (if set), and context badges

**Given** the user drags a card with touch
**When** they move it across the screen
**Then** the card follows the finger position

**Given** the user releases the card when more than half off the stack
**When** they let go
**Then** the card animates flying off-screen in the dragged direction
**And** the next card (already visible underneath) becomes the new top card
**And** the 3rd-to-next card fades in at the bottom of the stack

**Given** the user releases the card when less than half off the stack
**When** they let go
**Then** the card smoothly animates back to its original position

**Given** no tasks exist
**When** the user views the main screen
**Then** an empty state message is shown

**Creates:** TaskCard (front side), CardStack with Reanimated 4 worklets + gesture handler
**FRs:** 6, 9, 10, 27
**UX-DRs:** 2, 3

---

#### Story 1.4: Card Front/Back & Inline Editing

As a user,
I want to tap a card to see its details and edit properties in place,
So that I can manage task information without leaving the card view.

**Acceptance Criteria:**

**Given** the user taps a card in the stack
**When** the view switches to the back
**Then** the card expands to fill more of the screen (not full screen)
**And** they see task title, description, deadline, notes area, context requirement toggles, and placeholder buttons (Start, Cut Loose — wired in Epic 2)
**And** a back button appears in the top-left corner

**Given** the user taps any text field on the card back
**When** they make changes
**Then** the text saves automatically to local storage (no save button)
**And** the save is instantaneous (no network round-trip)

**Given** the user edits context requirements
**When** they toggle context options (Home, Out & About, Phone, Laptop, Internet)
**Then** the selection updates immediately and persists

**Given** the user taps the back button or taps around the edges of the expanded card
**When** they do so
**Then** the card contracts back to stack size and switches to front view
**And** the front reflects any changes made

**FRs:** 5, 8, 26
**UX-DRs:** 17

---

#### Story 1.5: Task Overview List

As a user,
I want to see all my tasks in a scrollable list,
So that I can get a complete view of my task backlog.

**Acceptance Criteria:**

**Given** the user taps the task list icon in the top bar
**When** the task list view opens
**Then** they see all active tasks in a scrollable list
**And** a placeholder "done" section header at the top (populated in Epic 4)

**Given** the user taps a task in the list
**When** they select it
**Then** the card back view opens in an isolated full-screen view with a back button to return to the list

**Given** no tasks exist
**When** the user opens the list
**Then** an empty state guides them to add tasks

**FRs:** 30
**UX-DRs:** 14 (basic list view)

---

### Epic 2: Task Execution

#### Story 2.1: Start & Continue a Task

As a user,
I want to start working on a task and see a dedicated task running screen,
So that I can focus on one thing at a time.

**Acceptance Criteria:**

**Given** the user is on a card's back view
**When** they tap the Start button
**Then** the task gets "started" status and the task running screen opens
**And** they see the task title, description, notes area (editable), Done button, "Help me with this" button (disabled placeholder — Epic 6), and Cut Loose button

**Given** the user has a previously started task
**When** they view that task's card front
**Then** the card shows "Continue" instead of "Start"

**Given** the user taps "Continue" on an in-progress task
**When** the task running screen opens
**Then** their previous notes and progress are preserved

**FRs:** 19, 20, 21
**UX-DRs:** 6

---

#### Story 2.2: Add Notes During Execution

As a user,
I want to add and edit notes while working on a task,
So that I can capture thoughts and track progress.

**Acceptance Criteria:**

**Given** the user is on the task running screen
**When** they type in the notes area
**Then** the text saves automatically to local storage (instantaneous, no save button)

**Given** the user closes and re-opens the task running screen
**When** they return to the task
**Then** all previously saved notes are visible

**FRs:** 22

---

#### Story 2.3: Complete a Task

As a user,
I want to mark a task as complete and feel satisfaction,
So that I'm motivated to keep going.

**Acceptance Criteria:**

**Given** the user is on the task running screen
**When** they tap the Done button
**Then** a toast shows at the top of the screen indicating star award (wired fully in Epic 4)
**And** the task is marked complete in local storage
**And** the task running screen closes and the next card is shown in the stack

**Given** a completed task
**When** it appears in the task overview list
**Then** it shows in the "done" section

**FRs:** 24, 25
**UX-DRs:** 21 (completion feedback)

---

#### Story 2.4: Cut Loose a Task

As a user,
I want to release a task without guilt when it's no longer relevant,
So that I can keep my task list clean without feeling bad.

**Acceptance Criteria:**

**Given** the user is on the card back or task running screen
**When** they tap the Cut Loose button
**Then** the card disappears
**And** an acknowledgment toast shows briefly ("Released" ~2s)
**And** the task is archived in local storage
**And** the view returns to the card stack with the next card shown

**FRs:** 28, 29
**UX-DRs:** 21 (toast)

---

### Epic 3: Smart Curation

#### Story 3.1: Context Toggle Bar

As a user,
I want to select my current context to filter tasks,
So that I only see tasks I can act on right now.

**Acceptance Criteria:**

**Given** the main card view is displayed
**When** the user sees the ContextToggleBar
**Then** they see icon buttons for Home, Out & About, Phone, Laptop, Internet

**Given** the user taps a context button
**When** they select it
**Then** the button shows as active and the card stack immediately re-filters to show only matching tasks

**Given** the user taps multiple context buttons
**When** they select several
**Then** all selected contexts are active (multi-select) and the stack shows tasks matching any active context

**Given** a context has no matching tasks
**When** the user views the toggle bar
**Then** that context button appears greyed-out/disabled

**Given** the user closes and reopens the app
**When** they return
**Then** their last context selection is persisted (via Zustand)

**FRs:** 13, 14, 16, 18
**UX-DRs:** 4

---

#### Story 3.2: Mode Toggle (Quick Wins / Big Time)

As a user,
I want to toggle between Quick Wins and Big Time modes,
So that I can match my current energy level to task size.

**Acceptance Criteria:**

**Given** the main card view is displayed
**When** the user sees the ModeToggle
**Then** they see a two-option control: "Quick Wins" / "Big Time"

**Given** the user taps "Quick Wins"
**When** the mode activates
**Then** the stack re-curates to show only tasks assigned as small/quick win size

**Given** the user taps "Big Time"
**When** the mode activates
**Then** the stack re-curates to show only tasks assigned as big time size

**Given** the user taps the currently active mode
**When** they press it again
**Then** the mode deactivates and the stack returns to showing both types

**Given** filtering is active (from Story 3.1)
**When** mode toggle is also applied
**Then** both filters combine (context + size)

**FRs:** 34, 35, 36
**UX-DRs:** 5

---

#### Story 3.3: Stack Curation Algorithm

As a user,
I want the card stack to intelligently surface a mix of tasks,
So that I see what matters without the stack feeling repetitive or overwhelming.

**Acceptance Criteria:**

**Given** the user has multiple tasks matching current filters
**When** the stack is curated
**Then** tasks are ordered by a curation algorithm that factors in importance, urgency, task size variety, and controlled randomness — not a strict urgency sort
**And** the algorithm mixes easier and harder tasks to maintain engagement

**Given** a task has a star value indicator
**When** it appears in the stack
**Then** the card front shows the potential star value (more urgent/larger = more reward)

**Given** other contexts have urgent tasks (approaching deadlines)
**When** the user is viewing a different context
**Then** a visual indicator shows on the relevant context button(s)

*Note: The curation algorithm is an initial best-guess implementation. Exact weighting and randomness tuning to be refined through dogfooding, then alpha tester feedback in later versions.*

**FRs:** 7, 11, 15

---

#### Story 3.4: Empty State Guidance

As a user,
I want helpful guidance when there are no tasks to show,
So that I know what to do next instead of seeing a blank screen.

**Acceptance Criteria:**

**Given** the user's current context + mode filters produce no results
**When** the empty state displays
**Then** a contextual message suggests checking other contexts or adjusting the mode toggle

**Given** the user has zero tasks globally
**When** any view is empty
**Then** the empty state guides them to add tasks (brain dump CTA once Epic 6 is live, quick-add for now)

**Given** the task list view has no tasks
**When** the user opens it
**Then** the empty state guides them to add tasks

**FRs:** 17
**UX-DRs:** 13, 22

---

### Epic 4: Rewards & Motivation

#### Story 4.1: Star Earning System

As a user,
I want to earn stars when I complete tasks,
So that I feel rewarded and motivated to keep going.

**Acceptance Criteria:**

**Given** the user completes a task (via Done button)
**When** the task is marked complete
**Then** stars are awarded based on: base amount for completion, bonus for relative urgency (deadline proximity), bonus for larger task size, bonus for completing before deadline (up to a limit)
**And** a toast shows at the top of the screen with the star amount earned

**Given** the user confirms AI-inferred info or adds identified missing info (once Epic 6 is live)
**When** they complete a triage action
**Then** a small star reward is earned

*Creates: Star calculation logic, star transaction schema (local DB), star earning hooks*
**FRs:** 43, 44, 45, 46, 47

---

#### Story 4.2: Star Counter Display

As a user,
I want to see my star count at all times,
So that I can track my progress and feel accomplished.

**Acceptance Criteria:**

**Given** the user is on any screen with the top bar
**When** they look at the star box (top second-to-left)
**Then** they see a star icon with their grand total count and daily amount displayed together

**Given** the user earns stars
**When** the star award is processed
**Then** the star counter updates in real-time with increment highlighting

**Given** the star counter
**When** it updates
**Then** it uses accessibilityLiveRegion="polite" to announce changes to screen readers

*Creates: StarCounter component*
**FRs:** 48
**UX-DRs:** 9

---

#### Story 4.3: Star Activity Log

As a user,
I want to see a history of all my star transactions,
So that I can see what I've accomplished and feel proud.

**Acceptance Criteria:**

**Given** the user taps the star counter in the top bar
**When** the star activity log opens
**Then** they see a chronological list of all star transactions (timestamp, action type, task name, star amount +/-)

**Given** the star activity log is open
**When** the user toggles between "Today" and "All Time" filters
**Then** the list filters to show transactions from today only or all transactions

**Given** no star transactions exist
**When** the user opens the log
**Then** a helpful empty state message is shown

*Creates: StarActivityLog component*
**FRs:** 49 (star log)
**UX-DRs:** 10

---

#### Story 4.4: Done Section in Task List

As a user,
I want to see my completed tasks in a dedicated section,
So that I can see what I've accomplished today.

**Acceptance Criteria:**

**Given** the user opens the task overview list
**When** completed tasks exist
**Then** a "Done" section appears at the top of the list showing completed tasks
**And** the scroll position on entry shows a couple of done tasks visible, with the user able to scroll up to see more

**Given** no tasks are completed
**When** the user views the list
**Then** the "Done" section header is hidden

*FRs: 49 (done section)*

---

### Epic 5: Account & Cloud Sync

#### Story 5.1: Backend API Foundation

As a user,
I want my app to connect to a backend server,
So that my data can be synced and features can be extended.

**Acceptance Criteria:**

**Given** the server project is scaffolded (apps/server with Fastify 5 + TypeScript + Bun)
**When** the server starts
**Then** a health check endpoint responds successfully
**And** tRPC router is configured with Fastify adapter
**And** server Drizzle ORM connects to PostgreSQL (Railway)
**And** server-side task schema mirrors the local schema (via packages/shared)

**Given** the mobile app
**When** it initializes
**Then** a tRPC client is configured and can reach the server

*Infrastructure: apps/server scaffold, tRPC + Fastify, PostgreSQL + Drizzle (server), packages/shared schemas*
**FRs:** (infrastructure for 62-65)
**NFRs:** SC1

---

#### Story 5.2: User Registration & Authentication

As a user,
I want to create an account and log in,
So that my tasks are associated with me and can sync across devices.

**Acceptance Criteria:**

**Given** the user opens the app for the first time (or is logged out)
**When** they choose to sign up
**Then** they can create an account with email/password or Google OAuth via Supabase Auth
**And** a JWT is issued and stored in expo-secure-store

**Given** the user has an account
**When** they log in with valid credentials
**Then** they are authenticated and the JWT is stored securely

**Given** the user is authenticated
**When** they make tRPC requests
**Then** the JWT is verified via tRPC middleware and the request is authorized

**Given** the user is not authenticated
**When** they use the app
**Then** core features work in local-only mode (free tier)

*Infrastructure: Supabase Auth integration, JWT middleware, expo-secure-store*
**FRs:** 57, 59
**NFRs:** S1, S2

---

#### Story 5.3: Cloud Sync Layer

As a user,
I want my tasks to sync across devices,
So that I can access my tasks anywhere.

**Acceptance Criteria:**

**Given** the user is authenticated and online
**When** they create, edit, or complete a task locally
**Then** the change syncs to the server within 5 seconds

**Given** the user comes online after being offline
**When** the connection is restored
**Then** all pending local changes sync to the server
**And** server changes sync to the local database
**And** sync completes within 5 seconds of connection restoration

**Given** a sync conflict occurs (same task edited on two devices)
**When** the sync layer resolves it
**Then** the "last-content-changed wins" strategy is applied
**And** no data is silently lost

**Given** task IDs
**When** created on the client
**Then** they use crypto.randomUUID() and are permanent (no server-side ID reassignment)

*Infrastructure: Custom timestamp-based sync layer, conflict resolution*
**FRs:** 62, 63, 64
**NFRs:** R1, R2, R3, R4, R5

*Note: FR63 (offline viewing) and FR64 (offline creation) are inherently satisfied by Epic 1's local-first architecture but sync behavior is validated here. FR65 (AI graceful degradation) is handled in Epic 6.*

---

### Epic 6: AI Intelligence

#### Story 6.1: AI Service & Brain Dump Parsing

As a user,
I want to brain dump my thoughts and have AI extract individual tasks,
So that I can capture everything on my mind without organizing it myself.

**Acceptance Criteria:**

**Given** the user opens the brain dump input
**When** they type free-form text and submit
**Then** a loading indicator shows (spinner + "Parsing your tasks..." text, fades in after 1s)
**And** the text is sent to the AI service (Gemini Flash via tRPC)
**And** individual tasks are extracted and created in local storage

**Given** the AI takes longer than 4 seconds
**When** the loading indicator is visible
**Then** a "Taking a bit longer..." message appears

**Given** the user is offline
**When** they try to brain dump
**Then** a clear message explains the feature needs internet
**And** the quick-add input is suggested as an alternative

**Given** the AI parses successfully
**When** tasks are created
**Then** each task has AI-inferred title, and optionally inferred size, context, and deadline (with confidence thresholds)

*Creates: AI service (Gemini Flash via @google/generative-ai), tRPC AI router, BrainDumpInput component*
*FRs: 1, 2, 4, 65*
*UX-DRs: 12, 20*

---

#### Story 6.2: Review Mode for AI Confirmations

As a user,
I want to review and confirm AI-inferred task information in a dedicated review mode,
So that my tasks are accurate before I rely on them.

**Acceptance Criteria:**

**Given** AI has created tasks with unconfirmed assumptions or missing info
**When** those tasks appear in the main stack
**Then** they look like normal cards but display an info icon indicating items need review

**Given** the user taps the info icon on a card
**When** review mode activates
**Then** the stack filters to show only cards with unconfirmed AI assumptions or missing info
**And** the user can swipe through review cards as normal

**Given** the user is in review mode
**When** they view a review card's back/details
**Then** items needing attention are highlighted (missing data or unconfirmed AI inference)
**And** a tick/confirm button appears next to each item that needs review

**Given** the user taps the confirm tick next to an AI-inferred value
**When** they confirm it
**Then** the tick disappears and the item is marked as confirmed

**Given** the user edits an AI-inferred value directly
**When** they change the text/selection
**Then** the item is automatically marked as confirmed (tick disappears)

**Given** the user wants to exit review mode
**When** they toggle review mode off
**Then** the stack returns to the normal view with all cards

**Given** the user confirms AI-inferred info or adds missing info
**When** the confirmation is saved
**Then** a small star reward is earned

**Given** the AI detects time-sensitivity but no deadline is set
**When** the user views the review card
**Then** a prompt highlights the missing deadline for the user to fill in

*FRs: 12, 37, 38, 47*
*UX-DRs: 8*

---

#### Story 6.3: AI Task Breakdown

As a user,
I want AI to break down large tasks into smaller steps,
So that I can get started without feeling overwhelmed.

**Acceptance Criteria:**

**Given** the user is on the task running screen or card back
**When** they tap "Help me with this"
**Then** AI generates a breakdown — default is the first few steps to get started

**Given** the user wants the full breakdown
**When** they tap an option to see all steps
**Then** AI generates the complete subtask list

**Given** subtasks are generated
**When** they appear on the task running screen
**Then** each subtask has a tickbox and a delete button
**And** completing a subtask earns a small star reward
**And** deleting a subtask reverses the star reward (if already earned)

**Given** the user reviews the AI breakdown
**When** they accept it
**Then** the subtasks are saved to the task

**Given** the user rejects the AI breakdown
**When** they decline it
**Then** the subtasks are discarded and the task remains unchanged

*FRs: 23, 40, 41*
*UX-DRs: 7*

---

#### Story 6.4: AI Breakdown Feedback & Retry

As a user,
I want to refine an AI breakdown that missed the mark,
So that I get useful subtasks without starting from scratch.

**Acceptance Criteria:**

**Given** the user is viewing an AI-generated breakdown
**When** they want to improve it
**Then** they tap a "Refine" button which opens a feedback input ("Why does this miss the mark?")

**Given** the user submits feedback via the Refine flow
**When** the AI processes it
**Then** useful information from the feedback is distilled into the task's notes
**And** the AI retries the breakdown incorporating the feedback
**And** a loading indicator shows during processing

**Given** a task is frequently swiped past
**When** the AI detects the pattern
**Then** it proactively suggests a micro-task (smallest first step) for the task

*FRs: 39, 42*

---

### Epic 7: Task Health & Return

#### Story 7.1: Bulk Archive & Delete

As a user,
I want to bulk-archive tasks and permanently delete from the archive,
So that I can clean up my task list efficiently.

**Acceptance Criteria:**

**Given** the user is on the task overview list
**When** they enter multi-select mode (long-press or checkbox toggle)
**Then** they can select multiple tasks at once

**Given** the user has selected tasks that have been started or completed
**When** they tap the archive action
**Then** a warning dialog confirms the archival (since stars will be removed)

**Given** the user confirms archival
**When** tasks are moved to the archive/recycle bin
**Then** all stars earned from those tasks are removed from the user's total
**And** a confirmation toast shows

**Given** tasks that have not been started or completed
**When** the user archives them
**Then** no warning is needed (no stars to lose)

**Given** the user is viewing the archive/recycle bin tab
**When** they select archived tasks and tap delete
**Then** a confirmation dialog confirms permanent deletion
**And** on confirmation, the tasks are permanently deleted

**Given** the user restores a task from the recycle bin
**When** it returns to the active list
**Then** stars previously removed are NOT restored (kept simple — no reverse tracking)

*FRs: 31*
*UX-DRs: 14 (bulk actions, recycle bin)*

---

#### Story 7.2: Stale & Avoided Task Detection

As a user,
I want the app to flag tasks I've been avoiding or neglecting,
So that I can decide whether to keep, cut loose, or break them down.

**Acceptance Criteria:**

**Given** a task has been in the system for a long time without action
**When** the system detects it as stale
**Then** it is flagged as stale

**Given** a task has been frequently swiped past in the card stack
**When** the system detects the avoidance pattern
**Then** it is flagged as avoided

**Given** a task is flagged as stale or avoided
**When** the user encounters it
**Then** the system prompts with options: keep, cut loose, or break down (via AI if Epic 6 is complete)

*FRs: 32, 33*

---

#### Story 7.3: Welcome Back Summary

As a user,
I want a gentle welcome-back screen after being away,
So that I can re-engage without feeling guilty about missed tasks.

**Acceptance Criteria:**

**Given** the user opens the app after a significant absence
**When** the welcome back screen appears
**Then** it shows a factual summary: number of tasks waiting, any deadlines that passed, suggestions to cut loose stale tasks
**And** the tone is supportive and guilt-free

**Given** the welcome back summary is displayed
**When** the user sees the CTAs
**Then** two options are shown: "Let's see what's up" (enters triage for fast keep/cut/defer decisions) and "Go to main deck" (skip straight to card stack)

**Given** the user taps "Let's see what's up"
**When** triage mode opens
**Then** they see a focused view for making quick decisions on tasks that need attention (passed deadlines, stale tasks, action items)

**Given** the first card shown after welcome back
**When** the user starts browsing the stack
**Then** the system prioritizes an achievable quick win as the first card

*FRs: 50, 51, 52*
*UX-DRs: 11*

---

### Epic 8: Engagement & Monetization

#### Story 8.1: Push Notifications

As a user,
I want to receive helpful notifications about deadlines and task engagement,
So that I stay on track without feeling nagged or guilty.

**Acceptance Criteria:**

**Given** a task is approaching its deadline
**When** it becomes time-critical
**Then** the user receives a deadline urgency notification

**Given** the system wants to re-engage the user
**When** a challenge or novelty notification is sent
**Then** the tone is inviting and encouraging, never guilt-inducing

**Given** the system
**When** it considers sending a notification
**Then** it never sends guilt-inducing reminder notifications (e.g. "You haven't opened the app in 3 days!")

**Given** the user wants to control notifications
**When** they open notification preferences in settings
**Then** they can configure notification types and frequency

*Infrastructure: FCM via Expo Notifications (Android)*
*FRs: 53, 54, 55, 56*

---

#### Story 8.2: Premium Subscription & Feature Gating

As a user,
I want to discover and subscribe to premium features,
So that I can unlock enhanced capabilities when I'm ready.

**Acceptance Criteria:**

**Given** the user is on the free tier
**When** they see a premium feature
**Then** a sparkle icon indicates premium availability

**Given** the user taps the sparkle icon
**When** the premium features page opens
**Then** they see a list of premium features and subscription options

**Given** the user wants to subscribe
**When** they initiate an in-app purchase
**Then** the subscription is processed via RevenueCat (Google Play)

**Given** the user has an active subscription
**When** they use the app
**Then** premium features are unlocked and accessible

**Given** the user does not subscribe
**When** they use the app
**Then** all core features continue to work on the free tier

*Infrastructure: RevenueCat, Google Play billing*
*FRs: 58, 60, 61*

---

#### Story 8.3: Analytics Integration

As a user (and product owner),
I want usage analytics to understand how the app is being used,
So that we can make data-driven improvements.

**Acceptance Criteria:**

**Given** the app is running
**When** the user performs key actions (task creation, completion, cut loose, brain dump, etc.)
**Then** anonymized events are tracked via PostHog

**Given** the server processes requests
**When** tRPC endpoints are called
**Then** server-side analytics are captured via posthog-node + posthog-trpc middleware

**Given** privacy requirements
**When** analytics are captured
**Then** no sensitive task content is logged or transmitted (NFR-S3)

*Infrastructure: PostHog React Native SDK (client), posthog-node + posthog-trpc middleware (server)*
*NFRs: S3, L1*
