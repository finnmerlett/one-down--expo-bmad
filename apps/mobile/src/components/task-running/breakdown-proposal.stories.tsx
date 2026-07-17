import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { BreakdownProposal } from './breakdown-proposal';

const FIRST_STEPS = [
  'Get everything you need for "Sort the paperwork mountain" in one place',
  'Do just the first two minutes',
  'Set a 10-minute timer and keep going',
];

const meta = {
  title: 'task-running/BreakdownProposal',
  component: BreakdownProposal,
  args: {
    steps: FIRST_STEPS,
    mode: 'first_steps',
    onAccept: () => undefined,
    onShowAll: () => undefined,
    onReject: () => undefined,
    onRetry: () => undefined,
  },
  decorators: [
    (Story) => (
      <Box className="bg-background-0 p-6">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof BreakdownProposal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { state: 'loading', steps: [] },
};

export const Proposal: Story = {
  args: { state: 'proposal' },
};

/** Full list — 'Show all steps' disappears (there is nothing more to show). */
export const FullProposal: Story = {
  args: {
    state: 'proposal',
    mode: 'full',
    steps: [
      ...FIRST_STEPS,
      'Push through to the halfway point',
      'Finish the last stretch',
      'Put things away and tick it off',
    ],
  },
};

export const ErrorState: Story = {
  args: { state: 'error', steps: [] },
};
