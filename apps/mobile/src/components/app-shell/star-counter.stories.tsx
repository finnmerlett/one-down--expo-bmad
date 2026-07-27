import type { Meta, StoryObj } from '@storybook/react';

import { StarCounter } from './star-counter';

const meta = {
  title: 'app-shell/StarCounter',
  component: StarCounter,
  args: {
    onPress: () => {},
  },
} satisfies Meta<typeof StarCounter>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Fresh install — zero history still renders real zeros (AC4). */
export const Zero: Story = {
  args: {
    total: 0,
    today: 0,
  },
};

export const WithStars: Story = {
  args: {
    total: 42,
    today: 5,
  },
};

/** Negative day (undo/archive retractions) — renders "−10", never "+-10". */
export const NegativeDay: Story = {
  args: {
    total: 13,
    today: -10,
  },
};
