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
  // v1.5 baseline: the card's size value (unsized rides at quick-win 5).
  args: { starValue: 5 },
  decorators: [
    // Same 330dp frame the deck gives the card in production (2026-07-27
    // compact-card feedback) — stories should show real proportions.
    (Story) => (
      <Box className="p-6" style={{ height: 378 }}>
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
    starValue: 20,
  },
};

// v1.5: size alone sets the value — big time is ★20.
export const BigTimeValue: Story = {
  args: {
    task: makeTask({ id: 'task-4', title: 'Redecorate the hallway', size: 'big_time' }),
    starValue: 20,
  },
};

/** v1.5 frame 04/E2 — the gold bonus band: badge + reason left, the card's
 *  real value in a white pill right, gold rail below. */
export const BonusWindow: Story = {
  args: {
    task: makeTask({
      id: 'task-5',
      title: 'Book dentist appointment',
      details: 'A five minute call — the practice opens at 9.',
      size: 'quick_win',
      contexts: '["phone"]',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }),
    starValue: 5,
    badge: { kind: 'window', amount: 3, reason: 'BONUS UNTIL WED' },
  },
};

/** v1.5 frame E4 — the don't-skip offer wears the same gold band. */
export const DontSkipOffer: Story = {
  args: {
    task: makeTask({
      id: 'task-offer',
      title: 'Chase the deposit back',
      details: 'They have had six weeks and one polite email.',
      size: 'quick_win',
    }),
    starValue: 5,
    badge: { kind: 'offer', amount: 3, reason: 'TO START IT NOW' },
  },
};

/** v1.5 frame E3 — inside two days: no badge, primary TOP OF THE DECK band. */
export const TopOfDeck: Story = {
  args: {
    task: makeTask({
      id: 'task-top',
      title: 'Book the boiler service',
      details: 'Last done in March. They want a morning slot.',
      size: 'big_time',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    }),
    starValue: 20,
    topOfDeck: true,
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
