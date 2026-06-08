---
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: 'complete'
overallReadiness: 'READY'
documentsAssessed:
  - prd.md
  - architecture.md
  - epics.md
  - ux-design-specification.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-06-08
**Project:** one-down--expo-bmad

## Step 1: Document Inventory

All four required document types are present as single whole files. No sharded folders exist, so there are no duplicate-format conflicts. No required documents are missing.

| Type | File | Size | Last modified |
|------|------|------|---------------|
| PRD | `prd.md` | 54 KB | 2026-06-08 |
| Architecture | `architecture.md` | 51 KB | 2026-06-08 |
| Epics & Stories | `epics.md` | 68 KB | 2026-06-08 |
| UX Design | `ux-design-specification.md` | 51 KB | 2026-05-04 |

**Supporting documents (not assessed as required types):** `product-brief-One-Down-2025-01-04.md`, `prd-validation-report.md`, `future-ideas-box.md`, `research/`.

**Note:** The PRD, Architecture, and Epics files include uncommitted working-tree edits from the 2026-06-08 planning session (SDK 56 + version bumps, implementation-learnings propagation, and reconciled decisions: canonical `TaskData` type, gluestack copy-paste model, drizzle-kit migrations, JWKS auth, native Google sign-in). This assessment evaluates those working-tree versions.

**Issues:** None — no duplicates, no missing required documents.

## Step 2: PRD Analysis

### Functional Requirements (66 total)

**Task Capture** — FR1 brain-dump free-text capture; FR2 AI parse brain dump into tasks; FR3 single quick-add; FR4 AI-infer deadline/size/context (confidence thresholds); FR5 manual add/edit context requirements.

**Task Card Stack** — FR6 view curated card stack; FR7 curate by context + importance/urgency; FR8 tap card to flip (details/notes/start); FR9 swipe through stack; FR10 size indicators (quick win/big time); FR11 reward indicators reflecting potential star value; FR12 "check needed" indicator for unconfirmed AI info / missing details.

**Context Selection** — FR13 select current context; FR14 filter to actionable-in-context; FR15 indicator when other contexts have urgent tasks; FR16 real-time stack update on context switch; FR17 empty-context state message; FR18 grey out contexts with no actionable tasks.

**Task Execution** — FR19 start a task (expand to running screen, "started" status); FR20 continue a started task; FR21 view details/notes on running screen; FR22 add notes during execution; FR23 request AI breakdown; FR24 mark complete; FR25 completion feedback (toast + stars).

**Task Management** — FR26 edit title/description/deadline/contexts; FR27 swipe past = implicit skip/defer; FR28 cut loose (no guilt); FR29 positive cut-loose feedback; FR30 task overview list; FR31 bulk-select archive (permanent delete only from recycle bin); FR32 flag stale/avoided tasks; FR33 prompt about stale/avoided (keep/cut/break down).

**Quick Wins / Big Time Modes** — FR34 toggle Quick Wins/Big Time (re-press to toggle off); FR35 filter to quick-win size; FR36 filter to big-time size.

**AI Task Intelligence** — FR37 prompt for missing deadline; FR38 confirm AI-inferred critical info; FR39 suggest micro-tasks for frequently-skipped; FR40 AI break down large tasks (first few steps default, option for full list); FR41 accept/reject breakdown; FR42 revise breakdown via feedback input (AI distills to notes + retries).

**Rewards & Motivation** — FR43 earn stars for completion; FR44 more stars for more-urgent; FR45 more stars for larger; FR46 bonus for completing before deadline (capped); FR47 reward for confirming AI info / adding missing info; FR66 small reward for cutting loose; FR48 see accumulated stars (grand total + daily); FR49 tap star count → activity log + done section at top of task list.

**Return Experience** — FR50 gentle welcome-back summary; FR51 see what happened while away + triage mode; FR52 first card as achievable quick win after absence.

**Push Notifications** — FR53 deadline-urgency notifications; FR54 challenge/novelty notifications; FR55 configure notification preferences; FR56 no guilt-inducing reminders.

**Account & Subscription** — FR57 create account; FR58 subscribe to premium (IAP); FR59 core features on free tier; FR60 access premium features when subscribed; FR61 premium discovery (sparkle) page.

**Data & Sync** — FR62 sync across devices; FR63 view tasks offline; FR64 create tasks offline (no AI); FR65 graceful AI degradation offline.

> Numbering note: FR66 is grouped under Rewards (inserted after FR47); FRs otherwise run FR1–FR65, so the total is 66 functional requirements.

### Non-Functional Requirements (19 total)

**Performance** — NFR-P1 50+ FPS on 2020 devices; NFR-P2 cold start <2s target/<3s acceptable; NFR-P3 AI parse/breakdown <3s (target <2s); NFR-P4 card interactions <100ms.

