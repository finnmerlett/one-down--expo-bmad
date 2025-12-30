---
stepsCompleted: [1, 2, 3]
inputDocuments: []
session_topic: 'One Down - Task overwhelm reducer product exploration'
session_goals: 'Feature ideas, UX refinements, monetisation strategy, market differentiation, backend/DevOps exploration'
selected_approach: 'ai-recommended'
techniques_used: ['inner-child-conference', 'scamper-method', 'constraint-mapping']
ideas_generated: 27
context_file: '_bmad/bmm/data/project-context-template.md'
technique_execution_complete: true
---

# Brainstorming Session Results

**Facilitator:** Finn
**Date:** 2025-12-30

## Session Overview

**Topic:** One Down - Task overwhelm reducer with card-stack UI
**Goals:** Feature ideas, UX refinements, monetisation strategy, market differentiation, backend/DevOps architecture

### Context & Constraints (Sacred Cows)

| Principle | Detail |
|-----------|--------|
| **Minimal Onboarding** | Absolute minimum setup, intuitive from first launch - we're preventing overwhelm |
| **Ultra-Low Pricing** | Target £1/month premium - so low it feels silly NOT to pay. May need AI usage caps |
| **Core Purpose** | Track trailing todos so you don't worry/forget/avoid. Smart prioritisation, ADHD-friendly techniques |
| **Not a Project Tracker** | Task-focused, not project management (may evolve later) |
| **"Cut it Loose" Philosophy** | Explicitly support abandoning tasks - acknowledge the value of reduced cognitive load |
| **Design Aesthetic** | Clean, elegant, modern but friendly. Interactive/bouncy elements, satisfying animations |
| **Reward System** | Stars/currency for hard tasks, early completion, daily goals. Unlock cosmetics/features. No theme (no pets/adventure) - just natural app progression |
| **Tech Stack** | React Native Expo (decided). Backend/DevOps TBD |

### Deprioritised Areas
- User personas (Finn IS the user)
- Frontend framework debates (Expo confirmed)

---

## Technique 1: Inner Child Conference

**Focus:** Channel pure childhood curiosity to cut through adult complications

### Key Discoveries

#### 1. The "Nyah" Problem
Adults resist being told what to do — even by their own internal voice. The app must feel like *choice*, not *command*.

> "Even when the bossy voice is *inside* them, they still wanna tell it NO"

**Implication:** No nagging. Notifications only for challenge/novelty/urgency, never reminders.

#### 2. Fidget-First Design
The app should be so tactile and pleasant that you open it like a toy, not a chore list. **Habit hijacking:** replace doom-scrolling with productive play.

#### 3. One Card Focus
Overwhelm = seeing everything. Calm = seeing *one next thing*. The first screen shows a single achievable task.

#### 4. Card Interaction Concepts

| Interaction | Description |
|-------------|-------------|
| **Flip-flick away** | Card flips over & over, tumbles into background |
| **Drag & spring-back** | Physics bounce to centre, 3D rotation toward drag direction |
| **Slingshot complete** | Pull down → elastic launch → flies into star box + explosion |
| **Two-finger rotate** | Extra fidget-worthy interactivity |
| **Tap to flip** | Reveals details + "Get Started" button → tackling approaches screen |
| **Task complete → Crumple** | Scribble-to-scrunch, flick at basketball hoop for bonus stars |

#### 5. Cathartic Task Release (Giving Up)

"Cut it loose" should feel like liberation, not failure:

| Animation | Emotional Tone |
|-----------|----------------|
| Paper airplane sunset | Hopeful, bittersweet |
| Burning with gentle ashes | Cathartic, peaceful |
| Seeds → Tree growth | Regenerative, cyclical |
| Chinese lanterns | Ceremonial, beautiful |
| Wolves howl & smile | Playful closure |

**Unlockable destruction animations** = earned reward for acknowledging limits

#### 6. Daily Bonfire Ritual
End-of-day celebration: completed tasks fall from "done box", set ablaze. Bigger day = bigger bonfire → explodes into stars.

#### 7. Stars as Applause
> "The stars are like... applause. You don't DO things for applause, but it feels nice when people clap!"

Stars unlock themes, animations, power-ups. But they're **sprinkles, not the meal**.

---

## Technique 2: SCAMPER Method

### Substitute
- **Cards stay.** Bubbles too tacky, pebbles could be an alternative but not really the vibe of the app. We want to keep it clean and functional, rather than a themed thing like spirituality/zen garden
- **Text input first** (phones have voice typing). Voice recognition layer later.
- **Stars → Rings/Checkmarks?** Ties currency directly to completion. Worth exploring.

### Combine
- **Daily review + celebration:** Done box empties, cards spin off or bonfire. User-initiated, prompted after certain hour.
- **Streak → Power-ups:** Invest stars in multipliers that require consistency to profit.

