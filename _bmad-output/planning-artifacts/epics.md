---
stepsCompleted: [1]
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

{{requirements_coverage_map}}

## Epic List

{{epics_list}}
