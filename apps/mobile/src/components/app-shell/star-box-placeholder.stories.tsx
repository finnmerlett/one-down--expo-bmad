import type { Meta, StoryObj } from '@storybook/react';

import { StarBoxPlaceholder } from './star-box-placeholder';

const meta = {
  title: 'app-shell/StarBoxPlaceholder',
  component: StarBoxPlaceholder,
} satisfies Meta<typeof StarBoxPlaceholder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
