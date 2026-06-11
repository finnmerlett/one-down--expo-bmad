import { eq } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { createTestDb } from './db';

// Verifies the harness runs real SQL through drizzle (insert/select/update
// round-trip with type mapping), so feature stories can rely on it.
const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  body: text('body').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

const NOTES_DDL = `
  CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    body TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`;

describe('createTestDb', () => {
  it('round-trips rows through a real SQLite database with drizzle type mapping', () => {
    const { db, close } = createTestDb([NOTES_DDL]);
    const createdAt = new Date('2026-06-11T10:00:00.000Z');

    db.insert(notes).values({ id: 'n1', body: 'first', createdAt }).run();
    db.insert(notes).values({ id: 'n2', body: 'second', done: true, createdAt }).run();

    const all = db.select().from(notes).all();
    expect(all).toHaveLength(2);
    // drizzle maps INTEGER columns back to boolean / Date per column mode
    expect(all[0]).toMatchObject({ id: 'n1', done: false });
    expect(all[0]?.createdAt).toEqual(createdAt);

    db.update(notes).set({ done: true }).where(eq(notes.id, 'n1')).run();
    const undone = db.select().from(notes).where(eq(notes.done, false)).all();
    expect(undone).toHaveLength(0);

    close();
  });
});
