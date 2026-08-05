import type { Meta, StoryObj } from '@storybook/react';

import { MicroTaskNudge } from './micro-task-nudge';

const meta = {
  title: 'card-stack/MicroTaskNudge',
  component: MicroTaskNudge,
  args: {
    onGo: () => {},
    onRetry: () => {},
  },
} satisfies Meta<typeof MicroTaskNudge>;

export default meta;

type Story = StoryObj<typeof meta>;

/** E9: the quiet floating offer under the deck. */
export const Idle: Story = {
  args: { state: 'idle' },
};

/** Fetching the smallest step after the one-tap go. */
export const Loading: Story = {
  args: { state: 'loading' },
};

export const ErrorState: Story = {
  args: { state: 'error' },
};
