---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - product-brief-One-Down-2025-01-04.md
  - domain-productivity-psychology-research-2025-12-31.md
  - brainstorming-session-2025-12-30.md
  - party-mode-session-2025-12-31.md
  - ai-cost-analysis-2025-01-03.md
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 2
  analysis: 1
workflowType: 'prd'
lastStep: 4
---

# Product Requirements Document - One Down

**Author:** Finn  
**Date:** 2025-01-04

---

## Executive Summary

**One Down** is a task management app that eliminates the ambient anxiety of trailing todos. Unlike traditional todo apps that show endless lists and expect users to do the cognitive work of prioritization, One Down presents **one actionable task at a time** — the right task, at the right moment, with the right context.

Built for the ADHD brain but designed for everyone, One Down acts as a **reliable task caretaker** that surfaces tasks only when they can be acted upon, breaks down overwhelming items into achievable first steps, and makes task completion feel satisfying rather than stressful.

**Core Philosophy:** *Let us do the organising, you focus on the doing.*

The app embraces **reactive simplification** — the user initiates engagement when ready to get stuff done, and the app removes all friction from that moment. There is no nagging, no guilt-inducing notifications. The only exception: deadline-critical items that genuinely require attention.

### Problem Solved

Traditional todo apps amplify anxiety instead of reducing it:
- **Endless scrolling lists** create a sense of never-ending work
- **Manual prioritization** creates decision fatigue before any work begins  
- **Guilt-inducing notifications** trigger avoidance rather than action
- **Trailing tasks** — things like returning packages or renewing passports — create constant low-grade anxiety

The result: users avoid opening the app entirely, tasks slip through the cracks, and the mental burden of remembering what needs to be done remains constant.

### What Makes This Special

| Differentiator | What It Means |
|----------------|---------------|
| **Curated Card Stack** | UI shows a small, curated shortlist of tasks you can flick through — not endless scrolling, but enough choice to find one that fits your current moment |
| **Smart Curation Logic** | Stack is selected based on available context (location, tools) and calculated importance/urgency, always including at least one quick win |
| **Quick Wins / Big Time Modes** | Dedicated modes surface different shortlists — easy momentum-builders or challenging items when ready |
| **Task Caretaker Philosophy** | The app does the organising so users can focus on the doing |
| **Quiet Satisfaction Design** | Premium, smooth, clean experience — gamification that motivates without distracting |
| **Ultra-Low Pricing** | ~£1.50/month — so cheap it feels silly NOT to pay |
| **ADHD-First Design** | Built on evidence-based strategies (task breakdown, dopamine rewards, low-effort flow) |
| **Zero-Friction Onboarding** | Works from first task; brain dump to organized list instantly |

The moat is philosophy, not features. The *feel* of every micro-decision — no nagging, one card, "cut it loose" as liberation — compounds into an intangible quality competitors cannot replicate by cloning the UI.

---

## Project Classification

**Technical Type:** Mobile App (React Native Expo, cross-platform iOS/Android)  
**Domain:** General (productivity/task management, no regulated data)  
**Complexity:** Low (standard requirements, basic security, UX-focused)  
**Project Context:** Greenfield — new project

**MVP Focus:** Validate the core hypothesis: *Does one-card focus reduce anxiety and help users complete tasks?* Start with reactive simplification and quiet satisfaction. Tactile playfulness and proactive intelligence can evolve post-MVP based on user feedback and A/B testing.

---

## Success Criteria

### User Success

**Core Success Signal:**
> The app is working if users keep coming back without forcing themselves.

Unlike most todo apps where novelty wears off after 2-3 weeks, One Down succeeds when users open it 2+ times per week, month after month, because it genuinely reduces their stress and helps them get things done.

**Quantitative Metrics:**

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| **WAU retention** | % of users still active after 30/60/90 days | 60% at 30 days, 40% at 90 days |
| **Tasks resolved** | Tasks completed OR mindfully cut loose | > 70% within 60 days |
| **Time-to-task-start** | Seconds from app open to engaging a task | < 30 seconds median |
| **Deadline success rate** | Tasks with deadlines completed on time | > 80% on-time |
| **Return frequency** | Opens per week among active users | 2+ opens/week |

**Qualitative Metrics (Optional Deep Signal):**
Brief in-app questionnaire after some usage (10 seconds, 3 questions, emoji-face scale):
- "Are you enjoying small tasks more?"
- "Do you feel more on top of your miscellaneous tasks?"
- "Are you generally more relaxed?"

