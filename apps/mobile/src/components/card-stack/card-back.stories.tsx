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
    onStart: () => {},
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

// Started task — the primary action reads Continue instead of Start (2.1).
export const InProgress: Story = {
  args: {
    task: makeTask({
      id: 'task-started',
      title: 'Sort out the garage',
      status: 'in_progress',
      notes: 'Shelves are up, boxes next',
    }),
  },
};

/** Story 2.4 — both actions live (Start + Cut loose), as wired on every surface. */
export const FullyWired: Story = {
  args: {
    task: makeTask({ id: 'task-wired', title: 'Cancel gym membership' }),
    onCutLoose: () => {},
  },
};

/** Story 6.2 — all three inferred flags plus the missing-deadline prompt. */
export const WithReviewFlags: Story = {
  args: {
    task: makeTask({
      id: 'task-flagged',
      title: 'Call the dentist soon',
      size: 'quick_win',
      contexts: '["phone"]',
      hasCheckNeeded: true,
      reviewFlags: JSON.stringify({
        inferred: ['size', 'contexts', 'deadline'],
        missingDeadline: true,
      }),
    }),
    onConfirm: () => {},
  },
};

/** Story 6.2 — only the "Needs a deadline — when?" prompt (no inferred fields). */
export const MissingDeadlineOnly: Story = {
  args: {
    task: makeTask({
      id: 'task-missing-deadline',
      title: 'Send the urgent form back',
      hasCheckNeeded: true,
      reviewFlags: JSON.stringify({ missingDeadline: true }),
    }),
    onConfirm: () => {},
  },
};

/** Story 7.2 — the health prompt in situ (avoided task, all actions wired). */
export const WithHealthPrompt: Story = {
  args: {
    task: makeTask({
      id: 'task-health',
      title: 'Book the boiler service',
      skipCount: 6,
      skipWindowStartedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    }),
    onStart: () => {},
    onCutLoose: () => {},
    onKeep: () => {},
  },
};
