import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { tasks } from '@one-down/shared/schema-local';

import type { PreferencesDb } from '@/services/preferences-repository';

import { diffScheduled } from './notification-diff';
import { planNotifications, type NotificationType } from './notification-planner';
import { getNotificationPrefs } from './notification-prefs';

// Thin impure layer over expo-notifications — ALL policy lives in the pure
// planner/diff modules; this file only reads state and applies the diff.

/**
 * One-time process setup: Android channel (8+) + foreground presentation.
 * Local mode by design (decisions-log 2026-07-16): no push tokens, no EAS —
 * the planner output is the future insertion point for a remote sender.
 */
export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/**
 * Reconcile the OS-scheduled notifications with the desired set derived from
 * current tasks + prefs (AC6). No-op without permission (AC5) — preferences
 * stay editable, scheduling simply resumes once permission is granted.
 */
export async function resyncNotifications(db: PreferencesDb): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const [taskRows, prefs] = await Promise.all([db.select().from(tasks), getNotificationPrefs(db)]);
  const desired = planNotifications(taskRows, prefs, new Date());

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  // The plan key doubles as the OS notification identifier (set below), so
  // cancellation is a direct identifier cancel; data.key is the fallback for
  // requests scheduled before this convention.
  const existingKeys = scheduled
    .map((request) => {
      const dataKey = (request.content.data as { key?: unknown } | null)?.key;
      return typeof dataKey === 'string' ? dataKey : request.identifier;
    })
    .filter((key): key is string => typeof key === 'string');

  const { toCancel, toSchedule } = diffScheduled(desired, existingKeys);

  await Promise.all(toCancel.map((key) => Notifications.cancelScheduledNotificationAsync(key)));
  await Promise.all(
    toSchedule.map((planned) =>
      Notifications.scheduleNotificationAsync({
        identifier: planned.key,
        content: {
          title: planned.title,
          body: planned.body,
          data: { key: planned.key, type: planned.type },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: planned.fireAt,
        },
      }),
    ),
  );
}

/** Notification type carried in content.data (for `notification_opened`). */
export function notificationTypeFromResponse(
  response: Notifications.NotificationResponse,
): NotificationType | null {
  const type = (response.notification.request.content.data as { type?: unknown } | null)?.type;
  return type === 'deadline_urgency' || type === 'challenge' ? type : null;
}