**Accessibility** — NFR-A1 WCAG AA patterns (not formal audit); NFR-A2 structural screen-reader support (TalkBack, Android MVP); NFR-A3 reduced-motion (**deferred post-MVP**); NFR-A4 ADHD-first patterns throughout.

**Reliability** — NFR-R1 offline task viewing; NFR-R2 offline manual creation; NFR-R3 graceful AI degradation; NFR-R4 last-content-changed-wins conflict resolution; NFR-R5 sync within 5s of reconnection.

**Security** — NFR-S1 credentials in secure storage (keychain); NFR-S2 TLS 1.2+; NFR-S3 no sensitive task content in logs/analytics.

**Scalability** — NFR-SC1 supports 25k MAU without redesign; NFR-SC2 schema supports future multi-device sync expansion.

**Logging & Traceability** — NFR-L1 basic client + server logging/traceability (MVP baseline).

### Additional Requirements / Constraints

- **Capability Contract:** the FR list is the exhaustive scope — UX, architecture, and epics implement only these.
- **Platform:** Android-only MVP; portrait-only; 320–430pt width target; Android 10+ (API 29).
- **AI cost cap:** ~£0.50/user/month (drives metering, model selection, decision caching).
- **Pricing/business:** ~£1.50/month subscription; ~25k MAU viability target.

### PRD Completeness Assessment

The PRD is complete and well-structured for traceability: every FR is uniquely numbered with a capability-contract preamble, NFRs are tabulated by category with explicit deferrals marked (NFR-A3 reduced-motion, VoiceOver). The only numbering quirk is FR66 living under Rewards rather than at the end — cosmetic, not a gap. Requirements are testable and unambiguous. No missing requirement categories detected for the stated MVP scope.

## Step 3: Epic Coverage Validation

The epics document includes an explicit **FR Coverage Map** mapping every FR to an owning epic. Cross-checked against the 66 FRs extracted in Step 2.

### Coverage Matrix (grouped by owning epic)

| Epic | FRs covered | Status |
|------|-------------|--------|
| Epic 1 — Core Task Loop | FR3, FR5, FR6, FR8, FR9, FR10, FR26, FR27, FR30 | ✓ |
| Epic 2 — Task Execution | FR19, FR20, FR21, FR22, FR24, FR25, FR28, FR29, FR66 | ✓ |
| Epic 3 — Smart Curation | FR7, FR11, FR13, FR14, FR15, FR16, FR17, FR18, FR34, FR35, FR36 | ✓ |
| Epic 4 — Rewards & Motivation | FR43, FR44, FR45, FR46, FR48, FR49 | ✓ |
| Epic 5 — Account & Cloud Sync | FR57, FR59, FR62, FR63, FR64, FR65 | ✓ |
| Epic 6 — AI Intelligence | FR1, FR2, FR4, FR12, FR23, FR37, FR38, FR39, FR40, FR41, FR42, FR47 | ✓ |
| Epic 7 — Task Health & Return | FR31, FR32, FR33, FR50, FR51, FR52 | ✓ |
| Epic 8 — Engagement & Monetization | FR53, FR54, FR55, FR56, FR58, FR60, FR61 | ✓ |

### Missing Requirements

**None.** All 66 FRs (FR1–FR66) appear in the FR Coverage Map with an owning epic. No FRs are orphaned, and no epic claims an FR that is absent from the PRD.

NFR coverage is also mapped: P1–P4 & A1–A4 & L1 cross-cutting; R1–R5, S1–S3, SC1, SC2 → Epic 5. UX-DR coverage map present (DR1–DR25, DR16 merged into DR15).

### Coverage Statistics

- Total PRD FRs: **66**
- FRs covered in epics: **66**
- Coverage percentage: **100%**
- FRs in epics but not PRD: **0**

> Note on sequencing (not a coverage gap): several FRs are owned by an epic later than where their UI first appears — e.g. FR11 (star-value indicators on cards, Epic 3) and FR12 (check-needed indicator, Epic 6) render on the Epic 1 card. This is intentional progressive enhancement; the card components are built in Epic 1 and these indicators are layered on when their backing systems exist. Flagged for the story-sequencing review (Step 5), not as a missing requirement.

## Step 4: UX Alignment Assessment

### UX Document Status

**Found** — `ux-design-specification.md` (51 KB). Comprehensive: executive summary, core UX, emotional design, pattern analysis, design system, 6 user-journey flows, component strategy (gluestack coverage + custom composites), consistency patterns, and a responsive/accessibility section. The UX spec's design requirements are renumbered as UX-DRs (1–25) and already mapped to epics in the epics doc's UX-DR Coverage table (validated in Step 3; DR16 merged into DR15).

