import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/components/auth/auth-provider';

// Auth-aware gate (AC-9): with a live session the auth screens are
// unreachable — land on settings, which now shows the signed-in state.
export default function AuthLayout() {
  const { session } = useAuth();
  const router = useRouter();
  const isSignedIn = session !== null;

  // dismissTo (POP_TO), not <Redirect> (REPLACE): the auth screens are pushed
  // from /settings, so replacing them left a DUPLICATE /settings on the stack
  // — after signing in, the first "Back to home" tap popped to the twin and
  // looked like a no-op (caught by E2E flow 53). Popping back to the existing
  // /settings keeps the stack home → settings; on a cold deep link with a
  // live session (no /settings beneath), POP_TO pushes it instead.
  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) router.dismissTo('/settings');
    }, [isSignedIn, router]),
  );

  if (isSignedIn) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
