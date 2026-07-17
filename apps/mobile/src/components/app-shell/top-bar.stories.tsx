import type { Meta, StoryObj } from '@storybook/react';

import { TopBar } from './top-bar';

const meta = {
  title: 'app-shell/TopBar',
  component: TopBar,
} satisfies Meta<typeof TopBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Story 4.2 — live star totals in the counter box. */
export const WithStars: Story = {
  args: {
    starTotals: { total: 42, today: 5 },
    onStarPress: () => {},
  },
};