### UX ↔ PRD Alignment

Aligned. The six UX flows map cleanly to PRD capabilities — Flow 1 (brain dump → first card) → FR1/FR2/FR3; Flow 2 (core card loop) → FR6–FR12; Flow 3 (AI breakdown) → FR23/FR40–FR42; Flow 4 (triage) → FR33/FR51; Flow 5 (Quick Wins/Big Time) → FR34–FR36; Flow 6 (task list) → FR30/FR49. No UX flow requires a capability absent from the PRD, and no PRD FR is left without a UX surface.

### UX ↔ Architecture Alignment

Aligned — and **improved by this session's revision**. The UX spec's Design System Foundation specifies **gluestack-ui v3 via the copy-paste / CLI model** (`npx gluestack-ui add <component>`, install-per-story, default theme) + NativeWind. The architecture was just revised from the reverted run's "hand-rolled primitives" back to exactly this copy-paste/CLI model — so architecture and UX now match. Other UX needs are supported by the architecture stack: Reanimated 4 (card animations/gestures, 50+ FPS via New Architecture/Fabric), Lucide icons, `Badge`/`Toast`/`Switch`/`BottomSheet` primitives, and the accessibility posture (TalkBack, WCAG AA patterns) matches NFR-A1/A2.

### Alignment Issues

None material. Two cosmetic observations (not blockers, resolve at story time):
- UX spec lists `Switch` for the Quick Wins/Big Time toggle, while FR34 describes a re-press-to-deactivate 3-state behaviour — a component-choice detail for Story 3.2, not a spec conflict.
- UX spec references `docs/gluestack-ui-v3-components.md` and a community gluestack MCP server; confirm that reference file exists under `docs/` before relying on it during implementation.

### Warnings

None. UX documentation is present, thorough, and consistent with both the PRD and the (revised) architecture.

## Step 5: Epic Quality Review

Validated all 8 epics and their stories against create-epics-and-stories best practices (user value, independence, forward dependencies, story sizing, AC quality, DB-timing, starter-template requirement).

### 🔴 Critical Violations

**None.** No technical-milestone epics, no story that cannot be completed, no circular epic dependencies.

### 🟠 Major Issues

