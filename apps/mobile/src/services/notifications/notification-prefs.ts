import {
  getPreference,
  setPreference,
  type PreferencesDb,
} from '@/services/preferences-repository';

export type ChallengeCadence = 'off' | 'daily' | 'every_3_days' | 'weekly';

export interface NotificationPrefs {
  /** Deadline-urgency reminders (AC1) — default ON. */
  deadlineUrgency: boolean;
  /** Challenge invitations (AC2) — default OFF; cadence when enabled. */
  challenges: ChallengeCadence;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  deadlineUrgency: true,
  challenges: 'off',
};

export const NOTIFICATION_PREFS_KEY = 'notifications.prefs';

/** Stored prefs merged over defaults — missing/malformed rows fall back cleanly. */
export async function getNotificationPrefs(db: PreferencesDb): Promise<NotificationPrefs> {
  const stored = await getPreference<Partial<NotificationPrefs>>(db, NOTIFICATION_PREFS_KEY);
  return { ...DEFAULT_NOTIFICATION_PREFS, ...stored };
}

export async function setNotificationPrefs(
  db: PreferencesDb,
  prefs: NotificationPrefs,
): Promise<void> {
  await setPreference(db, NOTIFICATION_PREFS_KEY, prefs);
}
