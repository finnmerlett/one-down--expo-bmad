import { tasks } from '@one-down/shared/schema-local';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { type SQLiteDatabase, openDatabaseSync } from 'expo-sqlite';

const schema = { tasks };

export type AppSchema = typeof schema;
export type AppDatabase = ExpoSQLiteDatabase<AppSchema>;

let dbInstance: AppDatabase | undefined;

export function getLocalDb(): AppDatabase {
  if (!dbInstance) {
    dbInstance = drizzle(openDatabaseSync('one-down.db', { enableChangeListener: true }), { schema });
  }
  return dbInstance;
}

export function runInitialMigrations(db: AppDatabase = getLocalDb()): void {
  const sqlite = (db as unknown as { $client: SQLiteDatabase }).$client;
  sqlite.execSync(
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
  );
}
