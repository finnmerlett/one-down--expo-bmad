import type { Meta, StoryObj } from '@storybook/react';

import { CardStack } from './card-stack';
import { makeTask } from './task-card.stories';

const meta = {
  title: 'card-stack/CardStack',
  component: CardStack,
  // Deterministic stand-in for the home layer's potentialStars closure.
  args: { getStarValue: (task) => (task.size === 'big_time' ? 15 : 10) },
} satisfies Meta<typeof CardStack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThreeTasks: Story = {
  args: {
    tasks: [
      makeTask({ id: 'task-a', title: 'Water the plants', size: 'quick_win' }),
      makeTask({ id: 'task-b', title: 'Write trip packing list', contexts: '["home"]' }),
      makeTask({
        id: 'task-c',
        title: 'Renew passport',
        size: 'big_time',
        contexts: '["laptop","internet"]',
      }),
    ],
  },
};

export const SingleTask: Story = {
  args: {
    tasks: [makeTask({ id: 'task-solo', title: 'The only task' })],
  },
};
