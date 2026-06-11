import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { makeTask } from '@/components/card-stack/task-card.stories';
import { TaskListView } from './task-list-view';

const meta = {
  title: 'task-list/TaskListView',
  component: TaskListView,
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-0">
        <Story />
      </Box>
    ),
  ],
  args: {
    onTaskPress: () => {},
  },
} satisfies Meta<typeof TaskListView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  args: {
    tasks: [
      makeTask({
        id: 'task-1',
        title: 'Book dentist appointment',
        size: 'quick_win',
        contexts: '["home","phone"]',
        deadline: new Date('2026-06-20T09:00:00Z'),
      }),
      makeTask({ id: 'task-2', title: 'Sort out the garage', size: 'big_time' }),
      makeTask({ id: 'task-3', title: 'Water the plants' }),
    ],
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
  },
};