**Note on "Cut It Loose":**
Tasks cut loose should never be treated as a negative signal. Achieving fewer things hanging over you IS the win. Track cut-loose rates per user for cohort analysis and curiosity, not as a failure indicator.

### Business Success

**Revenue Target:**
- **Goal:** £2,000/month profit
- **Required:** ~2,500 paying subscribers
- **Implied MAU:** ~25,000 (at 10% conversion)

**Realistic Early Milestone:**
- 10,000 MAU → ~1,000 paying → £600-800/month profit
- This is a "very happy" milestone before reaching full target

**Unit Economics (Per Paying User):**

| Line Item | Conservative | Realistic |
|-----------|--------------|-----------|
| Revenue | £1.50 | £1.50 |
| App store cut (15%) | -£0.23 | -£0.23 |
| AI costs (avg) | -£0.25 | -£0.08 |
| Server costs | -£0.10 | -£0.005 |
| **Net profit** | **£0.92** | **£1.18** |

*Conservative estimate assumes heavy AI usage. Realistic estimate based on 70% light / 25% medium / 5% heavy user distribution from AI cost analysis. Server costs at scale are negligible per-user (~£50-100/month total at 25k MAU).*

**Revised targets using realistic estimate (~£1.15/user):**
- £2k/month profit → ~1,740 paying users → ~17k MAU
- 10k MAU milestone → ~£1,150/month profit

**Marketing Budget:** Expect 10-25% of profits for ads/App Store placements

**Growth Channels:**
- Organic social media (viral content attempts)
- ADHD creator outreach and collaboration
- Community co-design with target users
- App Store optimization

**Other Business Metrics:**

| Metric | Target |
|--------|--------|
| Free → Paid conversion | 10-15% (stretch: 20%) |
| Monthly churn | < 5% |
| Net Promoter Score | > 50 |

### Technical Success (Hard Constraints)

**AI Cost Viability:**
AI costs must NOT progressively eat into profit margin. This is a viability constraint, not a nice-to-have. If AI costs trend upward beyond ~25p/user avg, the product model requires serious re-evaluation.

**Mitigation Strategies:**
- Use simple/small prompts for core features
- Evaluate on-device voice transcription (Whisper.cpp) to reduce cloud costs
- Implement fair-use caps if needed
- Cache AI decisions where possible

**Performance Requirements:**
- App feels snappy and responsive
- Animations smooth on mid-range devices
- Offline-capable for core task viewing (AI features gracefully degrade)

---

## Product Scope

### MVP (v0.1) — Core Loop Validation

**Goal:** Validate the core hypothesis: *Does one-card focus reduce anxiety and help users complete tasks?*

| Feature | Description |
|---------|-------------|
| **Text brain-dump input** | Free-text entry, AI splits into separate tasks |
| **Card stack view** | Single card focus with curated shortlist, basic swipe animations |
| **Tap to flip** | Card back shows task details, edit/refine options |
| **Task running screen** | Expanded card fills screen on "Start", with done button and notes container |
| **Context filtering** | Toggles on card view (home/office/laptop/phone) — filter what you can do now |
| **Mark complete** | Swipe or tap to complete with satisfying reward feedback |
| **Basic task overview** | Simple list view (not graph) for trust-building — see everything if needed |
| **Quick Wins / Big Time toggle** | Switch between easy momentum tasks and harder challenges |

**MVP Success Criteria:**
- Users open app without dread
- Core loop (see card → start task → complete → next) feels satisfying
- Context filtering helps surface actionable tasks
- Dogfood feedback is positive

### Growth Features (v0.2+)

#### v0.2: Enhanced Intelligence & Polish
- **Voice input** — Phone built-in transcription for quick brain dumps
- **Animation polish** — Better swipe/flip/complete animations across the board (including cut-it-loose, but consistent with overall quality)
- **AI "Help me with this" button** — On task-running screen, get smart suggestions when stuck
- **Deadline prompting** — "I noticed this might be time-sensitive — when does it need to be done?"
- **Task refinement mode** — Proactive AI questions ("what does this task need?") at random intervals or on-demand
- **Built-in app feedback system** — Easy in-app feedback prompts, low friction (want learnings early)

