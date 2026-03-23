---
date: 2025-12-31
session_type: party-mode
participants: John (PM), Sally (UX), Winston (Architect), Murat (Test Architect), Amelia (Dev)
project: One Down
extracted_from: product-brief-One-Down-2025-12-31.md
---

# Party Mode Session: One Down

*Participants: John (PM), Sally (UX), Winston (Architect), Murat (Test Architect), Amelia (Dev)*
*Date: 2025-12-31*

---

## Validated Decisions

| Decision | Validation |
|----------|------------|
| **Ultra-low pricing (~£1.50/mo)** | Philosophy-driven competitive edge; lock in users through accessibility, not extraction |
| **AI costs manageable** | Most "smart prioritization" is rules-based; AI limited to task breakdown initially; fair-use caps viable |
| **React Native for MVP** | Ship faster, iterate faster; animations good enough with Reanimated 3; revisit if bottlenecked |
| **Defer voice input** | Built-in transcription fine for v0.2; AI voice streaming is v1.0+ at earliest |

---

## Key Insights & Refinements

### The Moat is Philosophy, Not Features
The competitive advantage isn't a feature list competitors can copy — it's the *philosophy embedded in every micro-decision*: no nagging, one card, "cut it loose" as liberation. This compounds into an intangible *feel* that's hard to replicate without rebuilding from scratch. (John)

### Perception of Intelligence Matters
If "smart prioritization" is mostly rules-based, the *presentation* must make users feel cared for. Microcopy, animation timing, and contextual messages can create perceived intelligence even with simple logic. (John)

### Context Filtering UX Refined
- **No pre-gate screen** — context toggles live directly on the card view
- Cards visible immediately; filtering adjusts the stack in real-time
- Consider: translucent stack until context confirmed? Or filtering purely optional?
- **Reframe "shuffle"** — use "show me something else" or "surprise me" to avoid undermining trust in prioritization (Sally)

### Trust-Building: The Brain Visualization Concept
**Core idea:** A "brain" icon in the corner that expands to show a living graph/flowchart of all tasks and their prioritization logic.

- Nodes = tasks, sized by importance/urgency
- Connections = dependencies or sequencing
- Glow/color = deadline approaching ("heating up")
- Tap to edit any node

**Why it matters:** Transforms prioritization from "magic black box" to "visible algorithm" — users can verify, correct, and trust. Becomes a feature, not an escape hatch. (Sally, Winston)

**Timing:** This is complex — defer to v1.1. Ship MVP with simple "task list" view for trust-building, invest in visualization once core loop is validated. (Winston, Amelia)

### Deadline Intelligence: Graceful Prompting
**The risk:** "App does the worrying" promise fails if a deadline is missed because the user forgot to add it and AI didn't infer correctly.

**Solution:** Proactive, graceful prompting for missing information:
- "I noticed this might be time-sensitive — when does it need to be done?"
- Builds trust AND collects data to improve prioritization
- Not nagging — framed as the app caring (Murat)

---

## MVP Scope: Tightened

**Ship in v0.1:**
- Text brain-dump → AI splits into tasks
- Card stack view with basic swipe animations
- Tap card to flip → edit/refine
- Context filtering (toggles on card view)
- Mark complete → reward feedback (stars/rings, simple)
- Basic "task overview" view (simple list, not graph)

**Defer to v0.2+:**
- Voice input (phone built-in first)
- Brain visualization graph
- "Why can't I do this?" context prompting
- Advanced gamification (unlockables, ceremony animations)
- "Cut it loose" ceremony animations

**Rationale:** Validate core loop fast — does one-card focus reduce anxiety? Does context filtering work in practice? Ship, dogfood, learn. (Amelia)

---

## Dangling Items for Future Party Mode

If we resume party mode, tackle these in priority order:

| Priority | Item | Owner | Notes |
|----------|------|-------|-------|
| 1 ◻️ | **Task overview UX for MVP** | Sally | What's the minimum trust-building view? List with deadlines? Grouped by context? |
| 2 ✅ | **AI cost analysis** | Winston | ✅ Completed, results at [ai-cost-analysis-2025-01-03.md](_bmad-output/analysis/ai-cost-analysis-2025-01-03.md) |
| 3 ◻️ | **Deadline prompting UX** | Sally + Murat | How to ask for deadlines without feeling like nagging? Microcopy matters |
| 4 ◻️ | **Animation feasibility in RN** | Winston + Amelia | Spike: test card physics in Reanimated 3, identify performance ceiling |
| 5 ◻️ | **Notification strategy** | John | Define "challenge/novelty" notifications concretely — what do they actually say? |
| 6 ◻️ | **Brain visualization spec** | Sally | Full concept for v1.1: graph layout, interaction model, performance considerations |
