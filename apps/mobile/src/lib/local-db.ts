import { tasks } from '@one-down/shared/schema-local';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { type SQLiteDatabase, openDatabaseSync } from 'expo-sqlite';

const schema = { tasks };

export type AppSchema = typeof schema;
export type AppDatabase = ExpoSQLiteDatabase<AppSchema>;

let dbInstance: AppDatabase | undefined;

export function getLocalDb(): AppDatabase {
  if (!dbInstance) {
    dbInstance = drizzle(openDatabaseSync('one-down.db', { enableChangeListener: true }), {
      schema,
    });
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
      status TEXT NOT NULL DEFAULT 'pending',
      size TEXT,
      contexts TEXT,
      deadline INTEGER,
      has_check_needed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
  );
  const pragma = sqlite.getAllSync('PRAGMA table_info(tasks)') as Array<{ name: string }>;
  const existing = new Set(pragma.map((c) => c.name));
  const alters: string[] = [];
  if (!existing.has('status'))
    alters.push("ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
  if (!existing.has('size')) alters.push('ALTER TABLE tasks ADD COLUMN size TEXT');
  if (!existing.has('contexts')) alters.push('ALTER TABLE tasks ADD COLUMN contexts TEXT');
  if (!existing.has('deadline')) alters.push('ALTER TABLE tasks ADD COLUMN deadline INTEGER');
  if (!existing.has('has_check_needed'))
    alters.push('ALTER TABLE tasks ADD COLUMN has_check_needed INTEGER NOT NULL DEFAULT 0');
  for (const sql of alters) {
    sqlite.execSync(sql);
  }
}
