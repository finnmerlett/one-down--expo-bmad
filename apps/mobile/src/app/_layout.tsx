import '../global.css';

import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { Box } from '@/components/ui/box';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Text } from '@/components/ui/text';

import migrations from '../../drizzle/migrations';
import { AppPostHogProvider } from '../lib/posthog';
import { db } from '../lib/local-db';

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

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <AppPostHogProvider>
        <MigrationGate>
          <Stack screenOptions={{ headerShown: false }} />
        </MigrationGate>
      </AppPostHogProvider>
    </GluestackUIProvider>
  );
}
