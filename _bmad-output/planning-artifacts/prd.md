---
stepsCompleted: [1, 2, 3]
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
lastStep: 3
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
