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

/** v1.5 F-treatment (frame 06): every group guessed — WE GUESSED tags,
 *  blue-tinted dashed rows/chips, one navy tick per group, Confirm all. */
export const WithReviewFlags: Story = {
  args: {
    task: makeTask({
      id: 'task-flagged',
      title: 'Call the dentist soon',
      size: 'quick_win',
      contexts: '["phone"]',
      deadline: new Date('2026-08-02T18:00:00Z'),
      hasCheckNeeded: true,
      reviewFlags: JSON.stringify({
        inferred: ['size', 'contexts', 'deadline'],
      }),
    }),
    onConfirm: () => {},
  },
};

/** NOTHING TO GO ON (frame 06 variant): the grey dashed missing-deadline
 *  row — a date or `None` settles it. */
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
