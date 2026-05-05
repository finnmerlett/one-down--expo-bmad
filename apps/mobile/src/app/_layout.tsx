import '../global.css';

import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { runInitialMigrations } from '@/lib/local-db';
import { TrpcProvider } from '@/lib/trpc-provider';

export default function RootLayout() {
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    try {
      runInitialMigrations();
      setMigrated(true);
    } catch (error) {
      // oxlint-disable-next-line no-console
      console.error('Failed to run initial database migrations', error);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TrpcProvider>
          {migrated ? <Stack screenOptions={{ headerShown: false }} /> : null}
        </TrpcProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
