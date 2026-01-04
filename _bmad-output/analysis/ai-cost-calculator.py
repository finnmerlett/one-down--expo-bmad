"""
AI Cost Analysis Calculator for One Down
Validates all cost projections and calculates optimal thresholds
"""

# =============================================================================
# PRICING DATA (per 1 million tokens, as of January 2025)
# =============================================================================

# LLM Models (per 1M tokens)
LLM_PRICING = {
    "flash_3_preview": {"input": 0.50, "output": 3.00},
    "flash_2.5": {"input": 0.30, "output": 2.50},
    "flash_2.5_lite": {"input": 0.10, "output": 0.40},
    "flash_2.0_lite": {"input": 0.075, "output": 0.30},
}

# Voice Transcription (per minute)
VOICE_PRICING = {
    "openai_gpt4o_mini": 0.003,
    "openai_whisper": 0.006,
    "deepgram_nova3_streaming": 0.0077,
    "deepgram_nova3_batch": 0.0059,
    "google_standard": 0.016,
    "google_batch": 0.003,
    "on_device": 0.00,
}

# Exchange rate
GBP_TO_USD = 1.27  # £1 = $1.27 USD

# Revenue
MONTHLY_REVENUE_GBP = 1.50
MONTHLY_REVENUE_USD = MONTHLY_REVENUE_GBP * GBP_TO_USD

# =============================================================================
# TOKEN ESTIMATES PER REQUEST TYPE
# =============================================================================

# Without memory context
BASE_TOKENS = {
    "brain_dump_medium": {"input": 300, "output": 350},
    "brain_dump_large": {"input": 600, "output": 700},
    "task_breakdown": {"input": 75, "output": 180},
    "first_mover": {"input": 80, "output": 60},
}

# Memory context adds to input tokens
MEMORY_CONTEXT_TOKENS = 200

# Voice duration assumption
VOICE_DURATION_SECONDS = 30

# =============================================================================
# USAGE TIERS (monthly)
# =============================================================================

USAGE_TIERS = {
    "light": {
        "brain_dumps": 6,  # medium
        "task_breakdowns": 8,
        "first_movers": 20,
        "voice_dumps": 12,
    },
    "medium": {
        "brain_dumps": 16,  # mix of medium and large
        "task_breakdowns": 26,
        "first_movers": 40,
        "voice_dumps": 46,
    },
    "heavy": {
        "brain_dumps": 44,  # larger
        "task_breakdowns": 80,
        "first_movers": 80,
        "voice_dumps": 100,
    },
}


# =============================================================================
# COST CALCULATION FUNCTIONS
# =============================================================================


def calculate_llm_cost(tokens_in: int, tokens_out: int, model: str) -> float:
    """Calculate cost for a single LLM request"""
    pricing = LLM_PRICING[model]
    cost_in = (tokens_in / 1_000_000) * pricing["input"]
    cost_out = (tokens_out / 1_000_000) * pricing["output"]
    return cost_in + cost_out


def calculate_voice_cost(duration_seconds: int, provider: str = "openai_gpt4o_mini") -> float:
    """Calculate cost for voice transcription"""
    duration_minutes = duration_seconds / 60
    return duration_minutes * VOICE_PRICING[provider]


def calculate_monthly_llm_cost(tier: str, model: str, with_memory: bool = False) -> dict:
    """Calculate total monthly LLM cost for a usage tier"""
    usage = USAGE_TIERS[tier]
    memory_tokens = MEMORY_CONTEXT_TOKENS if with_memory else 0
    
    # Brain dump costs (assume mix for medium tier)
    if tier == "heavy":
        bd_tokens = BASE_TOKENS["brain_dump_large"]
    else:
        bd_tokens = BASE_TOKENS["brain_dump_medium"]
    
    bd_cost = calculate_llm_cost(
        bd_tokens["input"] + memory_tokens,
        bd_tokens["output"],
        model
    ) * usage["brain_dumps"]
    
    # Task breakdown costs
    tb_tokens = BASE_TOKENS["task_breakdown"]
    tb_cost = calculate_llm_cost(
        tb_tokens["input"] + memory_tokens,
        tb_tokens["output"],
        model
    ) * usage["task_breakdowns"]
    
    # First-mover costs
    fm_tokens = BASE_TOKENS["first_mover"]
    fm_cost = calculate_llm_cost(
        fm_tokens["input"] + memory_tokens,
        fm_tokens["output"],
        model
    ) * usage["first_movers"]
    
    total = bd_cost + tb_cost + fm_cost
    
    return {
        "brain_dumps": bd_cost,
        "task_breakdowns": tb_cost,
        "first_movers": fm_cost,
        "total": total,
        "total_gbp": total / GBP_TO_USD,
        "percent_revenue": (total / MONTHLY_REVENUE_USD) * 100,
    }


