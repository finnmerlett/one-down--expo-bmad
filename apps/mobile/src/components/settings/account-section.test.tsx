import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './account-section.stories';

const { SignedOut, SignedIn } = composeStories(stories);

describe('AccountSection (portable stories)', () => {
  it('offers sign-in and create-account when signed out', async () => {
    const onSignIn = jest.fn();
    const onCreateAccount = jest.fn();
    const user = userEvent.setup();
    await render(<SignedOut onSignIn={onSignIn} onCreateAccount={onCreateAccount} />);

    await user.press(screen.getByLabelText('Sign in'));
    await user.press(screen.getByLabelText('Create account'));

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText(/Signed in as/)).toBeNull();
  });

  it('shows the email and forwards sign-out when signed in', async () => {
    const onSignOut = jest.fn();
    const user = userEvent.setup();
    await render(<SignedIn onSignOut={onSignOut} />);

    expect(screen.getByLabelText('Signed in as you@example.com')).toBeTruthy();
    await user.press(screen.getByLabelText('Sign out'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
