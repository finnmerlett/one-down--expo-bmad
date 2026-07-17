import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './auth-form.stories';

const { Login, Signup, Submitting, InlineError } = composeStories(stories);

describe('AuthForm (portable stories)', () => {
  it('submits trimmed email and password', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<Login onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), '  me@example.com  ');
    await user.type(screen.getByLabelText('Password'), 'hunter22');
    await user.press(screen.getByLabelText('Sign in'));

    expect(onSubmit).toHaveBeenCalledWith('me@example.com', 'hunter22');
  });

  it('blocks submit while fields are empty and shows the guard inline', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<Login onSubmit={onSubmit} />);

    await user.press(screen.getByLabelText('Sign in'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter your email and password first')).toBeTruthy();
  });

  it('blocks a too-short password', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<Signup onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'me@example.com');
    await user.type(screen.getByLabelText('Password'), 'abc');
    await user.press(screen.getByLabelText('Create account'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Use at least 6 characters for the password')).toBeTruthy();
  });

  it('renders the route-provided error inline', async () => {
    await render(<InlineError />);
    expect(screen.getByText('Email or password didn’t match — try again')).toBeTruthy();
  });

  it('renders the submitting state without crashing', async () => {
    await render(<Submitting />);
    expect(screen.getByLabelText('Sign in')).toBeTruthy();
  });
});
