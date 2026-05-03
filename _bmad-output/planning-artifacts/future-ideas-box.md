# Future Ideas Box 💡

**Document:** Post-MVP feature ideas, explorations, and enhancements  
**Created:** 2025-01-11  
**Last Updated:** 2025-01-18

> Ideas captured here are NOT in scope for MVP. They're parked for future consideration after core loop validation.

---

## v0.2+ Ideas

### Schedule a Time for Tasks

**Idea:** Instead of just swiping past stale/avoided tasks, give users the option to "schedule a time" — a positive action that hides the task (without using the putting-things-off language of delaying or snoozing, rather the positive action of scheduling) until a chosen date/time, then re-surfaces it.

**Potential Implementations:**
- As an option when dealing with stale/avoided tasks (alongside keep, cut loose, break down)
- As a general action available on any card (swipe gesture or card back button)
- Date/time picker with smart defaults ("Tomorrow morning", "This weekend", "Next week")
- Scheduled tasks hidden from stack until their time arrives

**Why this matters:**
- Turns avoidance into positive scheduling — better for ADHD users than guilt-inducing "you skipped this again"
- Reduces stack noise — tasks that aren't relevant right now disappear until they are
- Creates intentionality without the overhead of a full calendar integration

**Open questions:**
- Does this overlap with deadline functionality too much?
- Should scheduled tasks earn a small star reward for the scheduling action itself? (probably not)
- How does this interact with context filtering?

---

### Star Momentum Visualization

**Idea:** Track star acquisition over time to build the feeling of momentum and tasks getting done.

**Potential Implementations:**
- **Graph view:** Line chart showing stars earned over time (day/week/month/YTD toggles)
- **Done card heap:** Visual accumulation of completed task cards — grows over time
- **Toggle timeframes:** Last day, week, month, year-to-date
- **"Accomplishment mode":** A dedicated view where users can really *feel* accomplished if they want to

**Why this matters:**
- Counteracts the "empty list" problem — even when caught up, users can see their history
- Provides positive reinforcement beyond individual task completion
- Supports the "quiet satisfaction" design principle
- Could be part of the v0.3 "Richer done box" feature

**Open questions:**
- Does viewing history create pressure/guilt, or does it feel celebratory?
- How to design so it's optional/on-demand, not forced?
- Could this be a premium-only feature?

---

## v1.0+ Explorations

### Review Mode vs Go Mode

**Concept:** Two distinct modes for engaging with tasks, each with different vibes and rewards.

**Review Mode:**
- Curates cards that are missing context, deadlines, or details
- User earns small rewards for refining tasks (adding missing info)
- Visual vibe: Cards as "blueprints" — lighter/outlined, work-in-progress feel
- Lower pressure, organizational satisfaction

**Go Mode:**
- Curates cards that are fully ready to work on
- User earns larger rewards for completing tasks
- Further refined by context selection (location/resources)
- Standard card visual — solid, actionable feel

**Why this might be valuable:**
- Separates two distinct mental states: organizing vs doing
- Creates a low-pressure way to improve task data quality
- "Review mode" could be a good activity when you have a few minutes but aren't ready to commit to real work
- Rewards task refinement, not just completion

**Open questions:**
- Does this add too much complexity?
- Would users understand/use two modes naturally?
- How does this interact with Quick Wins / Big Time modes?

**Status:** Worth prototyping after core loop is validated.

---

### Conversational AI Task Assistance

**Current MVP Approach:** Formulaic "Help me with this" — pre-set buttons (*"Break this down"*, *"First micro-task"*) that generate tiny first steps.

**Future Possibility:** Full conversational back-and-forth problem-solving with AI.

**Why deferred:**
- Simpler = cheaper AI costs
- Formulaic approach may be sufficient and more aligned with "low cognitive load" philosophy
- Micro-tasks are the proven intervention for ADHD initiation barriers

**Revisit when:** User feedback shows demand for deeper conversational assistance.

---

### Reduced Motion Mode

**What:** Accessibility option to minimize animations for users with motion sensitivity or on older devices.

**Why deferred:** Core loop validation first; animations are part of the tactile satisfaction we're testing.

**Future implementation:**
- System preference detection (prefers-reduced-motion)
- In-app toggle in settings
- Graceful fallback to simpler transitions

---

### Full Screen Reader Audit

**What:** Comprehensive VoiceOver (iOS) and TalkBack (Android) testing and optimization.

**MVP state:** UI components structured to support screen readers, but not formally tested.

**Why deferred:** Prioritizing core loop validation; formal audit is time-intensive.

**Future implementation:**
- Manual testing with VoiceOver/TalkBack
- Fix any navigation or labelling issues
- Document accessibility patterns for future development

---

### AI-Powered Sync Conflict Resolution

**What:** When sync conflicts occur (same task edited on multiple devices), use AI to intelligently merge changes rather than "last write wins."

**Current policy:** Last-content-changed wins (simple, predictable).

**Why deferred:** Low priority; conflicts should be rare for single-user app. Revisit if multi-device usage patterns show conflict frequency.

---

### Customizable Star Weights (Power Users)

**What:** Allow power users to customize the star reward weights — e.g. increase reward for cutting loose, decrease for subtasks, or tune deadline bonuses.

**Why interesting:** Different users have different motivational profiles. Someone struggling with letting go of tasks might benefit from higher cut-loose rewards. Someone who avoids big tasks might want bigger rewards for Big Time completions.

**Implementation:** Star weights already centralized in config. Expose as a settings screen with sliders or presets (e.g. "Liberation mode", "Challenge mode", "Balanced").

---

### Subtask Star Routing: Direct vs. Bucket

**Question:** Should subtask star rewards go directly to the user's total star count, or accumulate in a "bucket" on the parent task card and only be collected when the parent task is completed?

**Direct (current):** Stars go to total immediately. Simple, instant gratification.

**Bucket:** Stars accumulate visually on the card and get paid out on task completion. Creates anticipation and a bigger reward moment when the parent task is Done. Risk: if user cuts loose the parent, do bucket stars get lost? (Probably should still pay out.)

**Explore during dogfooding:** Which approach feels more motivating in practice?