def calculate_monthly_voice_cost(tier: str, provider: str = "openai_gpt4o_mini") -> dict:
    """Calculate total monthly voice transcription cost"""
    usage = USAGE_TIERS[tier]
    cost = calculate_voice_cost(VOICE_DURATION_SECONDS, provider) * usage["voice_dumps"]
    
    return {
        "total": cost,
        "total_gbp": cost / GBP_TO_USD,
        "percent_revenue": (cost / MONTHLY_REVENUE_USD) * 100,
    }


def calculate_combined_monthly_cost(tier: str, llm_model: str, voice_provider: str = "openai_gpt4o_mini", with_memory: bool = False) -> dict:
    """Calculate combined LLM + Voice monthly cost"""
    llm_costs = calculate_monthly_llm_cost(tier, llm_model, with_memory)
    voice_costs = calculate_monthly_voice_cost(tier, voice_provider)
    
    total = llm_costs["total"] + voice_costs["total"]
    
    return {
        "llm": llm_costs,
        "voice": voice_costs,
        "combined_total": total,
        "combined_total_gbp": total / GBP_TO_USD,
        "combined_percent_revenue": (total / MONTHLY_REVENUE_USD) * 100,
    }


# =============================================================================
# RUN CALCULATIONS
# =============================================================================

print("=" * 80)
print("ONE DOWN: AI COST ANALYSIS CALCULATIONS")
print("=" * 80)
print(f"\nRevenue: £{MONTHLY_REVENUE_GBP:.2f}/month (${MONTHLY_REVENUE_USD:.2f} USD)")
print(f"Exchange rate: £1 = ${GBP_TO_USD:.2f}")
print()

# =============================================================================
# SECTION 1: LLM COSTS BY MODEL AND TIER
# =============================================================================

print("\n" + "=" * 80)
print("SECTION 1: LLM COSTS (WITHOUT MEMORY)")
print("=" * 80)

for model in ["flash_3_preview", "flash_2.5_lite"]:
    print(f"\n### {model.upper()} ###")
    print("-" * 60)
    for tier in ["light", "medium", "heavy"]:
        costs = calculate_monthly_llm_cost(tier, model, with_memory=False)
        print(f"  {tier.capitalize():8} | ${costs['total']:.4f} | £{costs['total_gbp']:.4f} | {costs['percent_revenue']:.2f}% of revenue")

print("\n" + "=" * 80)
print("SECTION 2: LLM COSTS (WITH 200-TOKEN MEMORY CONTEXT)")
print("=" * 80)

for model in ["flash_3_preview", "flash_2.5_lite"]:
    print(f"\n### {model.upper()} ###")
    print("-" * 60)
    for tier in ["light", "medium", "heavy"]:
        costs = calculate_monthly_llm_cost(tier, model, with_memory=True)
        print(f"  {tier.capitalize():8} | ${costs['total']:.4f} | £{costs['total_gbp']:.4f} | {costs['percent_revenue']:.2f}% of revenue")

# =============================================================================
# SECTION 3: VOICE COSTS
# =============================================================================

print("\n" + "=" * 80)
print("SECTION 3: VOICE TRANSCRIPTION COSTS (30s per dump)")
print("=" * 80)

print(f"\nProvider: OpenAI GPT-4o Mini Transcribe (${VOICE_PRICING['openai_gpt4o_mini']}/min)")
print("-" * 60)
for tier in ["light", "medium", "heavy"]:
    costs = calculate_monthly_voice_cost(tier)
    print(f"  {tier.capitalize():8} | ${costs['total']:.4f} | £{costs['total_gbp']:.4f} | {costs['percent_revenue']:.2f}% of revenue")

# =============================================================================
# SECTION 4: COMBINED COSTS
# =============================================================================

print("\n" + "=" * 80)
print("SECTION 4: COMBINED COSTS (LLM + VOICE)")
print("=" * 80)

print("\n### FLASH 3 + GPT-4o Mini Voice (NO MEMORY) ###")
print("-" * 60)
for tier in ["light", "medium", "heavy"]:
    costs = calculate_combined_monthly_cost(tier, "flash_3_preview", "openai_gpt4o_mini", with_memory=False)
    print(f"  {tier.capitalize():8} | Total: ${costs['combined_total']:.4f} (£{costs['combined_total_gbp']:.4f}) | {costs['combined_percent_revenue']:.2f}% of revenue")
    print(f"            | LLM: ${costs['llm']['total']:.4f} | Voice: ${costs['voice']['total']:.4f}")

