import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import {
  NotificationPreferencesSection,
  type NotificationPermissionState,
} from '@/components/settings/notification-preferences-section';
import { SettingsView } from '@/components/settings/settings-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import {
  getNotificationPrefs,
  setNotificationPrefs,
  type ChallengeCadence,
  type NotificationPrefs,
} from '@/services/notifications/notification-prefs';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

function toPermissionState(
  response: Pick<Notifications.NotificationPermissionsStatus, 'granted' | 'status'>,
): NotificationPermissionState {
  if (response.granted) return 'granted';
  return response.status === 'undetermined' ? 'undetermined' : 'denied';
}

export default function SettingsScreen() {
  const router = useRouter();

  // null = stored prefs not loaded yet — the section renders only once real
  // values arrive so an early toggle can never overwrite them with defaults.
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>('undetermined');

  useEffect(() => {
    let cancelled = false;
    void getNotificationPrefs(db).then((stored) => {
      if (!cancelled) setPrefs(stored);
    });
    const checkPermission = () =>
      void Notifications.getPermissionsAsync().then((response) => {
        if (!cancelled) setPermission(toPermissionState(response));
      });
    checkPermission();
    // Re-check on return to foreground — catches a round-trip through the
    // system settings opened from the denied banner (AC5).
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPermission();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  // First ENABLE while the system permission was never asked → ask now (AC5).
  // Denied → the app keeps working; the banner explains, prefs stay editable.
  const requestingRef = useRef(false);
  const maybeRequestPermission = () => {
    if (permission !== 'undetermined' || requestingRef.current) return;
    requestingRef.current = true;
    void Notifications.requestPermissionsAsync()
      .then((response) => {
        track('notification_permission_resolved', { granted: response.granted });
        setPermission(toPermissionState(response));
      })
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Notification permission request failed', error))
      .finally(() => {
        requestingRef.current = false;
      });
  };

  // Optimistic local state + fire-and-forget persist (applyTaskPatch
  // discipline); the resync hook picks the write up via its live query.
  const applyPrefs = (
    next: NotificationPrefs,
    pref: 'deadline_urgency' | 'challenges',
    value: string,
    enables: boolean,
  ) => {
    setPrefs(next);
    void setNotificationPrefs(db, next)
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Notification prefs save failed', error));
    track('notification_pref_changed', { pref, value });
    if (enables) maybeRequestPermission();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-0">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="text-xl font-semibold text-typography-900">Settings</Text>
      </HStack>
      <SettingsView>
        {prefs ? (
          <NotificationPreferencesSection
            permission={permission}
            prefs={prefs}
            onToggleDeadline={(enabled) =>
              applyPrefs(
                { ...prefs, deadlineUrgency: enabled },
                'deadline_urgency',
                String(enabled),
                enabled,
              )
            }
            onChangeChallenges={(cadence: ChallengeCadence) =>
              applyPrefs(
                { ...prefs, challenges: cadence },
                'challenges',
                cadence,
                cadence !== 'off',
              )
            }
            onOpenSystemSettings={() => {
              void Linking.openSettings();
            }}
          />
        ) : null}
      </SettingsView>
    </SafeAreaView>
  );
}
