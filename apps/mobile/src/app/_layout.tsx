import '../global.css';

import { Stack } from 'expo-router';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

import { AppPostHogProvider } from '../lib/posthog';

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <AppPostHogProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AppPostHogProvider>
    </GluestackUIProvider>
  );
}
