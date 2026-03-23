# AI Cost Analysis: One Down

**Date:** 2025-01-03  
**Analyst:** Mary (Business Analyst)  
**Status:** Initial proposal — subject to revision during implementation  
**Validated:** Calculations verified via Python script ([ai-cost-calculator.py](ai-cost-calculator.py))

> ⚠️ **Note:** This document contains initial recommendations based on current pricing and usage assumptions. All thresholds, caps, and strategies are proposals that may be adjusted as we learn from real user behavior.

---

## Executive Summary

At the target price point of **~£1.50/month ($1.91 USD)**, One Down can sustainably run AI-powered features using a tiered model approach. Voice transcription is the dominant cost driver, not LLM processing.

**Bottom Line (Combined LLM + Voice, with memory context):**

| User Tier | Flash 3 Total | Flash-Lite Total | % of Revenue (Flash-Lite) |
|-----------|---------------|------------------|---------------------------|
| Light     | £0.030        | £0.017           | 1.1%                      |
| Medium    | £0.095        | £0.060           | 4.0%                      |
| Heavy     | £0.268        | £0.140           | 9.3%                      |

**Key Insight:** Heavy users on Flash 3 exceed 17% of revenue — tiered downgrade is essential, not optional.

**Recommendation:** 
- Flash 3 → Flash-Lite downgrade at **£0.08** ($0.10)
- 50% warning at **£0.25** ($0.32)  
- Hard cap at **£0.50** ($0.64) — guarantees ≥67% margin

---

## Currency Standardization

All thresholds and budgets in this document use **GBP (£)** as the primary currency, with USD equivalents in parentheses where helpful.

**Exchange rate used:** £1 = $1.27 USD  
**Monthly revenue:** £1.50 ($1.91)

---

## Model Pricing Comparison

*All prices per 1 million tokens, paid tier, as of January 2025*

| Model | Input $/M | Output $/M | Notes |
|-------|-----------|------------|-------|
| **Gemini 2.0 Flash-Lite** | $0.075 | $0.30 | Cheapest, good for structured parsing |
| **Gemini 2.5 Flash-Lite** | $0.10 | $0.40 | Best value, reasoning capable |
| **Gemini 2.0 Flash** | $0.10 | $0.40 | Solid performer |
| **Gemini 2.5 Flash** | $0.30 | $2.50 | Hybrid reasoning, 6x output cost |
| **Gemini 3 Flash Preview** | $0.50 | $3.00 | Latest, most capable, no Lite yet |

**Selected Model for Analysis:** Gemini 2.5 Flash-Lite ($0.10 input / $0.40 output)  
*With comparisons to Flash and Flash 3 for capability sensitivity*

---

## Token Estimation Methodology

Token counts estimated using standard tokenization (~4 characters per token for English).

### Sample 1: Brain Dump Processing

**Use Case:** User speaks/types a stream-of-consciousness dump of tasks

**Sample Input (User Brain Dump):**
```
I need to return that Amazon package before the 14-day window closes, I think 
I ordered it on the 28th so I've got like 4 days left. Also need to prep for 
the quarterly review on Friday, should probably make slides and rehearse, maybe 
get feedback from Sarah. Oh and my passport expires in March, need to renew 
that, takes like 6 weeks apparently. The kitchen tap is still dripping, meant 
to call a plumber. And I said I'd help mum with her phone this weekend but 
Saturday I've got that birthday lunch for Jake so probably Sunday. Need to 
buy Jake a present still. Maybe a book? He mentioned something about stoicism. 
Also the car MOT is coming up, not sure when exactly but soon.
```
**Input tokens:** ~180 tokens

**System Prompt (sent with each request):**
```
You are a task extraction assistant for One Down, a single-task-focus app.

Extract individual actionable tasks from the user's brain dump. For each task:
- Title: Clear, action-oriented (start with verb)
- Description: Any relevant context or details
- Deadline: If mentioned or inferable (ISO date or relative)
- Context: Where/what needed (home, office, phone, laptop, errand, anywhere)
- Urgency: low/medium/high based on time sensitivity

Return as JSON array. Infer deadlines when possible (e.g., "4 days left" → calculate date).
Keep titles under 50 characters. Be thorough but don't fabricate tasks.
```
**System prompt tokens:** ~120 tokens

**Total Input:** ~300 tokens