#### v0.3: Reliability & Insights
- **Offline fallback** — Cache AI decisions, rules-based prioritization when offline (essential for reliability)
- **"Yesterday's wins on open"** — Start sessions positive, see recent accomplishments
- **Richer "done box"** — Visual accumulation of completed tasks, momentum tracking
- **Feature request consolidation** — View mode for requested features (paired with feedback system)

### Vision (v1.0+)

#### v1.0: Trust & Gamification
- **Brain visualization** — Graph/flowchart showing all tasks and prioritization logic (trust through transparency)
- **Full star economy** — Complete reward system with earning and spending
- **Deadline/completion bonuses** — Extra stars for nearing-deadline completions, early completions, finally tackling skipped tasks
- **Star shop with unlockables** — Exclusive card physics variants, animations, cosmetics (stars-only, no IAP)
- **Streak → Power-ups** — Invest stars in multipliers that require consistency to profit
- **Daily bonfire ritual** — End-of-day celebration, completed tasks burn (user-initiated)
- **Advanced card physics** — Slingshot complete, crumple, fidget interactions (unlockable variants)

#### v1.x+: Expansion & Resilience
- **Running bonuses** — Streak alternative that resets on break without shame
- **Pre-generated message variants** — AI-generated collection of varied in-app messages, randomized with anti-repetition cool-off for rich offline experience
- **Reduced motion mode** — Accessibility for motion sensitivity or older devices
- **Widgets / watch companion** — Quick capture and task view outside main app
- **Calendar integration** — Only if fits philosophy naturally (TBD through dogfooding)
- **Social features / body doubling** — Requires market research first; only if it serves the core mission

#### Decisions Made
- **Reward currency:** Stars (not checkmarks) — more satisfying, can be designed tastefully
- **Backend:** Fastify + Postgres (soft preference, validate during implementation)
- **Feedback tooling:** Explore open-source options when ready

#### Open Questions (Revisit Later)
- Integrated feedback tool: open-source options to evaluate
- Calendar integration UX that doesn't violate philosophy
- Social features market research
- **Marketing strategy:** Evaluate ADHD creator outreach (authentic story: "built this for myself"), viral social media content, App Store optimization. Authentic personal story may outperform paid acquisition for this product.

---

## User Journeys

### Journey 1: Alex's First Open — "Maybe This One Will Be Different"

**User:** Alex (31, freelance designer, ADHD)  
**Scenario:** First time using One Down after discovering it on Reddit  
**Emotional state:** Skeptical but hopeful — they've been hurt by todo apps before

It's 11pm on a Tuesday. Alex is doom-scrolling Reddit when they see someone mention One Down: *"It only shows you one thing at a time. Changed my life."* 

