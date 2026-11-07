import type { Meta, StoryObj } from '@storybook/react';

import { WelcomeBackScreen } from './welcome-back-screen';

/**
 * The welcome-back screen holds no UI state of its own — both CTAs navigate
 * away — so the stories render it directly; the CTAs are no-ops.
 */
const meta = {
  title: 'screens/WelcomeBack',
  component: WelcomeBackScreen,
  args: {
    summary: { daysAway: 5, tasksWaiting: 3, deadlinesPassed: 1, staleSuggestions: 2 },
    onTriage: () => {},
    onDeck: () => {},
  },
} satisfies Meta<typeof WelcomeBackScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The typical return: all four factual lines. */
export const Typical: Story = {};

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
