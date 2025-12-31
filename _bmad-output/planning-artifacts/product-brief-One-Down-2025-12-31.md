---
stepsCompleted: [1]
inputDocuments:
  - brainstorming-session-2025-12-30.md
  - domain-productivity-psychology-research-2025-12-31.md
date: 2025-12-31
author: Finn
---

# Product Brief: One Down

## Executive Summary

**One Down** is a task management app designed to eliminate the ambient anxiety of trailing todos. Unlike traditional todo apps that show endless lists and expect users to do the cognitive work of prioritization, One Down presents **one actionable task at a time** — the right task, at the right moment, with the right context.

Built for the ADHD brain but designed for everyone, One Down acts as a **reliable task caretaker** that surfaces tasks only when they can be acted upon, breaks down overwhelming items into achievable first steps, and makes task completion feel satisfying rather than stressful.

The core philosophy: **The app does the worrying, so you don't have to.**

---

## Core Vision

### Problem Statement

Traditional todo apps amplify anxiety instead of reducing it. They present endless scrolling lists, expect users to manually prioritize, and send nagging notifications that create guilt rather than action. The result: users avoid opening the app entirely, tasks slip through the cracks, and the mental burden of remembering what needs to be done remains constant.

The specific pain point: **trailing tasks that create ambient anxiety**. Returning packages, renewing passports, prepping for conferences — tasks that aren't urgent *right now* but will become critical if forgotten. Users expend significant mental energy worrying about these tasks, avoiding them because they don't feel immediately critical, then suffering when something slips through.

### Problem Impact

- **Constant low-grade anxiety**: The nagging feeling that something has been forgotten
- **Decision fatigue**: Opening a todo app means facing "what should I do first?" every time
- **Avoidance spiral**: Todo apps become stressful to open, leading to more avoidance
- **Missed deadlines**: Important but non-urgent tasks slip until they become crises
- **Mental load tax**: Significant cognitive energy spent worrying instead of doing

### Why Existing Solutions Fall Short

| Gap | What Existing Apps Do | What Users Need |
|-----|----------------------|-----------------|
| **Information overload** | Show everything at once | Show one achievable task at a time |
| **No context awareness** | Treat all tasks equally regardless of situation | Filter by what's actionable *right now* (location, resources, energy) |
| **Nagging notifications** | Remind at scheduled times regardless of context | Notify only when actionable, using challenge/novelty instead of guilt |
| **High setup friction** | Require extensive categorization and configuration | Work immediately from a brain dump with minimal setup |
| **No prioritization intelligence** | Expect users to manually decide what's important | Smart AI-powered prioritization that surfaces the right task at the right time |

### Proposed Solution

One Down reimagines task management around a single principle: **reduce cognitive load at every step**.

**Core Experience:**
1. **Brain dump capture** — Voice or text, minimal friction, AI organizes
2. **Context selection** — Tap where you are / what you have available
3. **One card appears** — The single best task you can do right now
4. **Complete, skip, or release** — Simple actions, satisfying feedback
5. **Never worry** — The app tracks deadlines, surfaces urgency at the right time, handles the mental load

**Key Capabilities:**
- **Smart Prioritization**: AI-powered task sequencing based on urgency, context, and user patterns
- **Quick Wins / Big Time Modes**: Start with easy momentum-builders or tackle challenging items when ready
- **AI Task Breakdown**: Large tasks auto-decomposed into achievable first steps
- **Contextual Filtering**: Show only tasks doable with current resources (home/office/laptop/phone)
- **Deadline Intelligence**: Surfaces time-sensitive tasks at the optimal moment — not too early, not too late
- **"Cut it Loose" Support**: Explicitly supports releasing tasks that no longer serve you — liberation, not failure

### Key Differentiators

| Differentiator | What It Means |
|----------------|---------------|
| **One-Card Focus** | UI literally shows one task — decision fatigue eliminated at the design level |
| **Task Caretaker Philosophy** | The app worries so you don't; surfaces tasks only when actionable |
| **Themeless Gamification** | Satisfying, rewarding experience without RPG/forest/fantasy themes — universal appeal |
| **Ultra-Low Pricing** | ~£1.50/month — so cheap it feels silly NOT to pay |
| **ADHD-First Design** | Built on evidence-based strategies (task breakdown, dopamine rewards, low-effort flow) |
| **Zero-Friction Onboarding** | Works from first task; brain dump to organized list instantly |
| **Challenge Notifications** | Never nags — uses novelty, challenge, or urgency framing instead |

