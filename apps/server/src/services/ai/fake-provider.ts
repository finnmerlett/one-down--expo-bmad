import {
  MAX_PARSED_TASKS,
  type ParsedTaskDraft,
  type TaskContext,
  type TaskSize,
} from '@one-down/shared';

import type { AiProvider, BreakdownTaskInput } from './provider';

// Deterministic fake provider — the no-GEMINI_API_KEY local mode (AC6).
// The rules below are a CONTRACT: Maestro E2E flows assert against these
// exact outputs, so any change here must update the flows in lockstep.
//
// Rules (all keyword matching is case-insensitive substring, first match wins):
// - segmentation: split on newlines and `.`/`;`, trim, drop empties, cap 20
// - title: the segment with its first letter capitalized
// - contexts: call|text|ring → phone; email|online|website|book → internet;
//   buy|shop|pick up → out_and_about; clean|tidy|wash|fix → home;
//   write|report|code → laptop
// - size: ≤5 words or contains `quick` → quick_win;
//   contains `plan|organise|organize|project` → big_time; else null
// - deadline: `today` → today 18:00 local; `tomorrow` → +1 day 18:00; else null
// - timeSensitive: deadline inferred OR contains `urgent|soon|asap|deadline`

const CONTEXT_RULES: ReadonlyArray<{
  keywords: readonly string[];
  contexts: readonly TaskContext[];
}> = [
  { keywords: ['call', 'text', 'ring'], contexts: ['phone'] },
  { keywords: ['email', 'online', 'website', 'book'], contexts: ['internet'] },
  { keywords: ['buy', 'shop', 'pick up'], contexts: ['out_and_about'] },
  { keywords: ['clean', 'tidy', 'wash', 'fix'], contexts: ['home'] },
  { keywords: ['write', 'report', 'code'], contexts: ['laptop'] },
];

const BIG_TIME_KEYWORDS = ['plan', 'organise', 'organize', 'project'] as const;
const URGENCY_KEYWORDS = ['urgent', 'soon', 'asap', 'deadline'] as const;

function containsAny(lower: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => lower.includes(keyword));
}

function inferContexts(lower: string): TaskContext[] {
  for (const rule of CONTEXT_RULES) {
    if (containsAny(lower, rule.keywords)) return [...rule.contexts];
  }
  return [];
}

function inferSize(segment: string, lower: string): TaskSize | null {
  const wordCount = segment.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 5 || lower.includes('quick')) return 'quick_win';
  if (containsAny(lower, BIG_TIME_KEYWORDS)) return 'big_time';
  return null;
}

/** 18:00 local time, `daysFromNow` days ahead, as an ISO string. */
function sixPmLocal(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(18, 0, 0, 0);
  return date.toISOString();
}

function inferDeadline(lower: string): string | null {
  if (lower.includes('today')) return sixPmLocal(0);
  if (lower.includes('tomorrow')) return sixPmLocal(1);
  return null;
}

function draftFromSegment(segment: string): ParsedTaskDraft {
  const lower = segment.toLowerCase();
  const deadline = inferDeadline(lower);

  return {
    title: segment.charAt(0).toUpperCase() + segment.slice(1),
    details: null,
    size: inferSize(segment, lower),
    contexts: inferContexts(lower),
    deadline,
    timeSensitive: deadline !== null || containsAny(lower, URGENCY_KEYWORDS),
  };
}

// Story 6.3 breakdown contract (Maestro asserts these exact strings):
// - first_steps: three starters, the first interpolating the task title
// - full: the three starters + three finisher steps
function fakeFirstSteps(title: string): string[] {
  return [
    `Get everything you need for "${title}" in one place`,
    'Do just the first two minutes',
    'Set a 10-minute timer and keep going',
  ];
}

const FAKE_REMAINING_STEPS = [
  'Push through to the halfway point',
  'Finish the last stretch',
  'Put things away and tick it off',
] as const;

export function createFakeProvider(): AiProvider {
  return {
    parseBrainDump(text: string): Promise<ParsedTaskDraft[]> {
      const segments = text
        .split(/[\n.;]/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0)
        .slice(0, MAX_PARSED_TASKS);

      return Promise.resolve(segments.map(draftFromSegment));
    },

    breakdownTask({ title, mode }: BreakdownTaskInput): Promise<string[]> {
      const firstSteps = fakeFirstSteps(title);
      return Promise.resolve(
        mode === 'full' ? [...firstSteps, ...FAKE_REMAINING_STEPS] : firstSteps,
      );
    },
  };
}