**Sample Output (AI Response):**
```json
[
  {
    "title": "Return Amazon package",
    "description": "14-day return window closing",
    "deadline": "2025-01-06",
    "context": ["errand"],
    "urgency": "high"
  },
  {
    "title": "Prepare quarterly review slides",
    "description": "Review on Friday. Create slides, rehearse, get feedback from Sarah",
    "deadline": "2025-01-10",
    "context": ["office", "laptop"],
    "urgency": "high"
  },
  {
    "title": "Renew passport",
    "description": "Expires in March. Takes ~6 weeks to process",
    "deadline": "2025-02-01",
    "context": ["home", "laptop"],
    "urgency": "medium"
  },
  {
    "title": "Call plumber for kitchen tap",
    "description": "Dripping tap needs repair",
    "deadline": null,
    "context": ["home", "phone"],
    "urgency": "low"
  },
  {
    "title": "Help mum with her phone",
    "description": "Available Sunday (Saturday is Jake's birthday lunch)",
    "deadline": "2025-01-05",
    "context": ["anywhere"],
    "urgency": "medium"
  },
  {
    "title": "Buy birthday present for Jake",
    "description": "Birthday lunch on Saturday. Consider stoicism book",
    "deadline": "2025-01-04",
    "context": ["errand", "laptop"],
    "urgency": "high"
  },
  {
    "title": "Check car MOT date",
    "description": "Due soon, confirm exact date",
    "deadline": null,
    "context": ["home"],
    "urgency": "medium"
  }
]
```
**Output tokens:** ~350 tokens

**Per Brain Dump Total:**
- Input: 300 tokens
- Output: 350 tokens
- **Cost (Flash-Lite):** (300 × $0.10 + 350 × $0.40) / 1,000,000 = **$0.00017**

---

### Sample 2: Smart Task Breakdown

**Use Case:** User has a big task, AI breaks it into achievable subtasks

**Sample Input:**
```
Please break down this task into smaller, achievable subtasks:

Task: Renew passport
Description: Expires in March. Takes ~6 weeks to process
Deadline: 2025-02-01
Context: home, laptop

Provide 3-7 concrete next steps with time estimates.
```
**Input tokens:** ~75 tokens

**Sample Output:**
```json
{
  "breakdown": [
    {
      "step": 1,
      "title": "Check current passport expiry date",
      "time_estimate": "2 minutes",
      "context": ["home"]
    },
    {
      "step": 2,
      "title": "Take new passport photo",
      "time_estimate": "15 minutes",
      "context": ["home", "phone"]
    },
    {
      "step": 3,
      "title": "Complete online passport application",
      "time_estimate": "20 minutes",
      "context": ["laptop"]
    },
    {
      "step": 4,
      "title": "Pay passport application fee",
      "time_estimate": "5 minutes",
      "context": ["laptop"]
    },
    {
      "step": 5,
      "title": "Post old passport to passport office",
      "time_estimate": "15 minutes",
      "context": ["errand"]
    }
  ],
  "first_mover": "Check current passport expiry date"
}
```
**Output tokens:** ~180 tokens

**Per Task Breakdown:**
- Input: 75 tokens
- Output: 180 tokens
- **Cost (Flash-Lite):** (75 × $0.10 + 180 × $0.40) / 1,000,000 = **$0.000080**

---

### Sample 3: First-Mover Extraction

**Use Case:** For a task that feels overwhelming, identify the smallest functional step

**Sample Input:**
```
What's the smallest possible first step I could take right now to move forward on this task?

Task: Prepare quarterly review slides
Description: Review on Friday. Create slides, rehearse, get feedback from Sarah
Context: Currently at home with laptop

Give me ONE tiny action I can do in under 5 minutes that creates momentum.
```
**Input tokens:** ~80 tokens

**Sample Output:**
```json
{
  "first_mover": "Open a new presentation file and write just the title slide",
  "why": "Creating the file eliminates the 'blank page' barrier. Once open, you're more likely to continue.",
  "time": "2 minutes",
  "context_match": true
}
```
**Output tokens:** ~60 tokens

**Per First-Mover Request:**
- Input: 80 tokens
- Output: 60 tokens
- **Cost (Flash-Lite):** (80 × $0.10 + 60 × $0.40) / 1,000,000 = **$0.000032**

---

## User Tier Definitions

