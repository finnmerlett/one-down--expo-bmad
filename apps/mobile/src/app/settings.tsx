import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import type { NotificationPermissionState } from '@/components/settings/notification-preferences-section';
import { SettingsScreen } from '@/components/settings/settings-screen';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { trpcClient } from '@/lib/trpc';
import {
  getNotificationPrefs,
  setNotificationPrefs,
  type ChallengeCadence,
  type NotificationPrefs,
} from '@/services/notifications/notification-prefs';
import { getAiGeneralNotes, setAiGeneralNotes } from '@/services/ai-notes';
import { getAppearance, setAppearance, type AppearanceMode } from '@/services/appearance';
import { getContextAutoOpen, setContextAutoOpen } from '@/services/context-auto-open';
import { captureStateSnapshot } from '@/services/state-snapshot';

function toPermissionState(
  response: Pick<Notifications.NotificationPermissionsStatus, 'granted' | 'status'>,
): NotificationPermissionState {
  if (response.granted) return 'granted';
  return response.status === 'undetermined' ? 'undetermined' : 'denied';
}

// Data + behaviour for settings; everything visible is SettingsScreen.
export default function SettingsRoute() {
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
  // null until loaded (9.8 D4) — same early-toggle guard.
  const [contextAutoOpen, setContextAutoOpenState] = useState<boolean | null>(null);

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
    void getContextAutoOpen(db).then((stored) => {
      if (!cancelled) setContextAutoOpenState(stored);
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
    <SettingsScreen
      onBack={() => router.back()}
      appearance={appearance}
      onAppearanceChange={(mode) => {
        setAppearanceState(mode);
        void setAppearance(db, mode);
      }}
      email={session?.user.email ?? null}
      onSignIn={() => router.push('/(auth)/login')}
      onCreateAccount={() => router.push('/(auth)/signup')}
      // Sign-out lands back in the signed-out settings state (AC-9);
      // failures are silent by design — the section simply stays signed in.
      onSignOut={() => void signOut()}
      aiNotes={aiNotes}
      onAiNotesChange={setAiNotes}
      onAiNotesBlur={() => {
        // Only reachable while the section shows, i.e. once notes loaded.
        if (aiNotes === null) return;
        // Persist on blur — per-keystroke writes would spam the row.
        void setAiGeneralNotes(db, aiNotes)
          // oxlint-disable-next-line no-console
          .catch((error: unknown) => console.warn('AI notes save failed', error));
        track('ai_notes_edited', { length: aiNotes.length });
      }}
      permission={permission}
      prefs={prefs}
      // Both pref handlers are only reachable while the section shows (prefs loaded).
      onToggleDeadline={(enabled) => {
        if (!prefs) return;
        applyPrefs(
          { ...prefs, deadlineUrgency: enabled },
          'deadline_urgency',
          String(enabled),
          enabled,
        );
      }}
      onChangeChallenges={(cadence: ChallengeCadence) => {
        if (!prefs) return;
        applyPrefs({ ...prefs, challenges: cadence }, 'challenges', cadence, cadence !== 'off');
      }}
      onOpenSystemSettings={() => {
        void Linking.openSettings();
      }}
      contextAutoOpen={contextAutoOpen}
      onContextAutoOpenToggle={(value) => {
        setContextAutoOpenState(value);
        void setContextAutoOpen(db, value)
          // oxlint-disable-next-line no-console
          .catch((error: unknown) => console.warn('Context auto-open save failed', error));
      }}
      signedIn={session !== null}
      onCapture={() =>
        captureStateSnapshot(db, {
          save: (input) => trpcClient.snapshot.save.mutate(input),
        })
      }
    />
  );
}