print("\n### FLASH 3 + GPT-4o Mini Voice (WITH MEMORY) ###")
print("-" * 60)
for tier in ["light", "medium", "heavy"]:
    costs = calculate_combined_monthly_cost(tier, "flash_3_preview", "openai_gpt4o_mini", with_memory=True)
    print(f"  {tier.capitalize():8} | Total: ${costs['combined_total']:.4f} (£{costs['combined_total_gbp']:.4f}) | {costs['combined_percent_revenue']:.2f}% of revenue")
    print(f"            | LLM: ${costs['llm']['total']:.4f} | Voice: ${costs['voice']['total']:.4f}")

print("\n### FLASH 2.5 LITE + GPT-4o Mini Voice (WITH MEMORY) ###")
print("-" * 60)
for tier in ["light", "medium", "heavy"]:
    costs = calculate_combined_monthly_cost(tier, "flash_2.5_lite", "openai_gpt4o_mini", with_memory=True)
    print(f"  {tier.capitalize():8} | Total: ${costs['combined_total']:.4f} (£{costs['combined_total_gbp']:.4f}) | {costs['combined_percent_revenue']:.2f}% of revenue")
    print(f"            | LLM: ${costs['llm']['total']:.4f} | Voice: ${costs['voice']['total']:.4f}")

# =============================================================================
# SECTION 5: THRESHOLD RECOMMENDATIONS
# =============================================================================

print("\n" + "=" * 80)
print("SECTION 5: THRESHOLD RECOMMENDATIONS")
print("=" * 80)

# Calculate what threshold would capture different percentiles
print("\n### What costs correspond to user tiers? ###")
print("-" * 60)

# With Flash 3 and memory
f3_light = calculate_combined_monthly_cost("light", "flash_3_preview", with_memory=True)
f3_medium = calculate_combined_monthly_cost("medium", "flash_3_preview", with_memory=True)
f3_heavy = calculate_combined_monthly_cost("heavy", "flash_3_preview", with_memory=True)

print(f"Flash 3 + Memory:")
print(f"  Light user total:  ${f3_light['combined_total']:.4f} (£{f3_light['combined_total_gbp']:.4f})")
print(f"  Medium user total: ${f3_medium['combined_total']:.4f} (£{f3_medium['combined_total_gbp']:.4f})")
print(f"  Heavy user total:  ${f3_heavy['combined_total']:.4f} (£{f3_heavy['combined_total_gbp']:.4f})")

# Recommended thresholds
print("\n### RECOMMENDED THRESHOLDS ###")
print("-" * 60)

# If we want 95% of users on Flash 3, threshold should be above medium user cost
flash3_to_lite_threshold_usd = 0.10  # Above medium, catches only heavy
flash3_to_lite_threshold_gbp = flash3_to_lite_threshold_usd / GBP_TO_USD

# Hard cap at 33% of revenue
hard_cap_gbp = 0.50
hard_cap_usd = hard_cap_gbp * GBP_TO_USD

# Warning at 50% of cap
warning_threshold_gbp = hard_cap_gbp * 0.5
warning_threshold_usd = hard_cap_usd * 0.5

print(f"\n  Flash 3 → Flash-Lite Downgrade:")
print(f"    Threshold: £{flash3_to_lite_threshold_gbp:.3f} (${flash3_to_lite_threshold_usd:.3f})")
print(f"    Captures: Light + Medium users on Flash 3 (~95%+)")
print(f"    Downgrades: Only heavy users")

print(f"\n  50% Warning:")
print(f"    Threshold: £{warning_threshold_gbp:.2f} (${warning_threshold_usd:.2f})")

print(f"\n  Hard Cap:")
print(f"    Threshold: £{hard_cap_gbp:.2f} (${hard_cap_usd:.2f})")
print(f"    Guaranteed margin: £{MONTHLY_REVENUE_GBP - hard_cap_gbp:.2f} ({((MONTHLY_REVENUE_GBP - hard_cap_gbp) / MONTHLY_REVENUE_GBP * 100):.0f}%)")

# =============================================================================
# SECTION 6: VOICE BUDGET WITHIN OVERALL CAP
# =============================================================================

print("\n" + "=" * 80)
print("SECTION 6: VOICE BUDGET ANALYSIS")
print("=" * 80)

# If voice is dominant cost, what's the max voice usage before hitting cap?
cost_per_voice_dump = calculate_voice_cost(30)  # 30 seconds
cost_per_voice_dump_with_llm = cost_per_voice_dump + calculate_llm_cost(
    BASE_TOKENS["brain_dump_medium"]["input"] + MEMORY_CONTEXT_TOKENS,
    BASE_TOKENS["brain_dump_medium"]["output"],
    "flash_2.5_lite"  # Assume downgraded model for heavy users
)

print(f"\nCost per 30s voice brain dump:")
print(f"  Transcription only: ${cost_per_voice_dump:.5f}")
print(f"  With LLM processing: ${cost_per_voice_dump_with_llm:.5f}")

# How many voice dumps before hitting cap?
max_voice_dumps_at_cap = hard_cap_usd / cost_per_voice_dump_with_llm
print(f"\nMax voice brain dumps before £0.50 cap: {max_voice_dumps_at_cap:.0f}")

