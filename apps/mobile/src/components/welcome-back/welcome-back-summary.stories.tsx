import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { WelcomeBackSummary } from './welcome-back-summary';

const meta = {
  title: 'welcome-back/WelcomeBackSummary',
  component: WelcomeBackSummary,
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-0">
        <Story />
      </Box>
    ),
  ],
  args: {
    onTriage: () => {},
    onDeck: () => {},
  },
} satisfies Meta<typeof WelcomeBackSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Story 7.3 — the typical return: all four factual lines. */
export const Typical: Story = {
  args: {
    summary: { daysAway: 5, tasksWaiting: 3, deadlinesPassed: 1, staleSuggestions: 2 },
  },
};

/** Zero-count lines are omitted — no deadlines, no stale suggestions. */
export const NoDeadlines: Story = {
  args: {
    summary: { daysAway: 4, tasksWaiting: 2, deadlinesPassed: 0, staleSuggestions: 0 },
  },
};

/** Singular copy variants ("1 day", "1 task is", "1 deadline"). */
export const Singular: Story = {
  args: {
    summary: { daysAway: 1, tasksWaiting: 1, deadlinesPassed: 1, staleSuggestions: 1 },
  },
};

/** Degenerate deep-link entry: zero days away, nothing waiting. */
export const NothingWaiting: Story = {
  args: {
    summary: { daysAway: 0, tasksWaiting: 0, deadlinesPassed: 0, staleSuggestions: 0 },
  },
};
