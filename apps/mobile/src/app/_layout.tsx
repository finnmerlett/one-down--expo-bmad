import '../global.css';

import { Stack } from 'expo-router';

import { AppPostHogProvider } from '../lib/posthog';

export default function RootLayout() {
  return (
    <AppPostHogProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppPostHogProvider>
  );
}
