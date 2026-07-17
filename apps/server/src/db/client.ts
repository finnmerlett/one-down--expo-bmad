import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

/**
 * Create the server Drizzle client. postgres.js opens connections lazily on
 * the first query, so constructing a client is side-effect free — the server
 * boots (and tests run) with a placeholder DATABASE_URL. Never connect at
 * import time; the underlying pool is reachable via `db.$client` (e.g. for
 * `end()` in tests).
 */
export function createDbClient(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;
