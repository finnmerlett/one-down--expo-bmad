import type { Meta, StoryObj } from '@storybook/react';

import { AppButton } from './index';

const meta = {
  title: 'ui/AppButton',
  component: AppButton,
  args: {
    label: 'Do the thing',
    onPress: () => {},
  },
} satisfies Meta<typeof AppButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { kind: 'primary' },
};

export const PrimaryCompact: Story = {
  args: { kind: 'primary-compact' },
};

export const Secondary: Story = {
  args: { kind: 'secondary' },
};

export const Disabled: Story = {
  args: { kind: 'primary', disabled: true },
};
