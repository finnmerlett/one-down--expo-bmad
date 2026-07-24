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
    skipCount: 0,
    skipWindowStartedAt: null,
    // "Now" so fixture tasks never trip the 7.2 stale detector (which reads
    // the real clock at render time); flagged stories override explicitly.
    lastEngagedAt: new Date(),
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

/** Story 7.2 — stale indicator: muted "Been a while" chip, never alarming. */
export const StaleTask: Story = {
  args: {
    task: makeTask({
      id: 'task-stale',
      title: 'Sort the filing cabinet',
      // 10 days without engagement, relative to the render clock.
      lastEngagedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    }),
  },
};

/** Story 7.2 — avoided indicator: threshold skips inside a live window. */
export const AvoidedTask: Story = {
  args: {
    task: makeTask({
      id: 'task-avoided',
      title: 'Reply to that email',
      skipCount: 6,
      skipWindowStartedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    }),
  },
};
