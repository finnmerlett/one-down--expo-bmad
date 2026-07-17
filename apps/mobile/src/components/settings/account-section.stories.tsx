import type { Meta, StoryObj } from '@storybook/react';

import { AccountSection } from './account-section';

const meta = {
  title: 'settings/AccountSection',
  component: AccountSection,
  args: {
    onSignIn: () => {},
    onCreateAccount: () => {},
    onSignOut: () => {},
  },
} satisfies Meta<typeof AccountSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {
  args: { email: null },
};

export const SignedIn: Story = {
  args: { email: 'you@example.com' },
};