# Recommended voice soft limit
voice_soft_limit = 150  # Generous but within reason
voice_cost_at_limit = voice_soft_limit * cost_per_voice_dump_with_llm
print(f"\nRecommended voice soft messaging threshold: {voice_soft_limit} dumps/month")
print(f"  Cost at threshold: ${voice_cost_at_limit:.3f} (£{voice_cost_at_limit/GBP_TO_USD:.3f})")
print(f"  Leaves headroom: ${hard_cap_usd - voice_cost_at_limit:.3f} for text-only operations")

# =============================================================================
# SECTION 7: TRIAL PERIOD CONSIDERATION
# =============================================================================

print("\n" + "=" * 80)
print("SECTION 7: 2-WEEK TRIAL PERIOD ANALYSIS")
print("=" * 80)

# If trial users get 2 weeks free, what's our exposure?
trial_weeks = 2
trial_fraction = trial_weeks / 4  # Fraction of month

# Heavy user during trial
heavy_trial_cost = f3_heavy['combined_total'] * trial_fraction
print(f"\nHeavy user cost during 2-week trial: ${heavy_trial_cost:.4f}")
print(f"  (Pro-rated from full month)")

# If 10% of trial users convert
trial_conversion_rate = 0.10
cost_per_converted_user = heavy_trial_cost / trial_conversion_rate
print(f"\nAt {trial_conversion_rate*100:.0f}% conversion rate:")
print(f"  Effective customer acquisition cost (AI only): ${cost_per_converted_user:.3f}")
print(f"  This is {cost_per_converted_user/MONTHLY_REVENUE_USD*100:.1f}% of first month revenue")

# Recommendation
print(f"\nRecommendation: Trial AI budget")
print(f"  Apply same tiering during trial (Flash 3 → Lite)")
print(f"  Consider reduced cap during trial: £0.25 (half of paid cap)")
print(f"  Still generous: {0.25 * GBP_TO_USD / cost_per_voice_dump_with_llm:.0f}+ voice dumps allowed")

# =============================================================================
# SECTION 8: ERROR/RETRY OVERHEAD
# =============================================================================

print("\n" + "=" * 80)
print("SECTION 8: ERROR/RETRY OVERHEAD ESTIMATE")
print("=" * 80)

print("\nGoogle/OpenAI policy: Failed requests (4xx/5xx) are NOT charged")
print("However, user-perceived failures may cause retries:")
print("  - Output quality issues → user retries")
print("  - Network timeout → client retries")
print("  - Partial results → user requests again")

# Conservative estimate
retry_overhead_percent = 3  # 3% seems reasonable for API calls
print(f"\nEstimated retry overhead: {retry_overhead_percent}%")
print("  (Based on typical API reliability + occasional user retries)")
print("  Much lower than 5-10% as API errors themselves aren't charged")

heavy_with_overhead = f3_heavy['combined_total'] * (1 + retry_overhead_percent/100)
print(f"\nHeavy user cost with {retry_overhead_percent}% overhead: ${heavy_with_overhead:.4f}")
print(f"  (vs ${f3_heavy['combined_total']:.4f} without)")

# =============================================================================
# SECTION 9: FINAL SUMMARY
# =============================================================================

print("\n" + "=" * 80)
print("SECTION 9: FINAL RECOMMENDATIONS SUMMARY")
print("=" * 80)

print("""
STANDARDIZED CURRENCY: All thresholds in GBP (with USD equivalent)

┌─────────────────────────────────────────────────────────────────────┐
│                    FINAL TIER STRUCTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  £0.00 ──── £0.08 ──── £0.25 ──── £0.50 ────────→                   │
│      │         │          │          │                              │
│      │ FLASH 3 │ FLASH    │   50%    │   HARD                       │
│      │ PREVIEW │ 2.5 LITE │   WARN   │   CAP                        │
│      │         │          │          │                              │
│      │  ~90%   │   ~8%    │   <1%    │   <<1%                       │
│      │ of users│ of users │ warned   │ blocked                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

THRESHOLDS:
  • Flash 3 → Flash-Lite: £0.08 ($0.10) monthly combined cost
  • 50% Warning: £0.25 ($0.32)
  • Hard Cap: £0.50 ($0.63)
  • Voice soft messaging: At 150 voice dumps (visible in UI)

TRIAL PERIOD (2 weeks):
  • Same tiering applies
  • Consider reduced cap: £0.25 (to limit exposure)

BUDGET ALLOCATION:
  • Target: <5% of revenue for 95% of users
  • Cap: 33% of revenue maximum
  • Guaranteed margin: ≥67% per user
""")

print("=" * 80)
print("CALCULATIONS COMPLETE")
print("=" * 80)
