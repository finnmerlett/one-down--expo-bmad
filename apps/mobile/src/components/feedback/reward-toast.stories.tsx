import type { Meta, StoryObj } from '@storybook/react';

import { STAR_WEIGHTS } from '@one-down/shared';

import { Box } from '@/components/ui/box';

import { RewardToast } from './reward-toast';

const meta = {
  title: 'feedback/RewardToast',
  component: RewardToast,
  decorators: [
    (Story) => (
      <Box className="flex-1 items-center bg-background-50 pt-8">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof RewardToast>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Story 2.3 — task completion award. */
export const Completion: Story = {
  args: {
    nativeID: 'toast-completion',
    title: 'One down!',
    stars: STAR_WEIGHTS.taskCompletion,
  },
};

/** Story 2.4 — cut-loose acknowledgment (strictly smaller award than completion). */
export const Released: Story = {
  args: {
    nativeID: 'toast-released',
    title: 'Released',
    stars: STAR_WEIGHTS.cutLoose,
  },
};

/** Singular star copy ("+1 star", not "+1 stars"). */
export const SingleStar: Story = {
  args: {
    nativeID: 'toast-single',
    title: 'One down!',
    stars: 1,
  },
};
