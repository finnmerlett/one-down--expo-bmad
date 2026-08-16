import { track } from '@/lib/analytics/track';
import {
  getPreference,
  setPreference,
  type PreferencesDb,
} from '@/services/preferences-repository';

/**
 * "Ask for your context on open" (Story 9.8, Keep D4): whether the
 * change-context box auto-expands on the session's first home mount (the
 * behaviour since v1.5 frame 01), or the stack just shows with whatever the
 * previous context was. Default ON — the shipped behaviour.
 */
const KEY = 'context_bar.auto_open';
export const DEFAULT_CONTEXT_AUTO_OPEN = true;

export async function getContextAutoOpen(db: PreferencesDb): Promise<boolean> {
  const stored = await getPreference<boolean>(db, KEY);
  return stored ?? DEFAULT_CONTEXT_AUTO_OPEN;
}

export async function setContextAutoOpen(db: PreferencesDb, value: boolean): Promise<void> {
  await setPreference(db, KEY, value);
  track('context_auto_open_changed', { value });
}