### Adapt
- **Tinder swipe** was original inspiration for card stack
- **Running bonuses** instead of streaks (reset on break, no shame)
- **No timers/habits** — this is about trailing tasks, not focus sessions

### Modify / Magnify / Minify
- **Minimalism is priority.** Stars = touches to the edges of the app. Settings hidden.
- **MVP = basic loop first.** Fancy animations are polish for later.

### Put to Other Uses
- **Tasks only.** No scope creep. Validate core before expanding.

### Eliminate
- ❌ Tutorial (? help corner instead)
- ❌ Nagging notifications
- ❌ Social features
- ❌ Fancy animations in MVP
- ✅ AI-suggested categories, **user-approved**

### Reverse / Rearrange
- **Easy tasks first** → build momentum → "Ready for a challenge" button surfaces harder tasks
- **Yesterday's wins on app open** → start positive, not with obligation pile

---

## Technique 3: Constraint Mapping

### Technical Constraints

| Constraint | Status | Mitigation |
|------------|--------|------------|
| RN animation smoothness | Moderate risk | New architecture, Reanimated. Test early. |
| AI API costs | Manageable | Small models, low tokens. Fair-use cap. Limited/no AI for free tier. |
| Offline fallback | Required | Cache AI decisions, rules-based prioritisation |
| Older device perf | Low priority | Detect frame drops → suggest reduced motion. Later concern. |
| Backend | Fastify + Postgres | Familiar stack. OpenAPI → typed hooks. |

### Resource Constraints

| Constraint | Reality |
|------------|---------|
| Solo dev, spare time | BMAD helps. Ship minimal. |
| <£200 infra until proven | Cheap backend. Serverless or minimal VPS. |
| Backend/DevOps gaps | Lean on AI, careful review. |
| Fast release goal | MVP focus. Iterate. |
| User feedback | Existing solution (Canny/Nolt) or simple in-app form. |

### User/Market Constraints

- **£1-1.50/month** range viable (Play Store 15% for small devs)
- Passion project = prioritise quality over extraction
- Competition exists (Todoist, Things) but differentiation is clear: ADHD-friendly, one-card, anti-overwhelm

### Design Constraints (Fixed)

| Constraint | Reason |
|------------|--------|
| Minimal onboarding | Can't add overwhelm to reduce it |
| No nagging notifications | Core philosophy |
| One card at a time | Anti-overwhelm UX |
| Clean/elegant/friendly | Brand identity |
| Earned cosmetics only | No microtransactions |
| "Cut it loose" celebrated | Mental health angle |

### Real vs Imagined

| Constraint | Classification |
|------------|----------------|
| React Native | **Real** — decided |
| £1/month | **Semi-flexible** — could be £1.50 |
| Solo dev | **Real** for now |
| No nagging | **Real** — philosophy |
| AI for everything | **Imagined** — fallbacks fine |
| Fancy MVP animations | **Imagined** — basic loop first |
| Fastify + Postgres | **Soft preference** |

### Pathways Through Constraints

| Constraint | Pathway |
|------------|---------|
| AI costs | Small models, caching, free tier limits |
| Backend gaps | Familiar stack, AI assistance, security review |
| Solo + spare time | Ruthless MVP, BMAD, ship fast |
| App Store cut | Accept £1-1.50, annual option |
| Offline | Cache + rules-based fallback |
| Animation perf | Mid-range testing, reduced-motion option |

**True Blockers:** None. All constraints have viable pathways.

---

## Summary: Top Ideas & Next Steps

### Core MVP Definition

**Brain dump → AI organises → One card at a time → Mark done → Stress gone.**

Everything else is polish.

### Priority Features (MVP)

1. Text brain-dump input
2. AI task breakdown + categorisation (user-approved)
3. Single-card focus view
4. Simple complete/skip/release actions
5. Basic "done box" accumulation
6. Minimal reward feedback (not full star economy yet)
7. Management of potential problem tasks / avoidance / deadlines
8. Warning user of danger points, providing ways to tackle

### Deferred Features (Post-MVP)

- Fancy physics animations
- Star economy + unlockables
- Power-ups and betting
- Daily bonfire ritual
- Voice input
- Tackling approaches screen
- Yesterday's wins on open
- "Ready for a challenge" mode

### Open Questions for Further Exploration

1. **Checkmarks vs Stars** — which currency feels right?
2. **Backend architecture details** — Fastify + Postgres assumed, explore alternatives?
3. **App Store pricing mechanics** — research actual cut at £1 tier
4. **Integrated user feedback tool** — build or buy?
5. **AI model selection** — which provider/model for low-cost, low-latency?

---

## Session Complete

**Techniques completed:** Inner Child Conference, SCAMPER Method, Constraint Mapping
**Approach:** AI-recommended sequence
**Duration:** ~45 minutes
**Ideas captured:** 27+