Against their better judgment (they've been hurt before), Alex downloads it.

The app opens to a clean, empty screen with a single prompt: *"What's on your mind?"* No tutorials. No sign-up gates. No "let's set up your categories first."

Alex hesitates, then types: *"return amazon package, renew passport, call mum, fix that thing on the website, prep for client call friday"*

They hit enter. 

A brief moment while the AI works, then a context selection appears: **Where are you? What do you have?** Toggles for *Home / Out & About / Phone / Laptop / Internet*. Alex taps *Home* and *Phone*. 

The screen shifts — and there's a single card. **"Call mum"** with two small tags: *"quick win"* and *"phone"*. A small exclamation mark sits in the corner of the card.

Below it, barely visible, the hint of another card in the stack.

Alex feels... nothing. That's actually good. No dread. No "oh god, look at all that."

Curious about the exclamation mark, Alex taps it. The card gently reveals an AI prompt: *"Is there a good time to call? Any topics you want to remember to bring up?"* Alex dismisses it for now — they're not ready to think that hard.

They flick to the next card. **"Return Amazon package"** — tagged *"out & about"* and *"quick win"*. Another exclamation mark. They tap the card to flip it and see the question more prominently: *"Is there a deadline for this return?"* 

Alex types "need to do it by Saturday" and the card absorbs the info without drama. The exclamation mark disappears — the AI has what it needs.

They're not ready to actually *do* anything yet — it's 11pm — so they just close the app.

The next morning, Alex opens One Down while waiting for coffee. Context selection appears again. They toggle *Home* and *Laptop*.

A card appears: **"Fix that thing on the website"** — tagged *"laptop"* and *"internet"*. But Alex notices the *"Out & About"* toggle has a small exclamation icon beside it. They tap it.

The context switches and a card appears with an urgent tag: **"Return Amazon package"** — *"needs action by Saturday"*. The AI is quietly tracking the deadline.

Alex leaves the house that morning with one thing in mind. They actually return the package.

Back home, they open the app. They tap *"Done"* on the card and watch a satisfying star animation as the card completes. A new card slides into view: **"Call mum"** — still a quick win, still waiting.

*"Huh,"* they think. *"This might actually work."*

**Requirements revealed:** Brain dump input, AI task parsing, context selection, one-card focus, AI-prompted refinement (deadlines), task size tags (quick win/big time), context requirement tags, deadline urgency tracking, completion rewards

---

### Journey 2: Alex's Core Loop — "The 5-Minute Productivity Burst"

**User:** Alex (31, freelance designer, ADHD)  
**Scenario:** Two weeks into using One Down, 10 minutes between client calls  
**Emotional state:** Curious energy burst, willing to knock something out

Alex's phone shows 10 minutes until their next call. Instead of doom-scrolling (their usual move), they open One Down. They're curious what they can knock out.

Context selection: *Laptop* ✓ *Home* ✓ *Internet* ✓ — all available. No exclamation marks today, which means nothing urgent is lurking in other contexts. Good.

A card appears: **"Review client contract changes"** — tagged *"laptop"* and *"big time"*. That's a 30-minute job. Not now.

Alex flicks right. Next card: **"Reply to Sarah about Friday"** — *"quick win"*, *"internet"*. Perfect. They tap the card to flip it and see the task details. A small *"Start"* button sits at the bottom.

They tap *Start*. The card expands smoothly to fill the screen — this is the **Task Running screen**. The task title is prominent, any notes they added are visible, and there's a *"Done"* button waiting.

They fire off a quick Slack message to Sarah. Done. They tap *"Done"*.

The screen rewards them: stars spiral into their collection counter, the card crumples and flies away, and the next card slides smoothly into view.

**"Check car MOT date"** — *"quick win"*, *"phone"*. 

Alex hesitates. They could check this, but they're not feeling it. They flick right instead.

**"Book dentist appointment"** — *"quick win"*, *"phone"*. Nope, still not feeling phone calls.

They flick again.

**"Organize desktop files"** — *"quick win"*, *"laptop"*. 

That's the one. Low stakes, low effort, satisfying. They tap *Start*, spend 5 minutes dragging folders around, and tap *Done*.

More stars. The stack reshuffles. Alex closes the app with 2 minutes to spare, feeling genuinely accomplished.

The key insight: Alex never saw a list of 25 tasks. They saw three cards, picked one, and left with momentum.

**Requirements revealed:** Context filtering, curated card stack (not infinite list), quick wins vs big time modes, task running screen, flick to browse stack, completion animations, star rewards

---

### Journey 3: Alex's Avoidance Recovery — "Coming Back After Ghosting"

**User:** Alex (31, freelance designer, ADHD)  
**Scenario:** Hasn't opened One Down in 12 days after a rough patch  
**Emotional state:** Dreading the guilt, expecting punishment from the app

Alex stares at the One Down icon on their phone. They haven't opened it in 12 days. The familiar dread starts: *"There's probably 30 things in there now. Half of them are overdue. This is going to be brutal."*

They tap the icon anyway.

The app opens. No notification badges. No "You've been away!" guilt trip. Just a gentle card before context selection: **"Welcome back! Here's what happened while you were away."**

They tap it. A simple summary appears:
- **3 tasks** hit their deadlines (shown with a small ⚠️)
- **12 tasks** are still waiting patiently
- **1 task** was auto-suggested as "ready to cut loose?" (the passport renewal that's been sitting there for 6 months)

No shame. No red badges. No "YOU MISSED 3 DEADLINES." Just facts.

Alex feels something unexpected: relief. The app isn't mad at them.

They tap *"Let's see what's up"* and land on context selection. They toggle *Home* and *Phone*.

The first card isn't one of the overdue ones. It's a quick win: **"Water the plants"** — something easy, something achievable right now.

Alex completes it. Stars. Satisfaction.

They flick to the next card. **"Return Amazon package"** — marked with a small *"deadline passed"* label, but no screaming red. The card gently notes: *"This was due Saturday. Still want to try it?"*

Alex sighs. They already returned it with a late fee. They tap *"Cut it loose"* — and a gentle animation releases the card. It floats away. No drama. No failure screen.

The next card: **"Renew passport"** — with a soft prompt: *"This one's been waiting a while. Want to keep it, cut it loose, or break it down into smaller steps?"*

Alex isn't ready to deal with the passport yet. They tap *"Keep it"* — the card stays, no judgment.

After 5 minutes, they've completed 2 quick wins, released 1 expired task, and acknowledged 1 that needs attention later. They close the app feeling lighter, not heavier.

The app did the worrying while they were away. It didn't punish them for coming back.

**Philosophy note:** Allowing "cut loose" *after* a deadline normalizes cutting loose *before* deadlines too — reducing guilt when life gets overwhelming.

**Requirements revealed:** Gentle return experience (no guilt), absence summary, overdue tasks shown softly, "cut it loose" action, stale task prompts, first card shown is achievable (not scary), keep/release/breakdown options

---

### Journey 4: Sam's Context Switching — "5 Minutes Between Meetings"

**User:** Sam (38, product manager, neurotypical)  
**Scenario:** 5 minutes between a Zoom call and picking up kids  
**Emotional state:** Work brain fried, looking for a tiny win

It's 3:25pm. Sam just ended a client call and has exactly 5 minutes before they need to leave to get the kids. Their work brain is fried, but there's a tiny window of energy.

They pull out their phone and open One Down. Sam's been using it for about a month now — it's where "life stuff" lives, away from Jira and Slack.

Context selection appears. Sam toggles: *Phone* ✓ *At Home* ✓ 

A card appears: **"Cancel gym membership"** — *"quick win"*, *"phone"*, *"internet"*. 

Sam's been avoiding this for weeks. But looking at it alone, without the 15 other things they've been ignoring, it suddenly seems... doable?

Since this task has been skipped multiple times, the card shows a subtle prompt at the bottom: *"Try a micro-start?"*

Sam taps it. The app suggests the tiniest possible first action: **"Open the phone dial-pad."**

That's it. That's the whole micro-task.

Sam almost laughs. But they tap the phone icon. The dialer opens.

Now they're *in it*. They flip back to One Down, tap the card to see the notes section. There it is — Sam added this last time they were triaging: *"Call 0800-XXX-XXXX, membership #: 12345, expect 5 min hold."*

They dial. Hold music. 2 minutes pass. Someone picks up. They cancel. It takes 4 minutes total.

They tap *Done*. Stars spin. The card crumples and flies away.

**"Book kids' haircuts"** slides into view — but Sam's already grabbing their keys. They close the app.

One task. Done. Five minutes. Sam feels a tiny hit of accomplishment as they walk to the car.

The key insight: The app didn't solve the task for Sam — it just broke the initiation barrier with a micro-task so small it felt silly *not* to do it.

**Requirements revealed:** Works for neurotypical users (not ADHD-only), personal/work separation use case, auto-suggested micro-tasks for avoided tasks, notes section for user-added details, initiation barrier breaking, fast completion loop

---

### Journey Requirements Summary

| Capability Area | Revealed By Journey |
|-----------------|---------------------|
| **Brain dump input** | Journey 1 |
| **AI task parsing & extraction** | Journey 1 |
| **Context selection (location/resources)** | All journeys |
| **One-card focus UI** | All journeys |
| **AI-prompted refinement (deadlines, details)** | Journey 1 |
| **Task size tags (quick win / big time)** | Journey 1, 2 |
| **Context requirement tags** | All journeys |
| **Deadline urgency tracking** | Journey 1, 3 |
| **Task running screen** | Journey 2, 4 |
| **Completion animations & rewards** | Journey 2, 3, 4 |
| **Curated stack (flick to browse)** | Journey 2 |
| **Gentle return experience** | Journey 3 |
| **"Cut it loose" action** | Journey 3 |
| **Stale task prompts** | Journey 3 |
| **Auto-suggested micro-tasks** | Journey 4 |
| **Notes section (user-added details)** | Journey 4 |
---

## Innovation & Novel Patterns

### Philosophy as Product: The True Differentiator

One Down's innovation isn't a technical breakthrough — it's philosophy embedded into design. The moat is the *feel* of every micro-decision, not features competitors can clone.

**Core Innovation Insight:** Traditional todo apps treat tasks as a user's responsibility to organize and manage. One Down inverts this: the app becomes a *task caretaker* that handles the mental burden so users can focus on doing.

### Detected Innovation Areas

| Innovation | What It Challenges | Why It Matters |
|------------|-------------------|----------------|
| **One-card focus UI** | List-based interfaces | Eliminates decision fatigue at the design level — you can't be overwhelmed by one card |
| **Task caretaker philosophy** | User-as-organizer model | The app does the worrying, tracking, and surfacing — users just act |
| **"Cut it loose" as liberation** | Complete-or-fail binary | Celebrating task abandonment reduces guilt and cognitive load |
| **Context-first surfacing** | Priority-first sorting | Shows what's actionable *right now* based on location and resources |
| **Themeless gamification** | RPG/forest/fantasy themes | Universal appeal without alienating users who find themes juvenile |
| **Anti-nagging philosophy** | Helpful reminders | No guilt-inducing notifications — only challenge, novelty, or genuine urgency |

### Market Context

The productivity app market is saturated with feature-rich todo apps that ultimately create more stress than they relieve. Research shows:
- Procrastination is emotional, not lazy — traditional apps amplify negative feelings
- Choice overload paralyzes — more options lead to worse decisions or no decision
- Single-tasking beats multitasking — 40% faster completion with full focus

One Down's innovation is *removing* rather than adding — stripping away the cognitive burden that makes todo apps feel like work.

### Validation Approach

These innovations are philosophical rather than technical, so validation is behavioral:

| Signal | Measurement |
|--------|-------------|
| Users open without dread | App opens per week, session initiation patterns |
| Reduced decision time | Time from app open to task engagement |
| Liberation over guilt | "Cut it loose" usage patterns, return rates after cuts |
| Context works | Completion rates for context-filtered tasks |
| Rewards feel right | Engagement metrics, skip vs. complete ratios |

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| "One card" feels limiting | Small curated stack (3-5) with flick browsing — choice without overwhelm |
| Philosophy doesn't translate | Early dogfooding, qualitative feedback loops |
| Themeless gamification is boring | Focus on tactile satisfaction, premium feel over complexity |
| Anti-nagging misses deadlines | Proactive but non-guilt deadline surfacing — "this needs action by X" |

---

## Mobile App Specific Requirements

### Platform Overview

**Framework:** React Native Expo (cross-platform iOS/Android)  
**Primary Platforms:** iOS, Android  
**Minimum OS Versions:** TBD during implementation (target modern versions only to leverage latest APIs)

### Platform Requirements

| Requirement | iOS | Android |
|-------------|-----|---------|
| Target versions | iOS 15+ | Android 10+ (API 29) |
| Store | App Store | Google Play |
| Framework | React Native Expo | React Native Expo |
| Code sharing | ~95% shared code | ~95% shared code |

### Device Features

| Feature | MVP | Future | Notes |
|---------|-----|--------|-------|
| **Haptics/Vibration** | ❌ | v0.2+ | Deferred — core loop validation doesn't depend on haptics. Better to nail visual/interaction feel first, then layer in subtle haptics for completions, card interactions, rewards. |
| **Voice Input** | ❌ | v0.2+ | Explore both OS transcription and Whisper.cpp for on-device offline (cost savings + offline capability) |
| **Biometrics** | ❌ | ❌ | Not needed — no sensitive data requiring protection |
| **Widgets** | ❌ | v1.x+ | Home screen quick capture and task view |
| **Watch Companion** | ❌ | v1.x+ | Quick capture from wrist |

### Offline Mode

**Strategy:** Progressive offline capability

| Phase | Capability |
|-------|------------|
| MVP | Online-only for AI features; basic task viewing works offline |
| v0.3 | Cached AI decisions; rules-based prioritization when offline |
| v0.3+ | Whisper.cpp on-device transcription for offline voice input (exploring for cost savings) |
| v1.x+ | Pre-generated message variants for rich offline experience |

**Critical Constraint:** Core task viewing must work offline. AI-powered features degrade gracefully with clear user feedback.

### Push Notification Strategy

**Philosophy:** Anti-nagging. Notifications only for:
- ⏰ **Genuine urgency** — Deadline approaching for actionable task
- 🎯 **Challenge/novelty** — "Quick 5 minutes?" invitation framing
- 🏆 **Celebration** — Streak acknowledgments, milestone rewards

**Never:**
- "You haven't opened the app in 3 days"
- "You have X tasks waiting"
- Guilt-inducing reminders

**Technical:**
- iOS: APNs via Expo Notifications
- Android: FCM via Expo Notifications
- User controls frequency and types in settings

### App Store Compliance

**Subscription Model:**
- In-app subscription only (no external payment prompts)
- Apple App Store: 15% commission (small business program)
- Google Play: 15% commission (first $1M/year)
- Already factored into unit economics (see Success Criteria)

**Store Guidelines:**
- No regulatory concerns (general productivity app)
- Standard app review process expected
- No external purchase prompts that violate guidelines

### Technical Stack Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React Native Expo | Fast iteration, cross-platform, familiar ecosystem |
| Animation | Reanimated 3 | Smooth card physics, satisfying interactions |
| State | TBD | Zustand likely for simplicity |
| Backend | Fastify + Postgres | Familiar, performant, cost-effective |
| AI | Gemini Flash 3 / Flash-Lite 2 | Premium initially, then higher usage → best cost/capability ratio per AI cost analysis |
---

## Functional Requirements

> **Capability Contract:** These FRs define WHAT the product can do. UX designers will design only for these capabilities. Architects will support only these capabilities. Epics will implement only these capabilities. If it's not here, it won't exist.

### Task Capture

- **FR1:** User can enter free-text brain dump to capture multiple tasks at once
- **FR2:** System can parse brain dump text and extract individual tasks using AI
- **FR3:** User can add a single task via quick-add input
- **FR4:** System can infer deadlines, task size, and context requirements from natural language (with confidence thresholds)
- **FR5:** User can manually add or edit context requirements on a task (home, office, laptop, phone, internet, errand)

### Task Card Stack

- **FR6:** User can view a curated stack of actionable tasks as cards
- **FR7:** System can curate the card stack based on current context selection and calculated importance/urgency
- **FR8:** User can tap a card to flip it and see details, notes, and task start button
- **FR9:** User can flick/swipe through the card stack to browse alternatives
- **FR10:** User can see task size indicators on cards (quick win vs. big time)
- **FR11:** User can see visual reward indicators on cards reflecting potential star value (more urgent/larger = more reward)
- **FR12:** User can see a "check needed" indicator on cards that need confirmation of AI-inferred info (dates, etc.) or have missing context/deadline details

### Context Selection

- **FR13:** User can select current context (location and available resources) to filter the stack
- **FR14:** System can filter tasks to show only those actionable in current context
- **FR15:** User can see a visual indicator when other contexts have urgent tasks
- **FR16:** User can switch contexts and see the stack update in real-time
- **FR17:** System can display empty context state with message prompting user to check other contexts
- **FR18:** User can see greyed-out context options when those contexts have no actionable tasks

### Task Execution

- **FR19:** User can start a task (card expands to task running screen, task gets "started" status)
- **FR20:** User can continue a previously started task (card shows "Continue" instead of "Start")
- **FR21:** User can view task details and any notes on the task running screen
- **FR22:** User can add notes to a task during execution
- **FR23:** User can request AI breakdown help from task details or task running screen
- **FR24:** User can mark a task as complete
- **FR25:** System can display satisfying completion feedback (animation, stars)

### Task Management

- **FR26:** User can edit task title, description, deadline, and context requirements
- **FR27:** User can skip a task (defer to later without completing)
- **FR28:** User can "cut loose" a task (remove without guilt)
- **FR29:** System can display celebratory animation when user cuts a task loose
- **FR30:** User can view a task overview list (all tasks, not just curated stack)
- **FR31:** User can bulk-select tasks in overview for delete or archive (via multi-select mode)
- **FR32:** System can identify and flag stale tasks (long-running without action OR frequently swiped past)
- **FR33:** System can prompt user about stale tasks (keep, cut loose, or break down)

### Quick Wins / Big Time Modes

- **FR34:** User can toggle between Quick Wins mode and Big Time mode
- **FR35:** System can curate Quick Wins stack to show easy, momentum-building tasks
- **FR36:** System can curate Big Time stack to show challenging, substantial tasks

### AI Task Intelligence

- **FR37:** System can prompt user for missing deadline information when detecting time-sensitivity
- **FR38:** System can prompt user to confirm AI-inferred critical information (deadlines, due dates)
- **FR39:** System can suggest micro-tasks (smallest first step) for frequently skipped tasks
- **FR40:** System can break down large tasks into smaller subtasks using AI
- **FR41:** User can accept or reject AI-suggested task breakdowns
- **FR42:** User can revise AI task breakdown by providing additional info (added to task notes and app context)

### Rewards & Motivation

- **FR43:** User can earn stars for completing tasks
- **FR44:** User can earn more stars for completing relatively more urgent tasks from the list
- **FR45:** User can earn more stars for completing larger tasks
- **FR46:** User can earn bonus stars for completing tasks further before their deadline (up to a limit)
- **FR47:** User can earn small rewards for confirming AI-inferred info or adding identified missing info
- **FR48:** User can see accumulated stars count
- **FR49:** User can view completed tasks in a "done box" area

### Return Experience

- **FR50:** System can present gentle welcome-back summary after absence (no guilt)
- **FR51:** User can see what happened while away (deadlines passed, stale tasks) and enter triage mode for fast keep/cut/defer decisions
- **FR52:** System can present first card as an achievable quick win after absence

### Push Notifications

- **FR53:** User can receive deadline urgency notifications when tasks become time-critical
- **FR54:** User can receive challenge/novelty notifications inviting engagement
- **FR55:** User can configure notification preferences (types, frequency)
- **FR56:** System will not send guilt-inducing reminder notifications

### Account & Subscription

- **FR57:** User can create an account
- **FR58:** User can subscribe to premium via in-app purchase
- **FR59:** User can use core features on free tier
- **FR60:** User can access premium features when subscribed
- **FR61:** User can tap a premium discovery icon (sparkle) to view premium features page

### Data & Sync

- **FR62:** User can have tasks synced across devices
- **FR63:** User can view tasks offline (core viewing capability)
- **FR64:** User can create tasks manually offline (basic entry without AI parsing)
- **FR65:** System can gracefully degrade AI features when offline

---

## Non-Functional Requirements

> **Quality Attributes:** These NFRs define HOW WELL the system must perform. Only categories relevant to One Down are included.

### Performance

| ID | Requirement | Notes |
|----|-------------|-------|
| **NFR-P1** | Animations maintain 50+ FPS on devices from 2020 (e.g., Pixel 5) | Smooth feel on mid-range; allows headroom |
| **NFR-P2** | Cold start to usable state in <2 seconds (target), <⁠3 seconds (acceptable) | First card visible within this window |
| **NFR-P3** | AI parsing/breakdown responds within 3 seconds (target <2s for snappy feel) | Loading indicator fades in after 1s wait, fades out on completion; "taking a bit longer" message after 4s |
| **NFR-P4** | Card interactions (flip, flick, complete) feel instant (<100ms response) | Critical for tactile satisfaction |

### Accessibility

| ID | Requirement | Notes |
|----|-------------|-------|
| **NFR-A1** | Core flows designed following WCAG AA patterns | Not a formal audit; enables future compliance |
| **NFR-A2** | UI components support screen readers structurally | Basic VoiceOver/TalkBack compatibility enabled; testing post-MVP |
| **NFR-A3** | Reduced motion mode available | **Deferred to post-MVP** |
| **NFR-A4** | ADHD-first design patterns throughout (low cognitive load, clear focus, minimal distractions) | Core philosophy; already embedded |

### Reliability

| ID | Requirement | Notes |
|----|-------------|-------|
| **NFR-R1** | Core task viewing works offline | Covered by FR63 |
| **NFR-R2** | Manual task creation works offline (basic entry without AI) | Covered by FR64; fallback required |
| **NFR-R3** | AI features gracefully degrade when offline (clear feedback, no silent failure) | Covered by FR65 |
| **NFR-R4** | Sync conflicts resolved by last-content-changed wins | Simple policy; AI merge resolution deferred |
| **NFR-R5** | Data sync completes within 5 seconds of connection restoration | Quick catch-up on reconnect |

### Security

| ID | Requirement | Notes |
|----|-------------|-------|
| **NFR-S1** | User credentials stored securely (device keychain / secure storage) | Standard practice |
| **NFR-S2** | API communications use TLS 1.2+ | Industry standard |
| **NFR-S3** | No sensitive task content logged or transmitted to analytics | User privacy |

### Scalability

| ID | Requirement | Notes |
|----|-------------|-------|
| **NFR-SC1** | Architecture supports 25k MAU without major redesign | Target viability threshold |
| **NFR-SC2** | Database schema supports future multi-device sync expansion | Plan ahead |