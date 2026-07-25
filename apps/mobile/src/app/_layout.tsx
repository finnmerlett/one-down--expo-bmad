import '../global.css';

import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { AuthProvider } from '@/components/auth/auth-provider';
import { FakeBillingSheet } from '@/components/premium/fake-billing-sheet';
import { SyncManager } from '@/components/sync/sync-manager';
import { Box } from '@/components/ui/box';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Text } from '@/components/ui/text';

import migrations from '../../drizzle/migrations';
import { useNotificationResync } from '../hooks/use-notification-resync';
import { AppPostHogProvider } from '../lib/posthog';
import { TrpcProvider } from '../lib/trpc';
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
  // Nunito is the app-wide typeface (tailwind font-heading/font-body aliases).
  // Static weights = separate RN font families, all loaded up front.
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  // Hydrate entitlements on every launch (8.2b AC6) — a purchased
  // entitlement survives restarts via the provider's persisted state.
  useEffect(() => {
    void refreshEntitlements().catch((error: unknown) =>
      // oxlint-disable-next-line no-console
      console.warn('Entitlements refresh failed', error),
    );
  }, []);

  // Hold on the (blank) splash until fonts resolve — avoids a flash of the
  // system font. useFonts resolves instantly from cache after first launch.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider mode="light">
        <AppPostHogProvider>
          {/* AuthProvider OUTSIDE TrpcProvider (load-bearing order — the JWT
              must exist before the tRPC headers callback needs it), and
              TrpcProvider OUTSIDE MigrationGate — neither may depend on
              SQLite readiness. */}
          <AuthProvider>
            <TrpcProvider>
              <MigrationGate>
                <NotificationResync />
                {/* Sync triggers (5.3) — needs SQLite, auth, and tRPC above. */}
                <SyncManager />
                <Stack screenOptions={{ headerShown: false }} />
              </MigrationGate>
              {/* Fake billing sheet (8.2b local mode) — no DB, outside the gate. */}
              <FakeBillingSheet />
            </TrpcProvider>
          </AuthProvider>
        </AppPostHogProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
