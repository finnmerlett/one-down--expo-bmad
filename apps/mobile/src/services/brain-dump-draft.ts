import type { ParsedTaskDraft } from '@one-down/shared';

import { getPreference, setPreference, type PreferencesDb } from './preferences-repository';

/**
 * Brain dump draft persistence (Story 9.8, Keep C1): leaving the brain dump
 * — back arrow, hardware back, process death — never loses work. The dump
 * text AND the parsed check stage both survive; reopening restores whichever
 * stage was live. Cleared only when `Add N tasks` lands the tasks.
 *
 * Stored as an ordinary preference, so it rides the 9.7 preferences sync
 * unchanged (same pattern as the AI general notes).
 */
export interface BrainDumpCheckState {
  tasks: ParsedTaskDraft[];
  unclaimed: string[];
  /** 9.8 G8 — drafts of dropped tasks, keyed by each of their unclaimed
   *  lines: re-adding a line restores its draft instantly (no AI round
   *  trip). Absent on drafts saved before this shipped. */
  droppedDrafts?: Record<string, ParsedTaskDraft>;
}

export interface BrainDumpDraft {
  text: string;
  check: BrainDumpCheckState | null;
}

const KEY = 'brain_dump.draft';

/** Server-side preference values cap at 16 384 chars (preferenceUpsertSchema);
 *  a 2 000-char dump can't legitimately get near this, but a pathological
 *  check payload degrades to text-only rather than poisoning the sync push. */
const MAX_DRAFT_JSON_CHARS = 15_000;

export const EMPTY_BRAIN_DUMP_DRAFT: BrainDumpDraft = { text: '', check: null };

export async function getBrainDumpDraft(db: PreferencesDb): Promise<BrainDumpDraft | null> {
  return getPreference<BrainDumpDraft>(db, KEY);
}

export async function setBrainDumpDraft(db: PreferencesDb, draft: BrainDumpDraft): Promise<void> {
  const value =
    JSON.stringify(draft).length > MAX_DRAFT_JSON_CHARS ? { ...draft, check: null } : draft;
  await setPreference(db, KEY, value);
}

export async function clearBrainDumpDraft(db: PreferencesDb): Promise<void> {
  await setPreference(db, KEY, EMPTY_BRAIN_DUMP_DRAFT);
}
