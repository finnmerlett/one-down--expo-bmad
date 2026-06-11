import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DRIZZLE_DIR = join(__dirname, '..', '..', 'drizzle');

// The exact drizzle-kit-generated SQL the app applies on-device (CLAUDE.md:
// integration tests must run the real schema, not a hand-written copy).
export function loadLocalMigrationsSql(): string[] {
  const journal = JSON.parse(readFileSync(join(DRIZZLE_DIR, 'meta', '_journal.json'), 'utf8')) as {
    entries: { tag: string }[];
  };
  return journal.entries.map((entry) =>
    readFileSync(join(DRIZZLE_DIR, `${entry.tag}.sql`), 'utf8'),
  );
}
