import type { Meta, StoryObj } from '@storybook/react';

import { DebugSection } from './debug-section';

const meta = {
  title: 'settings/DebugSection',
  component: DebugSection,
  args: {
    onCapture: () => Promise.resolve('a1b2c3d4-0000-4000-8000-1234567890ab'),
  },
} satisfies Meta<typeof DebugSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {
  args: { signedIn: true },
};

export const SignedOut: Story = {
  args: { signedIn: false },
};
