import '../global.css';

import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { Gabarito_400Regular, Gabarito_500Medium } from '@expo-google-fonts/gabarito';
import {
  Karla_400Regular,
  Karla_500Medium,
  Karla_600SemiBold,
  Karla_700Bold,
} from '@expo-google-fonts/karla';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
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
  // v1.5 type stack (designs/v1.5-implementation-spec.md §1): Gabarito for
  // titles, Karla for UI text, DM Mono for numbers & caps labels. Static
  // weights = separate RN font families, all loaded up front.
  //
  // Imperative loadAsync instead of the useFonts hook: on cold start under
  // this app's setup the hook's state update was lost (loaded stayed false
  // until a fast-refresh remount — 2026-08-05). The promise path releases the
  // gate deterministically, and a 4s race means a hung/failed load degrades
  // to system fonts instead of a forever-blank app.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = Font.loadAsync({
      Gabarito_400Regular,
      Gabarito_500Medium,
      Karla_400Regular,
      Karla_500Medium,
      Karla_600SemiBold,
      Karla_700Bold,
      DMMono_400Regular,
      DMMono_500Medium,
    });
    const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
    void Promise.race([load, timeout])
      .catch((error: unknown) => {
        // oxlint-disable-next-line no-console
        console.warn('Font load failed — falling back to system fonts', error);
      })
      .finally(() => {
        if (!cancelled) setFontsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate entitlements on every launch (8.2b AC6) — a purchased
  // entitlement survives restarts via the provider's persisted state.
  useEffect(() => {
    void refreshEntitlements().catch((error: unknown) =>
      // oxlint-disable-next-line no-console
      console.warn('Entitlements refresh failed', error),
    );
  }, []);

  // Hold on the (blank) splash until fonts resolve — avoids a flash of the
  // system font. The 4s race above guarantees this gate always releases.
  if (!fontsReady) {
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
