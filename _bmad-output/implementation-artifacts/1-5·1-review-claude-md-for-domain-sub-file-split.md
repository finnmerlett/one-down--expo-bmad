# Story 1.5.1: Review CLAUDE.md for Domain Sub-File Split

Status: done
Date: 2026-06-11
Mode: BMad-lite autonomous run (checkpoint story — review only, no code)

## Story

As a maintainer, I want CLAUDE.md reviewed at the Epic 1 boundary, So that agent instructions are split into domain sub-files before they become unwieldy — or deliberately deferred while still manageable.

## Decision rule (from epics.md)

Split into domain files (e.g. testing.md, conventions.md, architecture.md) if CLAUDE.md is no longer manageable; defer if still < ~300 lines and < 8 sections, re-evaluating after Epic 2.

## Measurement (2026-06-11, post-1.5)

- **224 lines** (< 300 ✓)
- **8 top-level sections** (at the < 8 boundary): Project, Build & Test, E2E Testing, Dev Server, Architecture Overview, Conventions & Patterns, AI Agent Behaviour Guidelines, Testing & Quality Methodology

## Decision: DEFER — re-evaluate after Epic 2

- Lines are comfortably under the threshold; section count sits exactly at the limit but each section is short, coherent, and frequently cross-cutting (a split would force agents to open 2–3 files for routine work).
- Epic 1 added relatively little to CLAUDE.md (E2E section, testing methodology refinements); growth rate doesn't justify pre-emptive splitting.
- Per-story learnings live in `.claude/run-notes/decisions-log.md` and story files, not CLAUDE.md, which keeps the growth pressure low.

### Trigger conditions for the Epic 2 re-evaluation

Split if any of: > 300 lines, a 9th top-level section is needed, or a single section (likely Testing & Quality Methodology) exceeds ~60 lines on its own.

## Tasks

- [x] Measure CLAUDE.md (lines, sections)
- [x] Apply the epics.md decision rule
- [x] Record decision + re-evaluation triggers
- [x] Sprint status: 1-5·1 done, epic-1 done
