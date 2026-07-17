import type { Meta, StoryObj } from '@storybook/react';
import type { TaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';

import { TaskCard } from './task-card';

// Stable fixture dates — stories must be deterministic.
export function makeTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: 'task-1',
    title: 'Water the plants',
    details: null,
    notes: null,
    status: 'pending',
    size: null,
    contexts: null,
    deadline: null,
    hasCheckNeeded: false,
    reviewFlags: null,
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

const meta = {
  title: 'card-stack/TaskCard',
  component: TaskCard,
  // Baseline star preview: completionBase with no bonuses (Story 3.3).
  args: { starValue: 10 },
  decorators: [
    (Story) => (
      <Box className="flex-1 p-6" style={{ maxHeight: 480 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof TaskCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {
  args: { task: makeTask() },
};

export const WithSizeAndContexts: Story = {
  args: {
    task: makeTask({
      id: 'task-2',
      title: 'Book dentist appointment',
      size: 'quick_win',
      contexts: '["phone","internet"]',
    }),
  },
};

// Started task back in the stack — shows the Continue marker (UX flow 4).
export const InProgress: Story = {
  args: {
    task: makeTask({
      id: 'task-3',
      title: 'Sort out the garage',
      status: 'in_progress',
      size: 'big_time',
    }),
    starValue: 15,
  },
};

// Story 3.3 star-preview states: bigger/more urgent tasks are worth more.
export const BigTimeValue: Story = {
  args: {
    task: makeTask({ id: 'task-4', title: 'Redecorate the hallway', size: 'big_time' }),
    starValue: 15,
  },
};

export const NearDeadlineValue: Story = {
  args: {
    task: makeTask({
      id: 'task-5',
      title: 'File the tax return',
      size: 'quick_win',
      deadline: new Date('2026-06-02T09:00:00Z'),
    }),
    starValue: 15,
  },
};

// Story 6.2 — the front carries the review marker when checks are pending.
export const NeedsReview: Story = {
  args: {
    task: makeTask({
      id: 'task-6',
      title: 'Call the dentist soon',
      contexts: '["phone"]',
      hasCheckNeeded: true,
      reviewFlags: JSON.stringify({ inferred: ['contexts'], missingDeadline: true }),
    }),
  },
};
