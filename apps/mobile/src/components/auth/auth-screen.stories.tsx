import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { AuthScreen, type AuthMode } from './auth-screen';

const noop = () => {};

/**
 * The auth screen with its mode held locally (seeded from args) — so on the
 * canvas the "No account? / Already have an account?" link swaps between
 * sign in and create account, just as router.replace does in the app (the
 * key remounts the form fresh, like the new route). The fields are typable;
 * submitting is a no-op.
 */
function InteractiveAuth({
  initialMode = 'login',
  isSubmitting = false,
  errorMessage = null,
}: {
  initialMode?: AuthMode;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}) {
  const [mode, setMode] = useState(initialMode);
  // The swapped-to route mounts with fresh state: not submitting, no error.
  const seeded = mode === initialMode;
  return (
    <AuthScreen
      key={mode}
      mode={mode}
      onSubmit={noop}
      isSubmitting={seeded && isSubmitting}
      errorMessage={seeded ? errorMessage : null}
      onBack={noop}
      onSwitchMode={() => setMode((previous) => (previous === 'login' ? 'signup' : 'login'))}
    />
  );
}

const meta = {
  title: 'screens/Auth',
  component: InteractiveAuth,
  args: { initialMode: 'login' },
} satisfies Meta<typeof InteractiveAuth>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sign in, untouched: email + password fields and the link to create an account. */
export const LoginIdle: Story = {};

/** Sign in while typing — the keyboard is up on the email field. */
export const LoginTyping: Story = {
  parameters: { canvas: { keyboard: true } },
};

/** Sign in submitted: the button disables and shows its spinner. */
export const LoginSubmitting: Story = { args: { isSubmitting: true } };

/** Wrong credentials: the inline, matter-of-fact error under the fields. */
export const LoginError: Story = {
  args: { errorMessage: 'Email or password didn’t match — try again' },
};

/** Create account, untouched: the link back to sign in below the form. */
export const SignupIdle: Story = { args: { initialMode: 'signup' } };

/** Create account while typing — the keyboard is up on the email field. */
export const SignupTyping: Story = {
  args: { initialMode: 'signup' },
  parameters: { canvas: { keyboard: true } },
};

/** Create account submitted: the button disables and shows its spinner. */
export const SignupSubmitting: Story = { args: { initialMode: 'signup', isSubmitting: true } };

/** The email is already registered: the inline error points to sign in. */
export const SignupError: Story = {
  args: {
    initialMode: 'signup',
    errorMessage: 'That email already has an account — try signing in instead',
  },
};
