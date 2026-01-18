# Future Ideas Box 💡

**Document:** Post-MVP feature ideas, explorations, and enhancements  
**Created:** 2025-01-11  
**Last Updated:** 2025-01-18

> Ideas captured here are NOT in scope for MVP. They're parked for future consideration after core loop validation.

---

## v0.2+ Ideas

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
