# Development Notes

**Document:** General notes, ideas, and clarifications surfaced over the course of development  
**Created:** 2025-01-11  
**Last Updated:** 2025-01-11

---

## Feature Ideas (Post-MVP)

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

## AI Scope Clarifications

### "Help me with this" — Formulaic, Not Conversational

**What it IS (MVP):**
- Pre-set buttons: *"Break this down"*, *"First micro-task"*, *"I don't know how to start"*
- Alternative phrasing options: *"I just can't"*, *"aaa too large"*
- These generate a first tiny micro-task to overcome initiation barrier
- User can tap *"Generate more"* to see additional breakdown steps if needed

**What it is NOT (MVP):**
- Free-form conversational AI brainstorming
- Back-and-forth problem-solving dialogue
- Looking things up on the internet for users

**Why:**
- Simpler = cheaper AI costs
- Predictable behavior = user trust
- Micro-tasks are the proven intervention for ADHD initiation barriers

**Future consideration:**
Conversational task assistance could be added later if user feedback shows demand, but it's not MVP. The formulaic approach may be sufficient and more aligned with the "low cognitive load" philosophy.

### Auto-Suggested Micro-Tasks for Avoided Tasks

When a task has been avoided multiple times, the app can auto-suggest a very small first step based on:
- Notes content (e.g., if "call XXX" is in notes, suggest "open phone dialer")
- Known requirements (e.g., "find membership number" if noted as required but not present)

This tiny hand-hold overcomes the initiation barrier without complex AI reasoning.

---

## Notes & Observations

*(Space for additional notes captured during PRD workflow)*

