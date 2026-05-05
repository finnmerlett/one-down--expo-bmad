const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockSignOut = jest.fn();

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: (...a: never[]) => mockGetSession(...a),
      onAuthStateChange: (...a: never[]) => mockOnAuthStateChange(...a),
      signUp: (...a: never[]) => mockSignUp(...a),
      signInWithPassword: (...a: never[]) => mockSignInWithPassword(...a),
      signInWithOAuth: (...a: never[]) => mockSignInWithOAuth(...a),
      signOut: (...a: never[]) => mockSignOut(...a),
    },
  },
}));

import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { useAuth } from '@/hooks/use-auth';

import { AuthProvider } from './auth-provider';

function TestConsumer() {
  const { loading, user } = useAuth();
  return <Text testID="status">{loading ? 'loading' : user ? 'authed' : 'anon'}</Text>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  test('starts in loading state and resolves to anon when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(getByTestId('status').props.children).toBe('loading');

    await waitFor(() => {
      expect(getByTestId('status').props.children).toBe('anon');
    });
  });

  test('resolves to authed when session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          user: { id: 'user-123', email: 'test@example.com' },
        },
      },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('status').props.children).toBe('authed');
    });
  });

  test('subscribes to auth state changes on mount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
