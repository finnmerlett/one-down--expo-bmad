import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { MicroTaskNudge } from './micro-task-nudge';

const meta = {
  title: 'card-stack/MicroTaskNudge',
  component: MicroTaskNudge,
  args: {
    step: null,
    onRequest: () => undefined,
    onAdd: () => undefined,
    onDismiss: () => undefined,
    onRetry: () => undefined,
  },
  decorators: [
    (Story) => (
      <Box className="bg-background-0 py-6">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof MicroTaskNudge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { state: 'idle' },
};

export const Loading: Story = {
  args: { state: 'loading' },
};

export const Proposal: Story = {
  args: {
    state: 'proposal',
    step: 'Do just the very first minute of "Ring the council office"',
  },
};

export const ErrorState: Story = {
  args: { state: 'error' },
};
