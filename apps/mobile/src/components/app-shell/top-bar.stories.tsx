import type { Meta, StoryObj } from '@storybook/react';

import { TopBar } from './top-bar';

const meta = {
  title: 'app-shell/TopBar',
  component: TopBar,
} satisfies Meta<typeof TopBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
