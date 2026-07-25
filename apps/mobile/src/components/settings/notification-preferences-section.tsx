import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import type {
  ChallengeCadence,
  NotificationPrefs,
} from '@/services/notifications/notification-prefs';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

const CADENCE_OPTIONS: { value: Exclude<ChallengeCadence, 'off'>; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_3_days', label: 'Every 3 days' },
  { value: 'weekly', label: 'Weekly' },
];

/**
 * Notifications section of the settings screen (Story 8.1). Presentational —
 * the route owns permission checks and persistence, so every state here is
 * driven by props (and Storybook can render each one directly).
 */
export function NotificationPreferencesSection({
  permission,
  prefs,
  onToggleDeadline,
  onChangeChallenges,
  onOpenSystemSettings,
}: {
  permission: NotificationPermissionState;
  prefs: NotificationPrefs;
  onToggleDeadline: (enabled: boolean) => void;
  onChangeChallenges: (cadence: ChallengeCadence) => void;
  onOpenSystemSettings: () => void;
}) {
  const challengesOn = prefs.challenges !== 'off';

  return (
    <VStack className="gap-3 rounded-3xl border border-outline-100 bg-background-0 p-5">
      <Text className="font-heading text-lg text-typography-900">Notifications</Text>

      {permission === 'denied' ? (
        // Calm, factual banner (AC5) — never framed as a loss. Prefs below
        // stay editable; scheduling simply resumes once permission exists.
        <Box className="gap-2 rounded-2xl bg-background-50 p-4">
          <Text className="font-body text-sm text-typography-600">
            Notifications are off. You can enable them any time in system settings.
          </Text>
          <Pressable
            accessibilityRole="button"
            aria-label="Open system settings"
            hitSlop={8}
            onPress={onOpenSystemSettings}
            className="min-h-11 justify-center self-start"
          >
            <Text className="font-body-bold text-primary-600">Open system settings</Text>
          </Pressable>
        </Box>
      ) : null}

      <HStack className="min-h-11 items-center justify-between">
        <Text className="font-body-medium text-base text-typography-900">Deadline reminders</Text>
        <Switch
          // accessibilityLabel, not aria-label: gluestack's createSwitch
          // drops aria-* before they reach RN's Switch, leaving the control
          // unlabeled for TalkBack/Maestro. The label is deliberately
          // DISTINCT from the row text so automation can address the control
          // itself (and TalkBack announces the switch's purpose).
          accessibilityLabel="Deadline reminders toggle"
          value={prefs.deadlineUrgency}
          onValueChange={onToggleDeadline}
        />
      </HStack>

      <HStack className="min-h-11 items-center justify-between">
        <Text className="font-body-medium text-base text-typography-900">
          Challenge invitations
        </Text>
        <Switch
          accessibilityLabel="Challenge invitations toggle"
          value={challengesOn}
          // Toggling on lands on the calm default cadence (weekly, AC4).
          onValueChange={(next) => onChangeChallenges(next ? 'weekly' : 'off')}
        />
      </HStack>

      {challengesOn ? (
        <HStack className="gap-2">
          {CADENCE_OPTIONS.map((option) => {
            const selected = prefs.challenges === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                aria-label={`Challenge frequency: ${option.label}`}
                accessibilityState={{ selected }}
                hitSlop={8}
                onPress={() => onChangeChallenges(option.value)}
                className={`min-h-11 flex-1 items-center justify-center rounded-full border px-3 ${
                  selected ? 'border-primary-200 bg-primary-100' : 'border-outline-200'
                }`}
              >
                <Text
                  className={
                    selected
                      ? 'font-body-bold text-sm text-primary-700'
                      : 'font-body-medium text-sm text-typography-600'
                  }
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
      ) : null}
    </VStack>
  );
}
