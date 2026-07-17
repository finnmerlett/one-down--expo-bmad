import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { preferences, tasks } from '@one-down/shared/schema-local';

// enableChangeListener is REQUIRED for useLiveQuery reactivity — without it
// live queries silently never re-run.
const expoDb = openDatabaseSync('one-down.db', { enableChangeListener: true });

export const db = drizzle(expoDb, { schema: { preferences, tasks } });
