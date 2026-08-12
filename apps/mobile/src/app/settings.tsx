import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { useAuth } from '@/components/auth/auth-provider';
import { AccountSection } from '@/components/settings/account-section';
import { AiNotesSection } from '@/components/settings/ai-notes-section';
import { AppearanceSection } from '@/components/settings/appearance-section';
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
import { getAiGeneralNotes, setAiGeneralNotes } from '@/services/ai-notes';
import { getAppearance, setAppearance, type AppearanceMode } from '@/services/appearance';

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
  const { session, signOut } = useAuth();

  // null = stored prefs not loaded yet — the section renders only once real
  // values arrive so an early toggle can never overwrite them with defaults.
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>('undetermined');
  // null until loaded — same early-toggle guard as the notification prefs.
  const [appearance, setAppearanceState] = useState<AppearanceMode | null>(null);
  // null until loaded (9-5 item 4) — an early edit can't clobber stored notes.
  const [aiNotes, setAiNotes] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getNotificationPrefs(db).then((stored) => {
      if (!cancelled) setPrefs(stored);
    });
    void getAppearance(db).then((stored) => {
      if (!cancelled) setAppearanceState(stored);
    });
    void getAiGeneralNotes(db).then((stored) => {
      if (!cancelled) setAiNotes(stored);
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
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
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
        <Text className="font-heading text-2xl text-typography-900">Settings</Text>
      </HStack>
      <SettingsView>
        {appearance ? (
          <AppearanceSection
            mode={appearance}
            onChange={(mode) => {
              setAppearanceState(mode);
              void setAppearance(db, mode);
            }}
          />
        ) : null}
        <AccountSection
          email={session?.user.email ?? null}
          onSignIn={() => router.push('/(auth)/login')}
          onCreateAccount={() => router.push('/(auth)/signup')}
          // Sign-out lands back in the signed-out settings state (AC-9);
          // failures are silent by design — the section simply stays signed in.
          onSignOut={() => void signOut()}
        />
        {aiNotes !== null ? (
          <AiNotesSection
            notes={aiNotes}
            onChange={setAiNotes}
            onBlur={() => {
              // Persist on blur — per-keystroke writes would spam the row.
              void setAiGeneralNotes(db, aiNotes)
                // oxlint-disable-next-line no-console
                .catch((error: unknown) => console.warn('AI notes save failed', error));
              track('ai_notes_edited', { length: aiNotes.length });
            }}
          />
        ) : null}
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
