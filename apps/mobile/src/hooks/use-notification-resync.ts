import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { preferences, tasks } from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import {
  notificationTypeFromResponse,
  resyncNotifications,
  setupNotifications,
} from '@/services/notifications/notification-scheduler';

/** Trailing debounce so burst mutations trigger one resync, not N (AC6). */
export const NOTIFICATION_RESYNC_DEBOUNCE_MS = 1000;

/**
 * Mounted ONCE in the root layout (inside MigrationGate): keeps the scheduled
 * notifications in sync with reality — reactively on every task/preference
 * mutation from ANY feature (the live queries fire via the sqlite change
 * listener, no per-callsite wiring), on app start, and on each return to
 * foreground (catches time passage). Also owns the notification-tap listener
 * (AC7) — tapping opens the app (OS default) and emits `notification_opened`.
 */
export function useNotificationResync(): void {
  // Trigger-only live queries: the row data itself is unused, but each emit
  // marks the desired notification set as potentially stale.
  const { data: taskRows } = useLiveQuery(
    db.select({ id: tasks.id, u: tasks.updatedAt }).from(tasks),
  );
  const { data: prefRows } = useLiveQuery(
    db.select({ u: preferences.updatedAt }).from(preferences),
  );

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void resyncNotifications(db).catch((error: unknown) =>
        // oxlint-disable-next-line no-console
        console.warn('Notification resync failed', error),
      );
    }, NOTIFICATION_RESYNC_DEBOUNCE_MS);
  }, [taskRows, prefRows]);

  useEffect(() => {
    void setupNotifications().catch((error: unknown) =>
      // oxlint-disable-next-line no-console
      console.warn('Notification setup failed', error),
    );

    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void resyncNotifications(db).catch((error: unknown) =>
        // oxlint-disable-next-line no-console
        console.warn('Notification resync failed', error),
      );
    });

    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      const type = notificationTypeFromResponse(event);
      if (type) track('notification_opened', { type });
    });

    return () => {
      appState.remove();
      response.remove();
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);
}
