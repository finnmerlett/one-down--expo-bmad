import { preferences } from '@one-down/shared/schema-local';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import { getPreference, setPreference } from './preferences-repository';

// Runs the real drizzle-kit migration SQL — proves the 0002 preferences
// migration wiring alongside the repository behaviour.
describe('preferences-repository (integration, real migration SQL)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  it('roundtrips a JSON value', async () => {
    await setPreference(testDb.db, 'notifications.prefs', {
      deadlineUrgency: false,
      challenges: 'weekly',
    });

    await expect(getPreference(testDb.db, 'notifications.prefs')).resolves.toEqual({
      deadlineUrgency: false,
      challenges: 'weekly',
    });
  });

  it('upserts — the second write overwrites the first', async () => {
    await setPreference(testDb.db, 'key', { a: 1 });
    await setPreference(testDb.db, 'key', { a: 2 });

    await expect(getPreference(testDb.db, 'key')).resolves.toEqual({ a: 2 });
    const rows = await testDb.db.select().from(preferences);
    expect(rows).toHaveLength(1);
  });

  it('returns null for an unknown key', async () => {
    await expect(getPreference(testDb.db, 'missing')).resolves.toBeNull();
  });

  it('returns null for a malformed stored value instead of throwing', async () => {
    await testDb.db
      .insert(preferences)
      .values({ key: 'corrupt', value: 'not-json{', updatedAt: new Date() });

    await expect(getPreference(testDb.db, 'corrupt')).resolves.toBeNull();
  });
});
