import type { Meta, StoryObj } from '@storybook/react';

import { SyncIndicatorView } from './sync-indicator';

// Presentational half only — the container just gates on the zustand store
// (renders null when idle).
const meta = {
  title: 'app-shell/SyncIndicator',
  component: SyncIndicatorView,
} satisfies Meta<typeof SyncIndicatorView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  args: { status: 'syncing' },
};

export const Retrying: Story = {
  args: { status: 'retrying' },
};
