import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { TaskHealthPrompt } from './task-health-prompt';

const meta = {
  title: 'card-stack/TaskHealthPrompt',
  component: TaskHealthPrompt,
  decorators: [
    (Story) => (
      <Box className="flex-1 justify-center bg-background-0 p-6">
        <Story />
      </Box>
    ),
  ],
  args: {
    onKeep: () => {},
    onCutLoose: () => {},
    onBreakDown: () => {},
  },
} satisfies Meta<typeof TaskHealthPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Story 7.2 — stale copy: gentle, factual, zero shame. */
export const Stale: Story = {
  args: { flag: 'stale' },
};

/** Story 7.2 — avoided copy ("No judgement"). */
export const Avoided: Story = {
  args: { flag: 'avoided' },
};
