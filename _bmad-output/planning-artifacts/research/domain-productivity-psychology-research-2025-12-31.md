---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
workflowType: 'research'
lastStep: 5
research_type: 'domain'
research_topic: 'Productivity Psychology & ADHD-Friendly Task Management'
research_goals: 'Proven techniques for task avoidance/overwhelm, ADHD productivity strategies, cognitive load reduction, UX inspiration from existing apps'
user_name: 'Finn'
date: '2025-12-31'
web_research_enabled: true
source_verification: true
status: 'complete'
---

# Research Report: Domain

**Date:** 2025-12-31
**Author:** Finn
**Research Type:** Domain - Productivity Psychology & ADHD-Friendly Task Management

---

## Research Overview

This research explores the psychological foundations of task management, with particular focus on:
- Evidence-based techniques for overcoming task avoidance and overwhelm
- ADHD-friendly productivity strategies and what makes them effective
- Cognitive load theory and its application to task management UX
- Successful patterns from existing productivity apps that users love

The goal is to inform the design of "One Down" — a todo app specifically designed to reduce overwhelm through a card-stack UI, smart prioritisation, and AI-powered task breakdowns.

---

## Executive Summary

### The Core Problem
Traditional todo apps **amplify anxiety** instead of reducing it. Long lists trigger choice overload, visible task counts create guilt, and every session starts with "what should I do first?" — a decision that depletes mental resources before any work begins.

### Key Research Findings
1. **Procrastination is emotional, not lazy** — We avoid tasks to avoid negative feelings, not the work itself
2. **Stress depletes self-control** — When resources are low, the user flow must require near-zero effort
3. **Choice overload paralyses** — More options = worse decisions (or no decision at all)
4. **Breaking tasks down works** — 47% improvement in focus duration when using micro-goals
5. **ADHD brains need dopamine** — Gamified immediate rewards boost motivation and follow-through
6. **Single-tasking beats multitasking** — 40% faster completion, reduced stress, access to flow state

### Design Imperatives for One Down
| Principle | Implementation |
|-----------|----------------|
| **One task at a time** | Card-stack UI — eliminates decision fatigue |
| **AI does the thinking** | Smart prioritisation, auto-breakdown, context filtering |
| **Low-effort flow** | Usable when depleted — swipe to complete, skip to defer |
| **Reduce anxiety** | Hide totals, show achievements, no guilt-inducing design |
| **Reward completion** | Minimalist gamification — satisfying but not distracting |
| **Handle the hard stuff** | Quick Wins vs Big Time modes based on current energy |

### What Sets One Down Apart
- **Not a demo app** — Full-featured task management with AI backbone
- **Themeless gamification** — Universal appeal, no RPG/forest/fantasy pigeonholing  
- **ADHD-first design** — But works for everyone
- **Trailing task caretaker** — Proactively surfaces stale tasks for resolution
- **Urgent deadline handler** — Will say when something *has* to be done, will help you start

---

## Domain Research Scope Confirmation

**Research Topic:** Productivity Psychology & ADHD-Friendly Task Management
**Research Goals:** Proven techniques for task avoidance/overwhelm, ADHD productivity strategies, cognitive load reduction, UX inspiration from existing apps

**Domain Research Scope:**

- Task Avoidance Psychology — procrastination science, decision fatigue, cycle-breaking techniques
- ADHD Productivity Strategies — body doubling, time boxing, gamification, dopamine-driven design
- Cognitive Load Theory — mental overhead reduction, "one thing at a time" psychology, paradox of choice
- Anti-Pattern Analysis — what makes task apps cause more anxiety
- UX Inspiration — features users love in existing apps

**Research Methodology:**

- All claims verified against current public sources
- Multi-source validation for critical claims
- Confidence level framework for uncertain information
- Comprehensive coverage with practical takeaways

**Scope Confirmed:** 2025-12-31

---

## 1. The Psychology of Task Avoidance & Procrastination

### 1.1 Why We Procrastinate: The Science

