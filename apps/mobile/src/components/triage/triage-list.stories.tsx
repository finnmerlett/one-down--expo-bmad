import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { makeTask } from '@/components/card-stack/task-card.stories';
import { TriageList } from './triage-list';

const meta = {
  title: 'triage/TriageList',
  component: TriageList,
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-0 pt-4">
        <Story />
      </Box>
    ),
  ],
  args: {
    onKeep: () => {},
    onCutLoose: () => {},
    onLater: () => {},
    onGoToDeck: () => {},
  },
} satisfies Meta<typeof TriageList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Story 7.3 — one row per attention reason, fast decisions on each. */
export const AllReasons: Story = {
  args: {
    rows: [
      {
        task: makeTask({ id: 'task-due', title: 'Send the tax form' }),
        reason: 'deadline_passed',
      },
      {
        task: makeTask({ id: 'task-avoided', title: 'Reply to that email' }),
        reason: 'avoided',
      },
      {
        task: makeTask({ id: 'task-stale', title: 'Sort the filing cabinet' }),
        reason: 'stale',
      },
    ],
  },
};

/** Story 7.3 — empty attention list: "All caught up" with a deck CTA (AC3). */
export const AllCaughtUp: Story = {
  args: {
    rows: [],
  },
};
