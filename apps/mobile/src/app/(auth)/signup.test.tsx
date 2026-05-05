const mockSignUp = jest.fn();
const mockSignInWithGoogle = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    signInWithGoogle: mockSignInWithGoogle,
    signIn: jest.fn(),
    signOut: jest.fn(),
    session: null,
    user: null,
    loading: false,
  }),
}));

jest.mock('expo-router', () => ({
  Link: jest.fn(({ children }) => children),
}));

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import SignupScreen from './signup';

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders email and password inputs and signup button', () => {
    const { getByTestId } = render(<SignupScreen />);

    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('signup-button')).toBeTruthy();
    expect(getByTestId('google-button')).toBeTruthy();
  });

  test('calls signUp with email and password on submit', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'new@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'securepass');
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'securepass');
    });
  });

  test('displays inline error on signup failure', async () => {
    mockSignUp.mockResolvedValue({ error: new Error('Email already registered') });

    const { getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'taken@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'pass');
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(getByTestId('signup-error').props.children).toBe('Email already registered');
    });
  });

  test('displays network error message on fetch failure', async () => {
    mockSignUp.mockRejectedValue(new TypeError('Network error'));

    const { getByTestId } = render(<SignupScreen />);

    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      const errorText = getByTestId('signup-error').props.children;
      expect(errorText).toContain("Couldn't reach the server");
    });
  });

  test('Google OAuth cancellation shows no error', async () => {
    mockSignInWithGoogle.mockResolvedValue({
      error: new Error('User cancelled the flow'),
    });

    const { getByTestId, queryByTestId } = render(<SignupScreen />);

    fireEvent.press(getByTestId('google-button'));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });

    expect(queryByTestId('signup-error')).toBeNull();
  });
});