1. **No manual task-size path → Quick Wins/Big Time (Epic 3) has a cross-track dependency on AI (Epic 6).** Task `size` (`quick_win | big_time`) is, per FR4/FR35/FR36, **AI-auto-assigned then human-reviewed** — there is no FR or story for a user to set size manually. Story 1.4 (inline editing) edits title/description/deadline/notes/**context** toggles, but **not size**. Consequently, in the first delivery track (Epic 1 → 2 → 3 → 4), **Story 3.2's Quick Wins/Big Time toggle has no data to filter** until AI sizing lands in Epic 6 (second track). This weakens Epic 3's independent user value and is effectively an Epic 3 → Epic 6 dependency.
   - **Recommendation (pick one):** (a) add a manual size toggle (quick win / big time / unset) to Story 1.4 inline editing — and add/extend an FR to cover manual sizing — so tasks can be sized from Epic 1 independent of AI; or (b) explicitly re-sequence so Epic 6's sizing precedes Epic 3's mode toggle, and document that 3.2 is partially inert until then. Option (a) is cleaner and preserves track independence.

### 🟡 Minor Concerns

1. **Epic 7 ↔ Epic 4 cross-track dependency.** Story 7.1 (bulk archive) removes earned stars, which requires the Epic 4 star system. The two-track dependency diagram doesn't draw an Epic 4 → Epic 7 edge. Practically fine if tracks complete in order, but worth making the dependency explicit.
2. **Story 8.3 (Analytics & Logging) is the one non-user-facing story** (framed from the product-owner view — acceptable as a foundation story). However, deferring *all* instrumentation to Epic 8 means key events in Epics 1–7 ship uninstrumented until then. Consider whether basic PostHog event capture should be a lightweight cross-cutting concern introduced earlier (the architecture already lists PostHog as cross-cutting).
3. **FR66 numbering** sits under Rewards rather than at the end of the FR list (cosmetic; coverage is intact).

### Strengths (noted)

- **Starter-template requirement satisfied:** architecture specifies the Expo starter, and Story 1.0 is a proper "Project Scaffold & Development Foundation" story (this resolves a finding from the 2026-05-03/04 readiness reports, where scaffolding was missing from Story 1.1).
- **Incremental DB creation:** tables are created when first needed (1.2 task schema → 1.3 column expansion → 4.1 star transactions → 6.1 AI), not all upfront.
- **Graceful-degradation placeholders are well-handled:** forward-looking UI (e.g. Story 2.1's disabled "Help me with this" button → Epic 6; Story 2.3's toast → Epic 4) is explicitly marked as a placeholder that works without the future epic — these are *not* hard forward dependencies.
- **AC quality is high:** consistent BDD Given/When/Then, testable, with error/edge cases covered (offline, cancel, permission-denied, payment failure, restore purchases).
- **Configurable thresholds and centralized star weights** are called out (stale 7d / avoided 5 skips / absence 4d; `packages/shared/.../star-weights.ts`), with dogfooding refinement noted.

### Best-Practices Compliance

| Check | Result |
|-------|--------|
| Epics deliver user value | ✓ (8.3 is the lone product-owner/foundation story — acceptable) |
| Epics function independently | ⚠️ Epic 3 soft-depends on Epic 6 for size data (Major #1); Epic 7 on Epic 4 (Minor #1) |
| Stories appropriately sized | ✓ (8.2 split into 8.2a/8.2b is good sizing) |
| No hard forward dependencies | ✓ (future references are graceful placeholders) |
| DB tables created when needed | ✓ |
| Clear acceptance criteria | ✓ |
| Traceability to FRs maintained | ✓ (100%, per Step 3) |

## Summary and Recommendations

### Overall Readiness Status

**READY** — proceed to implementation, with one recommended refinement to land before Epic 3 (and naturally during Epic 1).

The planning artifacts are in strong shape: documents complete and non-duplicated, 100% FR→epic traceability, UX aligned with both PRD and the (just-revised) architecture, and no critical epic-quality violations. The recent session's edits (Expo SDK 56 + version bumps, learnings propagation, and the reconciled decisions — canonical `TaskData` type, gluestack copy-paste model, drizzle-kit migrations, JWKS auth, native Google sign-in) are internally consistent across PRD, Architecture, and Epics.

### Critical Issues Requiring Immediate Action

**None.** No blockers to starting Epic 1.

### Issues to Address (by priority)

1. **(Major) Manual task-size assignment is undefined**, leaving Epic 3's Quick Wins/Big Time toggle dependent on AI sizing (Epic 6, a different delivery track). Resolve by adding a manual size control to Story 1.4 inline editing (and a covering FR), so tasks can be sized from Epic 1 onward. This is addressable in-flight during Epic 1 — it does not block Stories 1.0–1.3.
2. **(Minor)** Make the Epic 4 → Epic 7 dependency explicit (star removal on archive needs the star system).
3. **(Minor)** Consider introducing lightweight PostHog event capture as a cross-cutting concern earlier, rather than deferring all instrumentation to Story 8.3.
4. **(Cosmetic)** FR66 numbering sits out of sequence under Rewards.

### Recommended Next Steps

1. Decide on the **size-assignment** remediation (extend Story 1.4 + add an FR is recommended) — capture via the `bmad-correct-course` workflow or a direct epics edit.
2. Commit the current planning-doc changes (they are consistent and ready) — the working-tree edits to PRD/Architecture/Epics + the CLAUDE.md rule.
3. Begin **Story 1.0** (Project Scaffold & Development Foundation) on Expo SDK 56.
4. Make the two minor dependency/instrumentation notes explicit in the epics when convenient.

### Final Note

This assessment identified **4 issues** (1 Major, 2 Minor, 1 Cosmetic) across **1 category** (epic quality/sequencing); document completeness, FR coverage, and UX alignment were all clean. None are blockers. Address the size-assignment gap before Epic 3 (ideally during Epic 1). The artifacts are otherwise ready for Phase 4 implementation.

---

**Assessed:** 2026-06-08 · **Assessor:** Implementation Readiness workflow (PM/SM) · **Project:** one-down--expo-bmad

### Post-assessment resolution (2026-06-08)

All findings were actioned the same day:
- **Major (size assignment):** added a manual size control to Story 1.4 inline editing + new **FR67** (covering manual sizing), registered in the FR Coverage Map (Epic 1) — the FR total is now 67. Quick Wins/Big Time (Story 3.2) no longer depends on AI sizing.
- **Minor #1 (Epic 4 → Epic 7):** dependency made explicit on the Epic 7 entry and Story 7.1.
- **Minor #3 (instrumentation):** after researching PostHog (RN), adopted a **hybrid** — initialize the SDK early (autocapture/lifecycle/feature-flags/`before_send`) + route custom domain events through a typed `track()` seam established in Story 1.0; per-story emission added as a cross-cutting requirement; Story 8.3 rescoped to wiring the live provider + server (`posthog-node` + hand-rolled tRPC middleware) + pino + privacy verification. Added a `logging-best-practices` skill, referenced from Story 8.3.
- **Cosmetic (FR66):** relocated to the end of the Rewards group (ID kept stable as an append-only identifier).