**In one sentence:** *One Down is the todo app that manages your trailing tasks for you, shows you one thing at a time, and makes getting things done feel almost accidental.*

---

## Team Review: Party Mode Insights

*Participants: John (PM), Sally (UX), Winston (Architect), Murat (Test Architect), Amelia (Dev)*
*Date: 2025-12-31*

### Validated Decisions

| Decision | Validation |
|----------|------------|
| **Ultra-low pricing (~£1.50/mo)** | Philosophy-driven competitive edge; lock in users through accessibility, not extraction |
| **AI costs manageable** | Most "smart prioritization" is rules-based; AI limited to task breakdown initially; fair-use caps viable |
| **React Native for MVP** | Ship faster, iterate faster; animations good enough with Reanimated 3; revisit if bottlenecked |
| **Defer voice input** | Built-in transcription fine for v0.2; AI voice streaming is v1.0+ at earliest |

### Key Insights & Refinements

#### The Moat is Philosophy, Not Features
The competitive advantage isn't a feature list competitors can copy — it's the *philosophy embedded in every micro-decision*: no nagging, one card, "cut it loose" as liberation. This compounds into an intangible *feel* that's hard to replicate without rebuilding from scratch. (John)

#### Perception of Intelligence Matters
If "smart prioritization" is mostly rules-based, the *presentation* must make users feel cared for. Microcopy, animation timing, and contextual messages can create perceived intelligence even with simple logic. (John)

#### Context Filtering UX Refined
- **No pre-gate screen** — context toggles live directly on the card view
- Cards visible immediately; filtering adjusts the stack in real-time
- Consider: translucent stack until context confirmed? Or filtering purely optional?
- **Reframe "shuffle"** — use "show me something else" or "surprise me" to avoid undermining trust in prioritization (Sally)

#### Trust-Building: The Brain Visualization Concept
**Core idea:** A "brain" icon in the corner that expands to show a living graph/flowchart of all tasks and their prioritization logic.

- Nodes = tasks, sized by importance/urgency
- Connections = dependencies or sequencing
- Glow/color = deadline approaching ("heating up")
- Tap to edit any node

**Why it matters:** Transforms prioritization from "magic black box" to "visible algorithm" — users can verify, correct, and trust. Becomes a feature, not an escape hatch. (Sally, Winston)

**Timing:** This is complex — defer to v1.1. Ship MVP with simple "task list" view for trust-building, invest in visualization once core loop is validated. (Winston, Amelia)

#### Deadline Intelligence: Graceful Prompting
**The risk:** "App does the worrying" promise fails if a deadline is missed because the user forgot to add it and AI didn't infer correctly.

**Solution:** Proactive, graceful prompting for missing information:
- "I noticed this might be time-sensitive — when does it need to be done?"
- Builds trust AND collects data to improve prioritization
- Not nagging — framed as the app caring (Murat)

### MVP Scope: Tightened

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

### Dangling Items for Future Party Mode

If we resume party mode, tackle these in priority order:

| Priority | Item | Owner | Notes |
|----------|------|-------|-------|
| 1 | **Task overview UX for MVP** | Sally | What's the minimum trust-building view? List with deadlines? Grouped by context? |
| 2 | **AI cost analysis** | Winston | Real numbers: API pricing, estimated calls per user, margin at £1.50/mo |
| 3 | **Deadline prompting UX** | Sally + Murat | How to ask for deadlines without feeling like nagging? Microcopy matters |
| 4 | **Animation feasibility in RN** | Winston + Amelia | Spike: test card physics in Reanimated 3, identify performance ceiling |
| 5 | **Notification strategy** | John | Define "challenge/novelty" notifications concretely — what do they actually say? |
| 6 | **Brain visualization spec** | Sally | Full concept for v1.1: graph layout, interaction model, performance considerations |

