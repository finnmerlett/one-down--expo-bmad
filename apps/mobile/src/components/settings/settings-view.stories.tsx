import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { NotificationPreferencesSection } from './notification-preferences-section';
import { SettingsView } from './settings-view';

const meta = {
  title: 'settings/SettingsView',
  // Shown in context by the screens/Settings screen stories; kept for tests.
  parameters: { canvas: { library: false } },
  component: SettingsView,
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-0">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof SettingsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The composition point with its first section (8.1 notifications). */
export const WithNotificationsSection: Story = {
  args: {
    children: (
      <NotificationPreferencesSection
        permission="granted"
        prefs={{ deadlineUrgency: true, challenges: 'weekly' }}
        onToggleDeadline={() => {}}
        onChangeChallenges={() => {}}
        onOpenSystemSettings={() => {}}
      />
    ),
  },
};
