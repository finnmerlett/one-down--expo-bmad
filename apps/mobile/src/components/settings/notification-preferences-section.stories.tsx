import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { DEFAULT_NOTIFICATION_PREFS } from '@/services/notifications/notification-prefs';
import { NotificationPreferencesSection } from './notification-preferences-section';

const meta = {
  title: 'settings/NotificationPreferencesSection',
  component: NotificationPreferencesSection,
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-0 px-6 pt-6">
        <Story />
      </Box>
    ),
  ],
  args: {
    permission: 'granted',
    prefs: DEFAULT_NOTIFICATION_PREFS,
    onToggleDeadline: () => {},
    onChangeChallenges: () => {},
    onOpenSystemSettings: () => {},
  },
} satisfies Meta<typeof NotificationPreferencesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fresh install after permission granted: deadline ON, challenges OFF. */
export const Defaults: Story = {};

/** Permission denied → calm banner with the system-settings escape hatch. */
export const PermissionDenied: Story = {
  args: { permission: 'denied' },
};

/** Challenges enabled → the cadence selector appears (weekly default). */
export const ChallengesWeekly: Story = {
  args: { prefs: { deadlineUrgency: true, challenges: 'weekly' } },
};

/** Non-default cadence selected. */
export const ChallengesEvery3Days: Story = {
  args: { prefs: { deadlineUrgency: false, challenges: 'every_3_days' } },
};
