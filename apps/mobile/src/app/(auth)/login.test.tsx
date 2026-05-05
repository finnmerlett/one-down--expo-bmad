const mockSignIn = jest.fn();
const mockSignInWithGoogle = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signInWithGoogle: mockSignInWithGoogle,
    signUp: jest.fn(),
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

import LoginScreen from './login';

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders email and password inputs and login button', () => {
    const { getByTestId } = render(<LoginScreen />);

    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
    expect(getByTestId('google-button')).toBeTruthy();
  });

  test('calls signIn with email and password on submit', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('displays inline error on invalid credentials', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('Invalid login credentials') });

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'bad@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'wrong');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(getByTestId('login-error').props.children).toBe('Invalid login credentials');
    });
  });

  test('displays network error message on fetch failure', async () => {
    mockSignIn.mockRejectedValue(new TypeError('Network error'));

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      const errorText = getByTestId('login-error').props.children;
      expect(errorText).toContain("Couldn't reach the server");
    });
  });

  test('Google OAuth cancellation shows no error', async () => {
    mockSignInWithGoogle.mockResolvedValue({
      error: new Error('User cancelled the flow'),
    });

    const { getByTestId, queryByTestId } = render(<LoginScreen />);

    fireEvent.press(getByTestId('google-button'));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });

    expect(queryByTestId('login-error')).toBeNull();
  });
});
