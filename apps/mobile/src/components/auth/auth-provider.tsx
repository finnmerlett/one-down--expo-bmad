import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AuthError, AuthRetryableFetchError, type Session } from '@supabase/supabase-js';

import { track } from '@/lib/analytics/track';
import { supabase } from '@/lib/supabase';

// User-safe copy — matter-of-fact, never blaming (UX no-guilt rule).
const NETWORK_MESSAGE = 'Couldn’t reach the server — check your connection and retry';
const INVALID_CREDENTIALS_MESSAGE = 'Email or password didn’t match — try again';
const EMAIL_TAKEN_MESSAGE = 'That email already has an account — try signing in instead';

export interface AuthResult {
  /** null on success; a user-safe inline message otherwise. */
  error: string | null;
}

interface AuthContextValue {
  session: Session | null;
  /** true until the persisted session has been read from secure storage. */
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Map supabase errors to user-safe strings — raw messages never reach the UI
// (and never carry the email anywhere near analytics, NFR-S3).
function toUserMessage(error: AuthError, fallback: string): string {
  if (error instanceof AuthRetryableFetchError) return NETWORK_MESSAGE;
  if (error.code === 'invalid_credentials') return INVALID_CREDENTIALS_MESSAGE;
  if (error.code === 'user_already_exists' || error.code === 'email_exists') {
    return EMAIL_TAKEN_MESSAGE;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setIsLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signInWithEmail: async (email, password) => {
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { error: toUserMessage(error, 'Couldn’t sign in — try again') };
        } catch (thrown) {
          // supabase-js normally RETURNS errors; a throw here is exceptional
          // (runtime/env issue) and must not strand the submitting screen.
          // oxlint-disable-next-line no-console
          console.warn('[auth] signIn threw', thrown);
          return { error: NETWORK_MESSAGE };
        }
        track('auth_signed_in', { method: 'email' });
        return { error: null };
      },
      signUpWithEmail: async (email, password) => {
        try {
          // Local GoTrue has confirmations disabled — signup returns a live
          // session immediately, so no verify-email limbo state exists here.
          const { error } = await supabase.auth.signUp({ email, password });
          if (error)
            return { error: toUserMessage(error, 'Couldn’t create the account — try again') };
        } catch (thrown) {
          // oxlint-disable-next-line no-console
          console.warn('[auth] signUp threw', thrown);
          return { error: NETWORK_MESSAGE };
        }
        track('auth_signed_up', { method: 'email' });
        return { error: null };
      },
      signOut: async () => {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) return { error: toUserMessage(error, 'Couldn’t sign out — try again') };
        } catch (thrown) {
          // oxlint-disable-next-line no-console
          console.warn('[auth] signOut threw', thrown);
          return { error: NETWORK_MESSAGE };
        }
        track('auth_signed_out', {});
        return { error: null };
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