| Tier | Brain Dumps/Week | Task Breakdowns/Week | First-Movers/Week |
|------|------------------|----------------------|-------------------|
| Light | 1-2 | 0-2 | 0-5 |
| Medium | 3-5 | 3-10 | 5-15 |
| Heavy | 7-14 | 10-20 | 15-20 |

---

## Monthly Cost Projections

### Gemini 2.5 Flash-Lite (Recommended)

| Action | Input Tokens | Output Tokens | Cost per Call |
|--------|--------------|---------------|---------------|
| Brain Dump (medium) | 300 | 350 | $0.000170 |
| Brain Dump (large) | 600 | 700 | $0.000340 |
| Task Breakdown | 75 | 180 | $0.000080 |
| First-Mover | 80 | 60 | $0.000032 |

#### Light User (Monthly)
- 6 brain dumps (medium) = $0.00102
- 8 task breakdowns = $0.00064
- 20 first-movers = $0.00064
- **Total: $0.0023/month**

#### Medium User (Monthly)
- 16 brain dumps (mix) = $0.00340
- 26 task breakdowns = $0.00208
- 40 first-movers = $0.00128
- **Total: $0.0068/month**

#### Heavy User (Monthly)
- 44 brain dumps (larger) = $0.01496
- 80 task breakdowns = $0.00640
- 80 first-movers = $0.00256
- **Total: $0.0239/month**

### Gemini 2.5 Flash (6x more expensive output)

| User Tier | Monthly Cost | Notes |
|-----------|--------------|-------|
| Light | $0.009 | Still negligible |
| Medium | $0.028 | ~1.5% of revenue |
| Heavy | $0.096 | ~5% of revenue |

### Gemini 3 Flash Preview (Most Capable, Most Expensive)

| User Tier | Monthly Cost | Notes |
|-----------|--------------|-------|
| Light | $0.012 | ~0.6% of revenue |
| Medium | $0.037 | ~2% of revenue |
| Heavy | $0.125 | ~6.6% of revenue |

---

## Comparative Summary Table

*Monthly cost at £1.50 ($1.90) price point*

| Model | Light User | Medium User | Heavy User | Heavy as % Revenue |
|-------|------------|-------------|------------|-------------------|
| **2.5 Flash-Lite** | $0.002 | $0.007 | $0.024 | **1.3%** |
| 2.0 Flash-Lite | $0.002 | $0.007 | $0.023 | 1.2% |
| 2.5 Flash | $0.009 | $0.028 | $0.096 | 5.0% |
| 2.0 Flash | $0.003 | $0.009 | $0.032 | 1.7% |
| **3 Flash Preview** | $0.012 | $0.037 | $0.125 | **6.6%** |

---

## Scaling Projections

### At 10,000 Monthly Active Users

| Distribution | User Count | Model | Monthly AI Cost |
|--------------|------------|-------|-----------------|
| 70% Light | 7,000 | Flash-Lite | $16 |
| 25% Medium | 2,500 | Flash-Lite | $17 |
| 5% Heavy | 500 | Flash-Lite | $12 |
| **Total** | 10,000 | **Flash-Lite** | **$45/month** |

**Revenue at $1.90:** $19,000/month  
**AI Cost:** $45/month (**0.24% of revenue**)

### At 100,000 MAU

| Model | Total Monthly AI Cost | % of Revenue |
|-------|----------------------|--------------|
| Flash-Lite | $450 | 0.24% |
| Flash (2.5) | $1,440 | 0.76% |
| Flash 3 | $1,870 | 0.98% |

---

## Worst-Case Stress Test

**Scenario:** Power user abusing the system
- 50 brain dumps/week (large, 1000 tokens each)
- 100 task breakdowns/week
- 100 first-movers/week

**Monthly Cost:**
- Brain dumps: 200 × (600 × $0.10 + 700 × $0.40)/1M = $0.068
- Breakdowns: 400 × $0.000080 = $0.032
- First-movers: 400 × $0.000032 = $0.013
- **Total: $0.113/month** (5.9% of revenue)

**Even extreme usage is sustainable** on Flash-Lite. Consider fair-use caps for abuse prevention rather than margin protection.

---

## Voice Transcription Cost Analysis

### Overview

Voice brain-dumping is a key feature for reducing friction. Users speak their thoughts, the audio is transcribed, then fed to the LLM for task extraction.

**Assumption:** 30-second max recording length per brain dump (reasonable for stream-of-consciousness task capture)

### Voice Transcription Pricing Comparison

*All prices per minute, as of January 2025*

