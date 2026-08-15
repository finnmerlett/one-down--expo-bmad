import type { Meta, StoryObj } from '@storybook/react';

import type { StarActivityData } from '@one-down/shared';

import { Box } from '@/components/ui/box';

import { StarActivityLog } from './star-activity-log';

function makeEntry(overrides: Partial<StarActivityData> & { id: string }): StarActivityData {
  return {
    taskId: 'task-1',
    taskTitle: 'Sample task',
    action: 'task_completed',
    amount: 10,
    createdAt: new Date(),
    ...overrides,
  };
}

const meta = {
  title: 'star-log/StarActivityLog',
  component: StarActivityLog,
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-0 pt-4">
        <Story />
      </Box>
    ),
  ],
  args: {
    onFilterChange: () => {},
  },
} satisfies Meta<typeof StarActivityLog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mixed actions plus an older-day entry (dated timestamp format). */
export const WithEntries: Story = {
  args: {
    filter: 'all_time',
    entries: [
      makeEntry({ id: 'entry-1', taskTitle: 'Book dentist appointment', amount: 15 }),
      makeEntry({
        id: 'entry-2',
        taskTitle: 'Cancel gym membership',
        action: 'task_cut_loose',
        amount: 3,
      }),
      makeEntry({
        id: 'entry-3',
        taskTitle: 'Water the plants',
        amount: 10,
        createdAt: new Date('2026-06-03T14:32:00'),
      }),
    ],
  },
};

/** No transactions at all — first-run guidance (AC4). */
export const Empty: Story = {
  args: {
    filter: 'all_time',
    entries: [],
  },
};

/** Today filter active with no earnings yet today (older history exists). */
export const TodayEmpty: Story = {
  args: {
    filter: 'today',
    entries: [],
  },
};
