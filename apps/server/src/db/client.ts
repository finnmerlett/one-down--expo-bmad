import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export type Database = ReturnType<typeof createDbClient>['db'];

export function createDbClient(databaseUrl: string) {
  const sql = postgres(databaseUrl, { prepare: false });
  const db = drizzle(sql, { schema });
  return { db, sql };
}