| Provider | Model | Price/min | Notes |
|----------|-------|-----------|-------|
| **OpenAI Whisper API** | whisper-1 | $0.006 | Industry standard, excellent accuracy |
| **OpenAI GPT-4o Transcribe** | gpt-4o-transcribe | $0.006 | Newer, same price |
| **OpenAI GPT-4o Mini Transcribe** | gpt-4o-mini-transcribe | $0.003 | 50% cheaper, good accuracy |
| **Deepgram Nova-3** | Streaming | $0.0077 | Real-time, excellent for mobile |
| **Deepgram Nova-3 Pre-recorded** | Batch | $0.0059 | Cheaper batch mode |
| **Google Speech-to-Text V2** | Standard | $0.016 | More expensive |
| **Google Dynamic Batch** | Standard | $0.003 | Cheapest, but slower |
| **On-device (Whisper.cpp)** | Local | $0.00 | Free, but adds app complexity |

### Cost Per 30-Second Voice Brain Dump

| Provider/Model | Cost per 30s | Notes |
|----------------|--------------|-------|
| **OpenAI GPT-4o Mini Transcribe** | $0.0015 | Best value for quality |
| OpenAI Whisper | $0.003 | Reliable fallback |
| Deepgram Nova-3 Pre-recorded | $0.00295 | Good streaming option |
| Google Dynamic Batch | $0.0015 | Requires batch queue |
| On-device | $0.00 | Requires integration work |

**Recommended:** OpenAI GPT-4o Mini Transcribe at $0.003/min ($0.0015 per 30s)

### Voice Usage Projections

| User Tier | Voice Brain Dumps/Week | Monthly Voice Dumps | Monthly Cost |
|-----------|------------------------|---------------------|--------------|
| Light | 2-4 | 12 | $0.018 |
| Medium | 8-15 | 46 | $0.069 |
| Heavy | 20-30 | 100 | $0.15 |

### Combined Cost: Voice + LLM

For voice brain dumps, we pay BOTH transcription AND LLM processing:

| Component | Cost per 30s Voice Dump |
|-----------|-------------------------|
| Transcription (GPT-4o Mini) | $0.0015 |
| LLM Processing (Flash 3) | $0.00025 |
| **Total per voice dump** | **$0.00175** |

| User Tier | Monthly Voice Dumps | Monthly Voice Total |
|-----------|---------------------|---------------------|
| Light | 12 | $0.021 |
| Medium | 46 | $0.080 |
| Heavy | 100 | $0.175 |

### Voice Cost as % of Revenue

At £1.50 ($1.90) subscription:

| User Tier | Voice Cost | % of Revenue | Combined with LLM Total |
|-----------|------------|--------------|-------------------------|
| Light | $0.021 | 1.1% | ~1.2% total |
| Medium | $0.080 | 4.2% | ~4.6% total |
| Heavy | $0.175 | 9.2% | ~10% total |

### Voice Is More Expensive Than Text

Voice transcription adds ~6-10x the cost of pure LLM processing. For a heavy voice user:
- Voice cost: $0.175/month
- LLM cost: $0.024/month
- **Voice is 7x more expensive than LLM**

### Voice Tiering Strategy

Given voice costs, consider a **visible voice budget** approach:

