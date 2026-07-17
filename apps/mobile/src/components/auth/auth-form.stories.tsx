import type { Meta, StoryObj } from '@storybook/react';

import { AuthForm } from './auth-form';

const meta = {
  title: 'auth/AuthForm',
  component: AuthForm,
  args: {
    onSubmit: () => {},
    isSubmitting: false,
    errorMessage: null,
  },
} satisfies Meta<typeof AuthForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Login: Story = {
  args: { mode: 'login' },
};

export const Signup: Story = {
  args: { mode: 'signup' },
};

export const Submitting: Story = {
  args: { mode: 'login', isSubmitting: true },
};

export const InlineError: Story = {
  args: { mode: 'login', errorMessage: 'Email or password didn’t match — try again' },
};