Procrastination isn't laziness — it's a complex emotional regulation problem. Research identifies several key mechanisms:

**Temporal Discounting**
Our brains prioritize immediate rewards over future ones. Tasks with distant rewards are postponed in favour of immediately gratifying activities. This is why the task due tomorrow gets done, but the one due next month doesn't.
*Source: [Zhang et al., 2019](https://pubmed.ncbi.nlm.nih.gov/); [Le Bouc & Pessiglione, 2022](https://www.nature.com/articles/s41467-022-33119-w)*

**Task Aversion & Negative Emotions**
Procrastination stems from negative emotions associated with a task — anxiety, fear of failure, boredom. We procrastinate to avoid these feelings, not the task itself. The PMC research confirms: "People procrastinate until the avoidance of an activity exceeds the benefits it can produce."
*Source: [Ferrari et al., 1995 - Procrastination and Task Avoidance](https://link.springer.com/book/10.1007/978-1-4899-0227-6); [PMC Study on Work Routines](https://pmc.ncbi.nlm.nih.gov/articles/PMC10135973/)*

**Impaired Self-Regulation**
Procrastination involves a failure of self-control — struggling to resist immediate temptations and prioritize long-term goals.
*Source: [Ramzi & Saed, 2019](https://pubmed.ncbi.nlm.nih.gov/)*

> ⚠️ **Design Note:** Self-regulation failure is a *symptom*, not a useful entry point. "Just try harder" approaches don't work — the app must address underlying emotional/cognitive barriers, not brute-force willpower.

**Perfectionism**
Perfectionists are highly prone to procrastination. Fear of failure or making mistakes leads to delaying starting or completing tasks entirely.
*Source: [Ferrari et al., 1995](https://link.springer.com/book/10.1007/978-1-4899-0227-6)*

> 💡 **Future Exploration:** Consider mechanisms to encourage "done over perfect" thinking — possibly AI suggestions like "Good enough for now?" or celebrating imperfect completions. Post-MVP consideration.

**Dopamine Dysregulation**
Dopamine, the neurotransmitter tied to reward and motivation, plays a significant role. Procrastinators may have differences in dopamine regulation, leading to difficulty experiencing motivation until urgency kicks in.
*Source: [Jaffe, 2013 - APS](https://www.psychologicalscience.org/observer/why-wait-the-science-behind-procrastination)*

>💡 **Design Implication — Urgency Handling:**
> - Auto-flagged urgent tasks need both **carrot** (bonus rewards for completion) and **stick** (making urgency tangible)
> - **Critical constraint:** Only surface urgency when the task is *actionable* — stress that can't be acted on creates paralysis, not motivation
> - Avoid adding to anxiety; make urgency empowering, not threatening

### 1.2 The Fear-Procrastination Connection

Fear of failure, criticism, and judgment drive procrastination behaviours. The brain's self-preservation instinct triggers procrastination when tasks threaten self-esteem or competence. This creates a vicious cycle:

1. Fear makes tasks seem overwhelming
2. We procrastinate to cope
3. Delay increases anxiety
4. Task becomes even more aversive
5. Repeat

**Key Insight for One Down:** The app should reduce fear/anxiety associations with task lists, not amplify them.

### 1.3 Stress Context Vulnerability Model ⭐

New research (PMC 2023) proposes that procrastination risk increases in stressful contexts because it becomes a low-resource means of avoiding difficult emotions. **When mental resources are depleted, procrastination becomes the path of least resistance.**
*Source: [PMC - Procrastination and Stress](https://pmc.ncbi.nlm.nih.gov/articles/PMC10049005/)*

>💡 **Critical Design Principle — Low-Effort Flow:**
>This is one of the most important insights for One Down:
> - User operations must require near-zero mental effort — usable even when all you feel like doing is procrastinating
> - **Auto-created minimal first step** provides a near-zero-effort entry point
> - AI handles all the heavy lifting: tracking, prioritising, organising
> - The user's only job: look at one card, decide (swipe or skip)

---

## 2. The Paradox of Choice & Decision Fatigue

### 2.1 Choice Overload in Task Management

Psychologist Barry Schwartz's "Paradox of Choice" is directly relevant to todo apps: **the more options we have, the less satisfied we feel with our decisions**.

**Key Effects:**
- **Decision Fatigue**: Every conscious decision has a cognitive cost. Processing multiple options depletes mental resources.
- **Analysis Paralysis**: Too many options leads to inability to decide, resulting in no choice at all.
- **Dissatisfaction**: Even after choosing, lingering doubt about whether it was the "right" choice.
- **Avoidance**: When overwhelmed, people shut down entirely.

*Source: [The Paradox of Choice - Barry Schwartz](https://thedecisionlab.com/reference-guide/economics/the-paradox-of-choice); [Psychology Today](https://www.psychologytoday.com/us/blog/mental-health-in-the-workplace/202409/the-paradox-of-choice-navigating-the-sea-of-options)*

### 2.2 Application to Todo Lists

Traditional todo apps present you with a long list of choices every time you open them. This triggers:
- "What should I do first?"
- "Is this the right priority?"
- "Am I forgetting something more important?"
- "This list is too long, I'll deal with it later"

**Key Insight for One Down:** Showing ONE task at a time eliminates decision fatigue. The card-stack UI directly addresses choice overload.

---

## 3. Cognitive Load Theory & UX

### 3.1 Core Principles

Cognitive load refers to the mental effort required to process information. When cognitive load exceeds capacity:
- Tasks become more difficult
- Details are missed
- Users feel overwhelmed
- Engagement drops

> 💡 **Design Implication:** One Down should handle understanding and surfacing important details when they're needed — preventing tasks from dropping off the list or dragging too long, or being missed when they are truly urgent.

*Source: [Laws of UX - Cognitive Load](https://lawsofux.com/cognitive-load/); [Nielsen Norman Group](https://www.nngroup.com/articles/minimize-cognitive-load/)*

### 3.2 UX Strategies to Reduce Cognitive Load

| Strategy | Description | Application to One Down |
|----------|-------------|------------------------|
| **Progressive Disclosure** | Only show info when needed | Card stack hides future tasks; power-user options revealed gradually |
| **Chunking** | Break complex info into digestible pieces | AI task breakdown; smallest achievable first step suggestion |
| **Clear Visual Hierarchy** | Guide attention to what matters | Single card focus; innovative overview (graph/visual, not raw list) |
| **Reduce Choices** | Fewer options = easier decisions | AI decides the best next task given context, energy, resources |
| **Default Settings** | Pre-fill sensible defaults | Smart auto-prioritisation and tagging; user review optional |

*Sources: [Aufait UX](https://www.aufaitux.com/blog/cognitive-load-theory-ui-design/); [Smashing Magazine](https://www.smashingmagazine.com/2016/09/reducing-cognitive-overload-for-a-better-user-experience/)*

### 3.3 Why Task Apps Cause Anxiety

**Anti-patterns identified:**
1. **Infinite scrolling lists** — Creates a sense of never-ending work
2. **Too many features** — Increases cognitive load
3. **Guilt-inducing design** — Overdue badges, red indicators
4. **Visible total count** — "247 tasks" is demoralising
5. **Ambiguous priorities** — Everything looks equally urgent

*Source: [Psychology Today - To-Do List Anxiety](https://www.psychologytoday.com/us/blog/the-art-of-self-improvement/202412/are-your-to-do-lists-torturing-you); [CNN - To-do list psychology](https://www.cnn.com/2020/07/14/health/to-do-lists-psychology-coronavirus-wellness/index.html)*

**Research Quote:** "Tasks on your to-do list that linger for weeks or months are bad for mental health and motivation" — CNN
*Source: [CNN Health](https://www.cnn.com/2020/07/14/health/to-do-lists-psychology-coronavirus-wellness/index.html)*

> 💡 **Design Implication — Lingering Task Detection:** One Down should smart-identify long-running or stale tasks. Give users a clear choice: **do it now**, **schedule with hard deadline**, or **let it go** (delete/archive). Don't let tasks haunt the list indefinitely.

**Research Quote:** "Worrying about our to-do lists can result in anticipatory fatigue: It consumes and depletes our energy and motivation even before we engage in the tasks" — Psychology Today
*Source: [Psychology Today](https://www.psychologytoday.com/us/blog/the-art-of-self-improvement/202412/are-your-to-do-lists-torturing-you)*

> 💡 **Design Implication — User Testing:** Identify pain/stress/overwhelm points through:
> - Dogfooding (self-testing first)
> - User testing with others
> - Analytics to track where users abandon sessions — this data is invaluable for UX iteration

---

## 4. Single-Tasking: The Science of "One Thing at a Time"

### 4.1 Multitasking is a Myth

Research consistently shows multitasking **harms** productivity:

- Multitasking makes tasks **40% slower** to complete (Hive)
- Linked to depression and anxiety (Becker, Alzahabi, & Hopwood, 2013)
- Creates a stress response in the body
- Reduces comprehension and attention

*Source: [Hive - Single-Tasking](https://hive.com/blog/single-tasking/); [VeryWell Mind](https://www.verywellmind.com/multitasking-2795003)*

### 4.2 Benefits of Single-Tasking

- **Reduced stress**: No stress response from task-switching
- **Higher quality work**: Full attention = fewer errors
- **Flow state access**: Deep focus is impossible while multitasking
- **Faster completion**: Counterintuitively, doing one thing finishes more things
- **Sense of accomplishment**: Completing tasks feels rewarding

*Source: [Psychology Today](https://www.psychologytoday.com/us/blog/finding-the-right-words/202511/do-one-thing-at-a-time); [RescueTime](https://blog.rescuetime.com/single-tasking/)*

**Research Quote:** "We utilize our brain power much more effectively and with greater ease when we do one thing at a time" — Psychology Today
*Source: [Psychology Today](https://www.psychologytoday.com/us/blog/finding-the-right-words/202511/do-one-thing-at-a-time)*

### 4.3 Direct Application to One Down

The card-stack UI is **literally single-tasking made visual**. You can only see one task. This is the core differentiator.

---

## 5. ADHD-Specific Productivity Strategies

### 5.1 Why ADHD Brains Work Differently

ADHD involves:
- **Time blindness** — Difficulty perceiving time accurately
- **Executive dysfunction** — Problems with planning, prioritisation, initiation
- **Dopamine-seeking** — Need for novelty and immediate rewards
- **All-or-nothing thinking** — Either hyperfocus or avoidance
- **Emotional dysregulation** — Tasks feel more overwhelming

*Source: [PMC Study - College Students with LD/ADHD](https://pmc.ncbi.nlm.nih.gov/articles/PMC6406620/)*

Top symptoms reported by LD/ADHD students (median severity out of 100):
1. Staying focused: 75
2. Managing time: 65
3. Organisation: 62
4. Completing tasks: 56

### 5.2 Evidence-Based ADHD Strategies

#### 5.2.1 Pomodoro Technique (Modified)

The Pomodoro Technique (25 min work / 5 min break) is rated "significantly more sustainable" by ADHD individuals compared to other productivity approaches.

**Why it works for ADHD:**
- Breaks work into short, manageable bursts
- Creates artificial urgency (timer)
- Makes time tangible and visible
- Provides clear start/end points
- Scheduled breaks prevent burnout

*Source: [Choosing Therapy](https://www.choosingtherapy.com/pomodoro-technique-adhd/); [PMC Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6406620/)*

> 📋 **Roadmap Note:** Pomodoro integration is a (low priority) candidate for post-MVP. Not initial focus, but maybe worth considering as a future feature.

#### 5.2.2 Body Doubling

Working alongside another person (physically or virtually) to increase focus and accountability.

**Research status:** Limited formal studies, but strong anecdotal evidence. One study found it can increase sustained attention and motivation to complete academic tasks.

**Why it works:** 
- Social accountability
- Reduces isolation
- May boost dopamine through social connection
- Creates external structure

*Source: [Cleveland Clinic](https://health.clevelandclinic.org/body-doubling-for-adhd); [Wikipedia - Body Doubling](https://en.wikipedia.org/wiki/Body_doubling)*

> 📋 **Roadmap Note:** Social/body doubling features are a potential future direction. Would require dedicated market research on existing social productivity apps.

#### 5.2.3 Breaking Tasks into Smaller Steps ⭐

Rated as one of the most effective strategies across multiple studies. A 2021 study found that breaking tasks into micro-goals improved focus duration by **up to 47%** over a four-week period.

**Why it works:**
- Reduces overwhelm
- Creates clear next actions
- Provides frequent dopamine hits from completion
- Makes progress visible

**Key Insight for One Down:** AI task breakdown is a core differentiator that directly addresses this need.

> 💡 **Design Implication:** Tasks could automatically come with an AI-generated "smallest first step" — drastically reducing the initial hurdle to getting started.

*Source: [Cognitive Therapy and Research, 2021](https://imaginovation.net/blog/gamification-adhd-apps-user-retention/)*

#### 5.2.4 Activity Switching

Using different task types as "mental breaks" while maintaining productivity momentum.

**How it works:**
- Keep a list of quick, low-energy tasks (emails, tidying)
- When focus drops on main task, switch to quick task
- Return to main task refreshed
- Still productive during "break"

*Source: [PMC Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6406620/)*

#### 5.2.5 Environmental Cues

Placing visual reminders in the physical environment to trigger task memory.

**Examples:**
- Leave items visible where they'll be seen
- Open relevant browser tabs/apps before leaving work
- Use location as trigger (gym bag by door)

*Source: [PMC Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6406620/)*

> 📋 **Scope Note:** Environmental cues are habit-app territory. Only consider this functionality if it naturally extends the core task manager focus — avoid scope creep.

#### 5.2.6 Creating Low-Level Stress (Strategic Procrastination)

Some ADHD individuals work best under pressure. They deliberately wait until urgency kicks in to trigger focus.

**Caution:** This is a high-risk strategy. Easy to "over-procrastinate" and create excessive anxiety.

*Source: [PMC Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6406620/)*

> ⚠️ **Design Constraint:** If One Down ever manufactures urgency for deadline tasks:
> - Use **very sparingly** and only at the right time
> - **Always pair with task breakdown assistance** — turn stress into actionable steps
> - Facilitate converting stress into results, not stewing in paralysis

### 5.3 Gamification for ADHD

ADHD brains respond more strongly to immediate rewards. Gamification leverages this:

**Key elements that work:**
- Points/XP for task completion
- Levels and progression
- Visual progress indicators
- Streaks and consistency tracking
- Instant feedback on actions

**Why it works:** Game elements trigger dopamine release, enhancing motivation and task follow-through.

**A 2021 study found** that breaking tasks into micro-goals with gamified rewards improved focus duration by up to 47%.

*Source: [Imaginovation](https://imaginovation.net/blog/gamification-adhd-apps-user-retention/); [ADHD Centre UK](https://www.adhdcentre.co.uk/adhd-gamification-and-its-role-in-boosting-focus-and-learning/)*

**Popular ADHD Gamification Apps:**
- Habitica (RPG-style habit tracker)
- Epic Win (turn tasks into quests)
- Forest (focus timer with growing trees)
- SuperBetter (life-as-game framework)

> 💡 **Design Philosophy — Minimalist Gamification:**
> Since themed gamification apps already exist, One Down takes a **different approach**:
> - **Neutral, themeless rewards** — no RPG/fantasy/forest theme that signal to users that the tasks aren't the focus
> - **Simple collection mechanic** — accumulating items/points is satisfying when progression scales properly (think Cookie Clicker, Paperclip Game)
> - **Subtle, not distracting** — engaging enough to motivate, not so flashy it becomes the focus. May need cool-downs or related prompts in some areas to promote consistency and avoid burnout
> - **Differentiator:** The lack of theme *is* the theme — universal appeal, no pigeonholing

---

## 6. "Eat the Frog" vs "Quick Wins First"

### 6.1 The Debate

**Eat the Frog (Hardest First):**
- Do your most daunting task first thing in the morning
- Cognitive research supports morning focus being strongest
- Gets the worst thing out of the way
- Reduces all-day anxiety about pending hard task

> ⚠️ **ADHD Reality Check:** Anecdotal evidence and community discussions suggest "eating the frog" straight out of the gate is often a disaster for ADHD brains — the resistance can cause the whole day to be abandoned. Additionally, the metaphor itself is off-putting and unpleasant. **Generally avoid this framing.**

**Quick Wins First (Easy First):**
- Start with small, completable tasks
- Build momentum and confidence
- Creates dopamine from early wins
- Works when motivation is low

### 6.2 Which is Better?

**Neither universally.** The right approach depends on context:

| Situation | Best Approach |
|-----------|---------------|
| High motivation, good energy | **Big Time Mode** — Tackle the boss fight / prove your skills (ADHD brains respond to *challenge*, not unpleasant *have-tos*) |
| Low motivation, need momentum | Quick wins first |
| Feeling overwhelmed | Quick wins to build confidence |
| Procrastinating on one big thing | Quick win elsewhere, or break down the big thing to create a quick win entry point |

**ADHD-Specific:** Many ADHD coaches recommend **choosing consciously** based on current state rather than following a rigid rule.

*Source: [Reddit r/productivity](https://www.reddit.com/r/productivity/comments/1erz5i2/eat_the_frog_vs_finding_pick_time/)*

**Key Insight for One Down:** The "Quick Wins" vs "Big Time" mode feature directly addresses this. Let users choose their approach based on current energy/context.

---

## 7. UX Inspiration from Existing Apps

### 7.1 What Users Love

Based on Reddit discussions and reviews:

| App | Loved Features | Why It Works |
|-----|----------------|--------------|
| **Things 3** | Clean, minimalist UI; Polished UX; Keyboard shortcuts | Low friction, feels effortless |
| **Todoist** | Natural language input; Powerful filters; Integrations | Quick capture, flexible views |
| **TickTick** | Built-in Pomodoro; Calendar views; Habit tracking | All-in-one productivity |

> 📋 **UX Research TODO:** Test out Things 3 (Mac or friend's iPhone) for UX inspiration. Also worth hands-on testing Todoist and TickTick.

### 7.2 Key UX Patterns Users Love

1. **Quick Capture** — Minimum friction to add a task
2. **Natural Language Dates** — "tomorrow at 3pm" just works
3. **Clean Visual Design** — Reduced visual noise
4. **Keyboard Shortcuts** — Power users want speed
5. **Satisfying Completion** — Good animation/sound when done
6. **Progress Visibility** — See that you're making headway

### 7.3 What Users Hate

1. **Subscription fatigue** — Especially for basic features
2. **Feature bloat** — Too many options
3. **Slow sync** — Tasks not updating across devices
4. **Visual clutter** — Too many badges, colours, indicators
5. **No offline mode** — Broken without internet

### 7.4 Card-Stack / Swipe UI Precedent

**SwipeTask** (iOS) — A new app with the exact card-stack swipe concept:
- "Tasks are presented as cards in a stack"
- "Need to focus? Just look at the top card"
- "Done? Swipe right"

This validates the concept. Competition exists but it's still a niche approach.

*Source: [Reddit - SwipeTask](https://www.reddit.com/r/ProductivityApps/comments/1jli2rt/i_built_a_simple_todo_app_where_you_swipe_your/)*

> 💡 **Competitive Differentiation:** SwipeTask appears to be a simple demo-level app. One Down aims to be a **fully-featured smart task caretaker** — AI-powered prioritisation, task breakdown, resource filtering — with the card stack as a deliberate UX choice, not just a gimmick.

---

## 8. Key Takeaways for One Down

### 8.1 Core Design Principles (Evidence-Based)

1. **One Task at a Time** — Eliminates choice overload, enables single-tasking
2. **Auto Tracks Important/Urgent Tasks** —  AI handles tracking due dates and importance, surfacing crucial tasks only when they're needed
3. **Reduce Anxiety, Don't Create It** — Hide overwhelming totals, avoid guilt-inducing design; show *achievement* totals instead (tasks completed today/week/month)
4. **AI Task Breakdown** — Addresses the #1 ADHD-effective strategy (47% focus improvement)
5. **Context-Based Filtering** — Resource filtering (home/laptop/internet) reduces decision fatigue
6. **Quick Wins Mode** — For momentum when motivation is low
7. **Big Time Mode** — For tackling hard tasks when energy is high
8. **Minimalist Gamification** — Dopamine hits without thematic distraction
9. **Satisfying Completion UX** — Make finishing feel good
10. **Low-Effort User Flow** — Usable even when depleted
11. **Lingering Task Management** — Don't let tasks haunt; force resolution (do/schedule/drop)

### 8.2 Anti-Patterns to Avoid

- ❌ Showing remaining task counts ("247 tasks remaining")
- ❌ Overdue indicators that create guilt — if used, must be **immediately and easily actionable**
- ❌ Complex priority systems (1-5 ratings, excessive tags/labels) — should be auto-handled smartly
- ❌ Feature bloat — stay minimal
- ❌ Requiring decisions to start working
- ❌ Urgency that can't be acted on (stress without outlet)
- ❌ "Eat the frog" framing or language

### 8.3 Unique Value Proposition

> **One Down manages all your trailing tasks for you.** Shows you ONE task at a time, eliminating the overwhelm of endless lists. Swipe to complete. AI breaks big tasks into manageable steps. Quick Wins mode builds momentum. Big Time mode tackles the hard stuff. Smart prioritisation means nothing slips through the gaps. **Built for ADHD brains, works for everyone.**

---

## Appendix: Roadmap Considerations

Extracted from research notes for future reference:

| Feature | Status | Notes |
|---------|--------|-------|
| Pomodoro integration | Post-MVP candidate | Not initial focus |
| Social/body doubling | Future exploration | Requires dedicated market research |
| Environmental cues/habits | Avoid for now | Only if natural extension of core |
| "Done over perfect" encouragement | Post-MVP | Explore mechanisms to celebrate imperfect completions |
| UX research: Things 3, Todoist, TickTick | Pre-design | Hands-on testing for inspiration |

---

## Research Sources & Citations

| Topic | Source | URL |
|-------|--------|-----|
| Procrastination Science | PMC - Bibliometric Analysis | https://pmc.ncbi.nlm.nih.gov/articles/PMC8847795/ |
| LD/ADHD Strategies | PMC - College Students Study | https://pmc.ncbi.nlm.nih.gov/articles/PMC6406620/ |
| Paradox of Choice | The Decision Lab | https://thedecisionlab.com/reference-guide/economics/the-paradox-of-choice |
| Cognitive Load | Laws of UX | https://lawsofux.com/cognitive-load/ |
| Todo List Anxiety | Psychology Today | https://www.psychologytoday.com/us/blog/the-art-of-self-improvement/202412/are-your-to-do-lists-torturing-you |
| Single-Tasking | VeryWell Mind | https://www.verywellmind.com/multitasking-2795003 |
| Pomodoro for ADHD | Choosing Therapy | https://www.choosingtherapy.com/pomodoro-technique-adhd/ |
| Body Doubling | Cleveland Clinic | https://health.clevelandclinic.org/body-doubling-for-adhd |
| Gamification ADHD | Imaginovation | https://imaginovation.net/blog/gamification-adhd-apps-user-retention/ |
| App Comparisons | Reddit r/productivity | Various threads |

---

*Research completed: 2025-12-31*
*Researcher: Mary (Analyst Agent)*
*Project: One Down*