```
┌───────────────────────────────────────────────────────────────┐
│                   VOICE USAGE VISIBILITY                      │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│     Monthly Voice Allowance: 100 voice dumps (50 mins)        │
│                                                               │
│     ████████████████████░░░░░░░░░░░░░░░░░  42/100 used        │
│                                                               │
│     "You've got plenty of voice dumps left this month!"       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Tier Structure for Voice:**

| Tier | Voice Dumps/Month | Minutes | Cost Cap |
|------|-------------------|---------|----------|
| Included | 50 | 25 min | $0.075 (4%) |
| Generous | 100 | 50 min | $0.15 (8%) |
| Heavy cap | 150 | 75 min | $0.225 (12%) |

**Recommendation:** 
- Include 50 voice dumps (25 min) freely
- Soft warning at 50 (most users never reach)
- Potential cap at messaging at 100 (suggest text input / download whisper in-app-install)?

### On-Device Alternative: Whisper.cpp

For cost-conscious optimization, on-device transcription is free:

| Approach | Pros | Cons |
|----------|------|------|
| **Cloud API** | Simple, consistent, always updated | Per-use cost |
| **On-device (Whisper.cpp)** | Free, works offline | Adds ~50MB to app, battery drain, React Native complexity |

**Recommendation:** Start with cloud API for MVP simplicity. Evaluate on-device for v1.1+ if voice costs become significant.

### Combined Budget Summary

**All AI costs at £1.50 price point (with 200-token memory context):**

| Component | Light User | Medium User | Heavy User |
|-----------|------------|-------------|------------|
| LLM Flash 3 | £0.015 | £0.040 | £0.149 |
| LLM Flash-Lite | £0.002 | £0.006 | £0.022 |
| Voice Transcription | £0.014 | £0.054 | £0.118 |
| **Total (Flash 3)** | **£0.030** | **£0.095** | **£0.268** |
| **Total (Flash-Lite)** | **£0.017** | **£0.060** | **£0.140** |
| **% of Revenue (Flash-Lite)** | **1.1%** | **4.0%** | **9.3%** |

**Conclusion:** 
- Voice is the dominant cost driver (~85% of heavy user costs)
- Heavy users on Flash 3 exceed 17% of revenue — tiered downgrade essential
- Even heavy users on Flash-Lite stay under 10% of revenue
- Hard cap at £0.50 guarantees minimum 67% margin

---

## Flash 3 vs Flash 2.5 Lite: Will Users Notice?

For One Down's structured tasks, the difference is **minimal for most use cases**:

| Task Type | Flash 3 Advantage | Flash-Lite Risk | Verdict |
|-----------|-------------------|-----------------|---------|
| Brain dump parsing | Slightly better at ambiguous phrasing | May miss subtle implications | Low risk |
| Task breakdown | Better step sequencing | Adequate for 3-7 steps | Minimal difference |
| First-mover | Slightly more creative suggestions | Formulaic but correct | User unlikely to notice |
| Deadline inference | Both reliable for date math | Both reliable | No difference |

**Where Flash 3 matters:** Truly ambiguous input like "deal with the Jake thing before it becomes a problem" — Flash 3 might ask for clarification more intelligently.

**Bottom line:** Flash-Lite is not a compromise for structured I/O tasks — it's the right tool. The tiering is about cost management, not quality degradation.

---

## Recommendations / thoughts

### Adopted Strategy: Hard Cap with Invisible Tiering

Provide the **best experience** by default, progressively downgrade heavy users, and enforce a **hard cap at £0.50** to guarantee we never lose money on any user — while still being extremely generous.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FINAL TIER STRUCTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    £0.00 ─── £0.08 ──── £0.25 ──── £0.50 ────────→                  │
│      │         │          │          │                              │
│      │ FLASH 3 │ FLASH    │   50%    │   HARD                       │
│      │ PREVIEW │ 2.5 LITE │   WARN   │   CAP                        │
│      │         │          │          │                              │
│      │  ~90%   │   ~8%    │   <1%    │   <<1%                       │
│      │ of users│ of users │ warned   │ blocked                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Tier 1: Premium Experience (£0.00 - £0.08 monthly AI cost)**
- Model: **Gemini 3 Flash Preview**
- Experience: Best reasoning, most natural task interpretation
- Visibility: None — user has no idea about tiers
- Expected users: ~90% never exceed this threshold (light + most medium users)
- Threshold rationale: £0.08 is above light user cost (£0.030) but below medium (£0.095)

**Tier 2: Great Experience (£0.08 - £0.25 monthly AI cost)**
- Model: **Gemini 2.5 Flash-Lite**
- Experience: Still excellent, user won't notice difference for typical tasks
- Visibility: None — automatic, invisible downgrade
- Expected users: ~8% reach this tier (heavy users and some medium)

**Tier 3: Warning Zone (£0.25 / 50% of cap)**
- Model: **Gemini 2.5 Flash-Lite** (continued)
- Experience: Unchanged, but user sees first notification
- Visibility: Friendly message — "You're using One Down a lot! You've used half your monthly AI allowance."
- Tone: Informative, not punitive — celebrate engagement
- Expected users: <1%

**Tier 4: Hard Cap (£0.50 monthly AI cost)**
- Model: N/A — AI features blocked for remainder of month
- Experience: Text input still works (no AI processing), manual task creation available
- Visibility: Clear message — "You've hit your monthly limit. AI features will reset on [date]. You can still add tasks manually."
- Expected users: <<1% — likely indicates unusual pattern
- Fallback: Manual task entry always available (zero cost)

### Why £0.08 for Flash 3 → Flash-Lite?

From calculations:
| User Tier | Flash 3 + Voice + Memory Cost |
|-----------|-------------------------------|
| Light     | £0.030                        |
| Medium    | £0.095                        |
| Heavy     | £0.268                        |

Setting threshold at £0.08:
- ✅ Captures all light users on Flash 3
- ✅ Captures ~80% of medium users on Flash 3
- ✅ Downgrades heavy users immediately
- ✅ Prevents runaway costs (heavy Flash 3 = 17.8% of revenue!)

### Why £0.50 Hard Cap?

| Metric | Value | Notes |
|--------|-------|-------|
| Revenue per user | £1.50 | Monthly subscription |
| Hard cap | £0.50 | 33% of revenue |
| Worst-case margin | £1.00 | 67% margin even at cap |
| Expected usage | £0.02-0.10 | 1-7% of revenue for most |
| Cap headroom | 3-25x typical usage | Extremely generous |
| Max voice dumps before cap | ~376 | Using Flash-Lite + voice |

**Key insight:** At £0.50, we guarantee positive margin on every user, while providing 3-25x the AI budget that typical users consume. Only abuse or extreme edge cases hit the cap.

### Voice Budget Within Overall Cap

Voice transcription is ~85% of total cost for heavy users. To prevent voice from consuming the entire budget, we propose a **voice-specific hard cap at 75% of total budget**:

| Metric | Value |
|--------|-------|
| Cost per 30s voice dump (with LLM) | £0.0013 |
| Total budget cap | £0.50 |
| **Voice-specific cap (75%)** | **£0.375** |
| Voice dumps before voice cap | ~288 |
| Remaining LLM headroom after voice cap | £0.125 |
| Soft messaging threshold | 150 dumps (~£0.20) |

**Proposed voice strategy:**
1. **Soft message at 150 dumps:** "You've used a lot of voice input this month. Consider typing for simple tasks."
2. **Offer Whisper download at 200 dumps:** "Download offline voice mode (57MB) for unlimited voice input"
3. **Hard voice cap at ~288 dumps (£0.375):** "Voice input limit reached. You can still use text input, or download offline voice."
4. **LLM continues working** with remaining £0.125 headroom (~100+ text brain dumps worth)

**Rationale:** Prevents a voice-heavy user from hitting the overall cap and losing LLM access entirely. They can still process text tasks even after exhausting cloud voice.

### On-Device Whisper: Optional Download

For users who hit voice limits or prefer offline:

| Model | Download Size | Quality |
|-------|---------------|---------|
| whisper-tiny.en (quantized) | ~31 MB | Good for clear speech |
| whisper-base.en (quantized) | ~57 MB | Better accuracy |
| whisper-small.en (quantized) | ~182 MB | Excellent |

**Implementation:**
- Offer as optional download when user hits 50% voice budget
- "Download offline voice mode (57MB) for unlimited voice input"
- Uses whisper.rn React Native binding
- User choice, not forced

### Memory Context Overhead

Each request can include user memory (preferences, past corrections, style notes):

| Memory Size | Additional Cost per Request (Flash-Lite) |
|-------------|------------------------------------------|
| 100 tokens  | £0.000008                                |
| 200 tokens  | £0.000016                                |
| 500 tokens  | £0.000039                                |

**Impact for heavy user (400+ calls/month):**
- 200-token memory: ~£0.006 additional/month
- Small but compounds — included in calculations above

### Error/Retry Overhead

**Policy clarification:** Google/OpenAI do NOT charge for failed API requests (4xx/5xx errors).

Charged retries only occur when:
- User perceives output as poor quality → manually retries
- Network timeout → client automatically retries
- Partial results → user requests again

**Estimated overhead:** ~3% (much lower than 5-10% initially suggested)
- API reliability is high
- Most failures are non-charged server errors
- Budget headroom already accounts for this

### User Communication Strategy

| Threshold | User Sees | Tone |
|-----------|-----------|------|
| 0-50% | Nothing | Invisible |
| 50% (£0.25) | Friendly notification | "You're a power user! 50% of monthly AI used." |
| 75% (£0.375) | Gentle reminder | "Heads up: 75% used. Consider text input for simple tasks." |
| 100% (£0.50) | Clear limit message | "Monthly AI limit reached. Manual mode until [reset date]." |

**Critical:** Only ever mention limits when the user approaches them. No mention in onboarding, marketing, or general UI. Fair-use policy lives in Terms of Service only.

### 2-Week Trial Period

**Exposure analysis:**
- Heavy trial user cost (2 weeks): £0.134 (pro-rated)
- At 10% conversion: Effective CAC (AI only) = £1.34 per converted user
- This is 89% of first month revenue — significant but acceptable for growth

**Recommended trial approach:**
- Apply same tiering during trial (Flash 3 → Lite)
- Reduced cap during trial: **£0.25** (half of paid cap)
- Still allows ~188 voice dumps — generous for evaluation
- Limits exposure from non-converting heavy users

### Monitoring & Analytics Requirements

Implement from day one:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REQUIRED ANALYTICS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Per-User Metrics:                                                  │
│  • Monthly AI cost (LLM + Voice combined, in £)                     │
│  • Tier transitions (Flash 3 → Flash-Lite timestamp)                │
│  • Warning triggers (50%, 75% thresholds hit)                       │
│  • Cap hits (count of users blocked per month)                      │
│  • Voice vs text ratio                                              │
│                                                                     │
│  Aggregate Metrics:                                                 │
│  • Distribution: % users in each tier                               │
│  • Cap hit rate: % users hitting hard cap                           │
│  • Voice vs LLM split: where is cost concentrated?                  │
│  • Trend: are heavy users increasing over time?                     │
│                                                                     │
│  Alert Thresholds:                                                  │
│  • >10% users hitting 50% warning → investigate                     │
│  • >5% users hitting hard cap → urgent review                       │
│  • Any pattern of rapid cap-hitting → potential abuse               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Adaptation Strategy

| Observation | Response |
|-------------|----------|
| <1% hit 50% warning | Perfect — no action needed |
| 1-5% hit 50% warning | Monitor, likely normal power users |
| 5-10% hit 50% warning | Consider raising thresholds or model optimization |
| >10% hit 50% warning | Re-evaluate pricing or introduce power-user tier |
| Anyone hitting cap | Review usage pattern — abuse or legitimate heavy use? |

**Philosophy:** We can absorb a small percentage of users approaching limits. As long as <10% regularly hit the 50% mark, the economics work. If patterns change, we adapt — but start generous.

### Proposed Budget Allocation

At £1.50/month revenue:

| Metric | Proposed Value | Notes |
|--------|----------------|-------|
| Overall hard cap | £0.50 | 33% of revenue |
| Voice-specific cap | £0.375 | 75% of overall cap |
| Flash 3 → Lite threshold | £0.08 | ~5% of revenue |
| 50% warning | £0.25 | 17% of revenue |
| Voice soft message | 150 dumps (~£0.20) | Suggest text/offline |
| Voice Whisper prompt | 200 dumps (~£0.26) | Offer on-device download |
| Expected cost (90% of users) | £0.02-0.06 | 1-4% of revenue |
| Guaranteed margin | ≥£1.00 | ≥67% per user |

*All thresholds are initial proposals and may be adjusted based on real usage data.*

---

## Capability Assessment

### Can Flash-Lite Handle These Tasks?

| Task | Complexity | Flash-Lite Capable? | Notes |
|------|------------|---------------------|-------|
| Brain dump parsing | Medium | ✅ Yes | Structured extraction is straightforward |
| Task breakdown | Medium | ✅ Yes | Follows patterns well |
| First-mover extraction | Low-Medium | ✅ Yes | Simple reasoning task |
| Deadline inference | Medium | ✅ Yes | Date math is reliable |
| Context detection | Low | ✅ Yes | Keyword matching with intelligence |

Flash-Lite models are optimized for exactly this class of structured I/O tasks. The more expensive Flash and Flash 3 models offer benefits for:
- Complex multi-step reasoning
- Creative generation
- Ambiguous instruction handling

For One Down's use cases, **Flash-Lite is not a compromise — it's the right tool**.

---

## Appendix: Free Tier Considerations

Google's free tier includes limited usage per day:
- 500 RPD (requests per day) for Flash-Lite
- Content used to improve products

**For production app:** Paid tier is essential for:
1. Higher rate limits
2. Content not used for training
3. Access to batch API discounts
4. SLA guarantees

**Free tier is useful for:** Development, testing, and potentially a "trial mode" for users before payment.

---

*Analysis prepared using official Google AI pricing as of January 2025. Prices subject to change.*
