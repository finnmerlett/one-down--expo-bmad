import { MAX_AI_GENERAL_NOTES_CHARS } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import {
  getPreference,
  setPreference,
  type PreferencesDb,
} from '@/services/preferences-repository';

/**
 * General AI notes (9-5 items 4+8): bullet-point facts about the user and how
 * they like their tasks — editable in settings, sent as prompt context with
 * every task-scoped AI call, and grown automatically from refine learnings
 * and triage size corrections. Device-local (the preferences table never
 * syncs) by design for v1.5.
 */

const AI_NOTES_KEY = 'ai.general_notes';

export async function getAiGeneralNotes(db: PreferencesDb): Promise<string> {
  let stored: string | null = null;
  try {
    stored = await getPreference<string>(db, AI_NOTES_KEY);
  } catch (error) {
    // First launch races the migrator (same guard as appearance.ts).
    if (!String(error).includes('no such table')) throw error;
  }
  return typeof stored === 'string' ? stored : '';
}

export async function setAiGeneralNotes(db: PreferencesDb, notes: string): Promise<void> {
  await setPreference(db, AI_NOTES_KEY, clampNotes(notes));
}

/** Oldest lines fall off first once the notes outgrow the cap — the newest
 *  learning must always fit. Pure, exported for unit tests. */
export function clampNotes(notes: string): string {
  let clamped = notes;
  while (clamped.length > MAX_AI_GENERAL_NOTES_CHARS) {
    const cut = clamped.indexOf('\n');
    if (cut === -1) return clamped.slice(clamped.length - MAX_AI_GENERAL_NOTES_CHARS);
    clamped = clamped.slice(cut + 1);
  }
  return clamped;
}

/** Append one learned fact as a bullet line. Duplicate lines are dropped so
 *  a repeated correction can't fill the notes with noise. Pure core exported
 *  for unit tests via `appendBullet`. */
export function appendBullet(notes: string, learning: string): string {
  const bullet = `- ${learning.trim()}`;
  const existing = notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (existing.includes(bullet)) return notes;
  return clampNotes(existing.length > 0 ? `${notes.trimEnd()}\n${bullet}` : bullet);
}

/**
 * Record an automatic learning (refine's `generalLearning`, or a triage size
 * correction). Fire-and-forget friendly: read-modify-write of the single
 * notes preference; `via` feeds the PII-safe analytics event only.
 */
export async function appendAiLearning(
  db: PreferencesDb,
  learning: string,
  via: 'refine' | 'triage',
): Promise<void> {
  const trimmed = learning.trim();
  if (!trimmed) return;
  const current = await getAiGeneralNotes(db);
  const next = appendBullet(current, trimmed);
  if (next === current) return;
  await setPreference(db, AI_NOTES_KEY, next);
  track('ai_learning_saved', { via });
}
