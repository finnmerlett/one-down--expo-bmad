import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/components/auth/auth-provider';

// Auth-aware gate (AC-9): with a live session the auth screens are
// unreachable — land on settings, which now shows the signed-in state.
export default function AuthLayout() {
  const { session } = useAuth();

  if (session) {
    return <Redirect href="/settings" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
