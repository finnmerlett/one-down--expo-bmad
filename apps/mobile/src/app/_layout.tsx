import '../global.css';

import { Stack } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { FakeBillingSheet } from '@/components/premium/fake-billing-sheet';
import { Box } from '@/components/ui/box';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Text } from '@/components/ui/text';

import migrations from '../../drizzle/migrations';
import { useNotificationResync } from '../hooks/use-notification-resync';
import { AppPostHogProvider } from '../lib/posthog';
import { db } from '../lib/local-db';
import { refreshEntitlements } from '../services/entitlements/entitlements-service';

// Schema migrations run before anything can touch the db; the navigator only
// mounts once they succeed.
function MigrationGate({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <Box className="flex-1 items-center justify-center gap-2 px-8">
        <Text className="text-center font-semibold text-typography-900">
          Something went wrong setting up local storage.
        </Text>
        <Text className="text-center text-sm text-typography-500">
          {__DEV__ ? error.message : 'Please reinstall or contact support.'}
        </Text>
      </Box>
    );
  }
  if (!success) {
    return null;
  }
  return children;
}

// Renders nothing — hosts the reactive notification resync (Story 8.1) so it
// only ever runs behind the MigrationGate (its live queries need the schema).
function NotificationResync() {
  useNotificationResync();
  return null;
}

export default function RootLayout() {
  // Hydrate entitlements on every launch (8.2b AC6) — a purchased
  // entitlement survives restarts via the provider's persisted state.
  useEffect(() => {
    void refreshEntitlements().catch((error: unknown) =>
      // oxlint-disable-next-line no-console
      console.warn('Entitlements refresh failed', error),
    );
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider mode="light">
        <AppPostHogProvider>
          <MigrationGate>
            <NotificationResync />
            <Stack screenOptions={{ headerShown: false }} />
          </MigrationGate>
          {/* Fake billing sheet (8.2b local mode) — no DB, outside the gate. */}
          <FakeBillingSheet />
        </AppPostHogProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
