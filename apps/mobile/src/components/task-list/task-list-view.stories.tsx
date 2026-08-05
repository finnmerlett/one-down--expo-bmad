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

/** Story 4.4 — no completed tasks: both section headers hidden (AC3). */
export const NoDoneTasks: Story = {
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

/** Story 3.4 — shared EmptyState with the add-task CTA. */
export const Empty: Story = {
  args: {
    tasks: [],
    onAddPress: () => {},
  },
};

/** v1.5 frame 08 — star values on rows; a live badge tints its row gold
 *  (`+N` chip before the value, gold meta ink). */
export const WithValuesAndBonusRow: Story = {
  args: {
    tasks: [
      makeTask({
        id: 'task-bonus',
        title: 'Book dentist appointment',
        size: 'quick_win',
        contexts: '["phone"]',
        deadline: new Date('2026-06-20T09:00:00Z'),
      }),
      makeTask({ id: 'task-plain', title: 'Sort out the garage', size: 'big_time' }),
    ],
    getStarValue: (task) => (task.size === 'big_time' ? 20 : 5),
    getBadge: (task) =>
      task.id === 'task-bonus' ? { kind: 'window', amount: 3, reason: 'BONUS UNTIL SAT' } : null,
  },
};

/**
 * Story 4.4 — the visual reference: Done section on top (oldest completion
 * first, latest nearest the To do boundary), muted check rows, cut-loose
 * tasks in neither section.
 */
export const WithDoneTasks: Story = {
  args: {
    tasks: [
      makeTask({ id: 'task-1', title: 'Water the plants' }),
      makeTask({ id: 'task-2', title: 'Email the plumber' }),
      makeTask({
        id: 'task-3',
        title: 'Book dentist appointment',
        status: 'completed',
        updatedAt: new Date('2026-06-03T10:00:00Z'),
      }),
      makeTask({
        id: 'task-4',
        title: 'Sort out the garage',
        status: 'completed',
        updatedAt: new Date('2026-06-05T10:00:00Z'),
      }),
      makeTask({
        id: 'task-5',
        title: 'Renew car insurance',
        status: 'completed',
        updatedAt: new Date('2026-06-04T10:00:00Z'),
      }),
      makeTask({ id: 'task-6', title: 'Cancel gym membership', status: 'cut_loose' }),
    ],
  },
};

/**
 * Story 7.1 — multi-select mode: check circles on every row (todo AND done),
 * selection state announced in the row labels.
 */
export const MultiSelect: Story = {
  args: {
    tasks: [
      makeTask({ id: 'task-1', title: 'Water the plants' }),
      makeTask({ id: 'task-2', title: 'Email the plumber' }),
      makeTask({
        id: 'task-3',
        title: 'Book dentist appointment',
        status: 'completed',
        updatedAt: new Date('2026-06-03T10:00:00Z'),
      }),
    ],
    selectedIds: new Set(['task-1']),
    onToggleSelect: () => {},
    onLongPressTask: () => {},
  },
};

/**
 * Story 7.1 — recycle bin tab: archived and cut-loose rows with their origin
 * label and a per-row Restore button; active tasks never appear here.
 */
export const RecycleBin: Story = {
  args: {
    mode: 'bin',
    tasks: [
      makeTask({
        id: 'task-1',
        title: 'Old project notes',
        status: 'archived',
        updatedAt: new Date('2026-06-05T10:00:00Z'),
      }),
      makeTask({
        id: 'task-2',
        title: 'Cancel gym membership',
        status: 'cut_loose',
        updatedAt: new Date('2026-06-04T10:00:00Z'),
      }),
      makeTask({ id: 'task-3', title: 'Water the plants' }),
    ],
    onRestore: () => {},
    onLongPressTask: () => {},
  },
};

/** Story 7.1 — empty recycle bin ("Nothing here — everything's active."). */
export const EmptyBin: Story = {
  args: {
    mode: 'bin',
    tasks: [makeTask({ id: 'task-1', title: 'Water the plants' })],
  },
};
