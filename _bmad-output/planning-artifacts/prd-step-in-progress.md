# PRD Step 9 — In Progress

**Document:** Session state for resuming PRD workflow  
**Created:** 2025-01-12  
**Last Step Completed:** Step 9 (Functional Requirements) — IN PROGRESS  
**Resume Point:** Advanced Elicitation — Pre-mortem analysis complete, awaiting decision

---

## Current Status

PRD Step 9 (Functional Requirements) is ~90% complete.
- 58 FRs have been added to the PRD
- Pre-mortem analysis was run to check for gaps
- 6 potential new FRs were identified but not yet added

---

## Pre-mortem Analysis Results (Pending Decision)

### Transcript

💀 Pre-mortem Analysis — FR Completeness
It's 6 months from now. One Down launched but is failing. Users are abandoning the app after a few weeks, not because of bugs or performance, but because a critical capability was missing from the FRs. Let's work backwards to find what we forgot.

#### Failure Scenario 1: "The Backlog Flood"
What happened: Users brain-dumped 50+ tasks in the first week. The curated stack worked great initially, but after a month, there's a graveyard of tasks that never surface. Users feel guilty about this invisible backlog even though they can't see it. They start avoiding the app.

Missing capability:

User can see backlog health metrics (how many tasks are aging, how long)
System can periodically surface "forgotten task" reviews
User can bulk-cut loose or archive old tasks
FR Gap Check: FR28-30 cover stale task detection and prompts, but do we have...

❓ Bulk operations on tasks?
❓ Backlog visibility/health indicator?

#### Failure Scenario 2: "The Context Trap"
What happened: User has 30 tasks but 25 require "laptop" and they're always on their phone. The stack becomes empty/boring frequently. Users feel like the app "doesn't have anything for me."

Missing capability:

System can suggest context adjustments when stack is thin
User can see how many tasks are available per context
FR Gap Check: FR13-16 cover context selection but...

❓ Stack-empty state handling?
❓ Context availability preview?

#### Failure Scenario 3: "The Ghost User"
What happened: User stops opening the app for 3 weeks. They come back, see the "welcome back" screen, but feel so overwhelmed by what might have piled up that they close immediately. The gentle summary isn't enough — they need a fast way to get current.

Missing capability:

User can "triage mode" to quickly process backlog (keep/cut/defer)
User can see task count by status
FR Gap Check: FR45-47 cover return experience but...

❓ Quick triage mode for backlog processing?

#### Failure Scenario 4: "The Deadline Miss"

What happened: User's passport renewal task had a deadline inferred incorrectly by AI. They trusted the app. Deadline was actually 2 weeks earlier. User is now stuck in another country.

Missing capability:

User can confirm/edit AI-inferred deadlines
System shows confidence level on inferred data
FR Gap Check: FR4 says system infers with confidence thresholds, but...

✅ FR24 allows editing deadlines — covered
❓ User can see what was AI-inferred vs manually set?

#### Failure Scenario 5: "The Premium Confusion"
What happened: User on free tier completes tasks but never understands what premium offers. Conversion is near zero because the value proposition is unclear.

Missing capability:

User can see preview of premium features
System can tastefully surface premium value at relevant moments
FR Gap Check: FR54-55 mention premium but...

❓ Premium feature discoverability?
Proposed FR Additions

#### Based on pre-mortem analysis:

### Overview

The following FR additions were identified but need your decision:

| FR# | Description | Scenario |
|-----|-------------|----------|
| FR59 | User can bulk-select tasks for cut loose or archive | Backlog Flood |
| FR60 | User can see task count by context before selecting | Context Trap |
| FR61 | System can suggest context switch when current stack is empty | Context Trap |
| FR62 | User can enter triage mode for fast keep/cut/defer decisions on backlog | Ghost User |
| FR63 | User can see which task attributes were AI-inferred vs manually set | Deadline Miss |
| FR64 | User can preview premium features from free tier | Premium Confusion |

**Options when resuming:**
- [Y] Add all 6
- [#] Pick specific ones (e.g., "59,61,62")
- [N] None of these are MVP-critical
- [x] Exit elicitation and continue to Step 10

---

## Resume Instructions

When resuming PRD workflow:
1. Load PM agent (`*PM` or similar)
2. Continue PRD (`*PR`)
3. System will detect continuation and offer to resume from Step 9
4. Review the pending FR additions above and make your decision
5. Then continue to Step 10 (Non-Functional Requirements)

---

## Session Context Summary

**FRs already added (58 total):**
- Task Capture: FR1-5
- Task Card Stack: FR6-12
- Context Selection: FR13-16
- Task Execution: FR17-23
- Task Management: FR24-30
- Quick Wins / Big Time: FR31-33
- AI Task Intelligence: FR34-38
- Rewards & Motivation: FR39-44
- Return Experience: FR45-47
- Push Notifications: FR48-51
- Account & Subscription: FR52-55
- Data & Sync: FR56-58

**Key changes made this session:**
- Merged FR4/FR5 (AI inference includes deadlines, size, context)
- Added "missing info" indicator on cards (FR12)
- Added task "started" status and "Continue" button (FR17-18)
- Removed haptics from MVP (added to dev notes for later)
- Added AI breakdown help from task screen (FR21)
- Added user can revise AI breakdown (FR38)
- Updated star rewards to be proportional to urgency/size/early completion (FR40-42)
- Added Review Mode vs Go Mode idea to development-notes.md

**Files modified:**
- `_bmad-output/planning-artifacts/prd.md` — FRs added
- `_bmad-output/planning-artifacts/development-notes.md` — Review Mode idea, haptics note
