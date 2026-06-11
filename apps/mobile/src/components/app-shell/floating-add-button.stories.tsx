import type { Meta, StoryObj } from '@storybook/react';

import { FloatingAddButton } from './floating-add-button';

const meta = {
  title: 'app-shell/FloatingAddButton',
  component: FloatingAddButton,
} satisfies Meta<typeof FloatingAddButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
