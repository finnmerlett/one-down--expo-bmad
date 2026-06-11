import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { CardBack } from './card-back';
import { makeTask } from './task-card.stories';

const meta = {
  title: 'card-stack/CardBack',
  component: CardBack,
  decorators: [
    (Story) => (
      <Box className="flex-1 p-4" style={{ maxHeight: 640 }}>
        <Story />
      </Box>
    ),
  ],
  args: {
    onPatch: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof CardBack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullDetails: Story = {
  args: {
    task: makeTask({
      id: 'task-full',
      title: 'Book dentist appointment',
      details: 'Ask about the wisdom tooth while at it',
      notes: 'Practice number is in the green folder',
      size: 'quick_win',
      contexts: '["home","phone"]',
      deadline: new Date('2026-06-20T09:00:00Z'),
    }),
  },
};

export const Minimal: Story = {
  args: {
    task: makeTask({ id: 'task-minimal', title: 'Water the plants' }),
  },
};
