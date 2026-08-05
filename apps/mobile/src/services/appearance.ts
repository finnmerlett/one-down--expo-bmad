import { colorScheme } from 'nativewind';

import { track } from '@/lib/analytics/track';
import {
  getPreference,
  setPreference,
  type PreferencesDb,
} from '@/services/preferences-repository';

/**
 * Appearance control (v1.5 D7, ambiguity #44): System / Light / Dark,
 * default Light. Manual Light/Dark applies immediately via NativeWind's
 * colorScheme; "System" only truly follows the OS once a rebuilt APK ships
 * `userInterfaceStyle: "automatic"` — until then it behaves like the OS
 * value at app start.
 */
export const APPEARANCE_MODES = ['system', 'light', 'dark'] as const;
export type AppearanceMode = (typeof APPEARANCE_MODES)[number];

const APPEARANCE_KEY = 'appearance_mode';
export const DEFAULT_APPEARANCE: AppearanceMode = 'light';

export async function getAppearance(db: PreferencesDb): Promise<AppearanceMode> {
  let stored: AppearanceMode | null = null;
  try {
    stored = await getPreference<AppearanceMode>(db, APPEARANCE_KEY);
  } catch (error) {
    // First launch races the migrator: the preferences table may not exist
    // yet, which just means nothing is stored. Anything else still throws.
    if (!String(error).includes('no such table')) throw error;
  }
  return stored && (APPEARANCE_MODES as readonly string[]).includes(stored)
    ? stored
    : DEFAULT_APPEARANCE;
}

/** Push a mode into NativeWind — safe to call at startup and on change. */
export function applyAppearance(mode: AppearanceMode): void {
  colorScheme.set(mode);
}

export async function setAppearance(db: PreferencesDb, mode: AppearanceMode): Promise<void> {
  await setPreference(db, APPEARANCE_KEY, mode);
  applyAppearance(mode);
  track('appearance_changed', { value: mode });
}
