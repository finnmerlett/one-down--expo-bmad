import type { Meta, StoryObj } from '@storybook/react';

import { ScreenPlaceholder } from './screen-placeholder';

const meta = {
  title: 'foundation/ScreenPlaceholder',
  component: ScreenPlaceholder,
} satisfies Meta<typeof ScreenPlaceholder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
