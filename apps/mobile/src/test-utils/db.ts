import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// Integration-test harness: a REAL in-memory SQLite database (no mocked DB).
// Tests exercise the same drizzle sqliteTable definitions the app uses against
// actual SQL. expo-sqlite itself can't run under Node/Jest, so better-sqlite3
// is the test driver; the schema and queries are identical.
//
// Story 1.2 onward: pass the drizzle-kit-generated migration SQL so tests run
// against the exact schema the app applies on-device via useMigrations().
export type TestDb = {
  db: BetterSQLite3Database;
  sqlite: Database.Database;
  close: () => void;
};

export function createTestDb(setupSql: readonly string[] = []): TestDb {
  const sqlite = new Database(':memory:');
  for (const statement of setupSql) {
    sqlite.exec(statement);
  }
  const db = drizzle(sqlite);
  return { db, sqlite, close: () => sqlite.close() };
}
