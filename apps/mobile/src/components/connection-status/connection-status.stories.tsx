import type { Meta, StoryObj } from '@storybook/react';

import { ConnectionStatusView } from './connection-status';

// Presentational half only — the container needs a live tRPC provider and is
// covered by the Maestro E2E flow instead.
const meta = {
  title: 'connection-status/ConnectionStatusView',
  component: ConnectionStatusView,
} satisfies Meta<typeof ConnectionStatusView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checking: Story = {
  args: { status: 'checking' },
};

export const Connected: Story = {
  args: { status: 'connected' },
};

export const Offline: Story = {
  args: { status: 'offline' },
};
