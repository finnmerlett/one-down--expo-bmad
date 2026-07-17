import type { Meta, StoryObj } from '@storybook/react';

import { ModeToggle } from './mode-toggle';

const meta = {
  title: 'stack-filters/ModeToggle',
  component: ModeToggle,
  args: { onToggle: () => {} },
} satisfies Meta<typeof ModeToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neither: Story = {
  args: { mode: null },
};

export const QuickWinsActive: Story = {
  args: { mode: 'quick_win' },
};

export const BigTimeActive: Story = {
  args: { mode: 'big_time' },
};
