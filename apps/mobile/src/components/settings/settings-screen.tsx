import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSection } from '@/components/settings/account-section';
import { AiNotesSection } from '@/components/settings/ai-notes-section';
import { AppearanceSection } from '@/components/settings/appearance-section';
import { DebugSection } from '@/components/settings/debug-section';
import {
  NotificationPreferencesSection,
  type NotificationPermissionState,
} from '@/components/settings/notification-preferences-section';
import { SessionSection } from '@/components/settings/session-section';
import { SettingsView } from '@/components/settings/settings-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { AppearanceMode } from '@/services/appearance';
import type {
  ChallengeCadence,
  NotificationPrefs,
} from '@/services/notifications/notification-prefs';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * The whole settings screen as the user sees it — header, then each section
 * in the SettingsView scroller — driven entirely by props. `null` values mean
 * "not loaded yet": that section stays hidden so an early edit can never
 * overwrite stored values. src/app/settings.tsx supplies the data and
 * behaviour; the screen stories (and so the design canvas) supply fixtures.
 */
export function SettingsScreen({
  onBack,
  appearance,
  onAppearanceChange,
  email,
  onSignIn,
  onCreateAccount,
  onSignOut,
  aiNotes,
  onAiNotesChange,
  onAiNotesBlur,
  permission,
  prefs,
  onToggleDeadline,
  onChangeChallenges,
  onOpenSystemSettings,
  contextAutoOpen,
  onContextAutoOpenToggle,
  signedIn,
  onCapture,
}: {
  onBack: () => void;
  appearance: AppearanceMode | null;
  onAppearanceChange: (mode: AppearanceMode) => void;
  email: string | null;
  onSignIn: () => void;
  onCreateAccount: () => void;
  onSignOut: () => void;
  aiNotes: string | null;
  onAiNotesChange: (next: string) => void;
  onAiNotesBlur: () => void;
  permission: NotificationPermissionState;
  prefs: NotificationPrefs | null;
  onToggleDeadline: (enabled: boolean) => void;
  onChangeChallenges: (cadence: ChallengeCadence) => void;
  onOpenSystemSettings: () => void;
  contextAutoOpen: boolean | null;
  onContextAutoOpenToggle: (value: boolean) => void;
  signedIn: boolean;
  /** Resolves to the snapshot's uuid once the upload lands. */
  onCapture: () => Promise<string>;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="font-heading text-2xl text-typography-900">Settings</Text>
      </HStack>
      <SettingsView>
        {appearance ? <AppearanceSection mode={appearance} onChange={onAppearanceChange} /> : null}
        <AccountSection
          email={email}
          onSignIn={onSignIn}
          onCreateAccount={onCreateAccount}
          onSignOut={onSignOut}
        />
        {aiNotes !== null ? (
          <AiNotesSection notes={aiNotes} onChange={onAiNotesChange} onBlur={onAiNotesBlur} />
        ) : null}
        {prefs ? (
          <NotificationPreferencesSection
            permission={permission}
            prefs={prefs}
            onToggleDeadline={onToggleDeadline}
            onChangeChallenges={onChangeChallenges}
            onOpenSystemSettings={onOpenSystemSettings}
          />
        ) : null}
        {contextAutoOpen !== null ? (
          <SessionSection autoOpen={contextAutoOpen} onToggle={onContextAutoOpenToggle} />
        ) : null}
        <DebugSection signedIn={signedIn} onCapture={onCapture} />
      </SettingsView>
    </SafeAreaView>
  );
}
