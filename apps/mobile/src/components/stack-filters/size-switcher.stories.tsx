import type { Meta, StoryObj } from '@storybook/react';

import { SizeSwitcher } from './size-switcher';

const meta = {
  title: 'stack-filters/SizeSwitcher',
  component: SizeSwitcher,
  args: {
    onSetMode: () => {},
  },
} satisfies Meta<typeof SizeSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const All: Story = {
  args: { mode: null },
};

export const QuickWins: Story = {
  args: { mode: 'quick_win' },
};

export const BigTime: Story = {
  args: { mode: 'big_time' },
};
