import type { ParsedTaskDraft } from '@one-down/shared';

import { createTestDb, type TestDb } from '../test-utils/db';
import { loadLocalMigrationsSql } from '../test-utils/migrations';
import {
  clearBrainDumpDraft,
  getBrainDumpDraft,
  setBrainDumpDraft,
  EMPTY_BRAIN_DUMP_DRAFT,
} from './brain-dump-draft';

const draftTask = (title: string, evidence: string[] = []): ParsedTaskDraft => ({
  title,
  details: null,
  size: null,
  contexts: [],
  deadline: null,
  timeSensitive: false,
  evidence,
});

describe('brain dump draft (9.8 C1, integration, real migration SQL)', () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb(loadLocalMigrationsSql());
  });

  afterEach(() => {
    testDb.close();
  });

  it('round-trips the dump text and the parsed check stage', async () => {
    const draft = {
      text: 'Call the dentist. Clean the garage.',
      check: {
        tasks: [draftTask('Call the dentist', ['Call the dentist.'])],
        unclaimed: ['Clean the garage.'],
      },
    };
    await setBrainDumpDraft(testDb.db, draft);

    await expect(getBrainDumpDraft(testDb.db)).resolves.toEqual(draft);
  });

  it('returns null before any draft was ever saved', async () => {
    await expect(getBrainDumpDraft(testDb.db)).resolves.toBeNull();
  });

  it('degrades a pathologically large check to text-only instead of overflowing the preference cap', async () => {
    const hugeEvidence = Array.from({ length: 40 }, (_, index) =>
      `evidence line ${index} `.repeat(30),
    );
    const draft = {
      text: 'small dump',
      check: { tasks: [draftTask('Huge', hugeEvidence)], unclaimed: [] },
    };
    await setBrainDumpDraft(testDb.db, draft);

    await expect(getBrainDumpDraft(testDb.db)).resolves.toEqual({
      text: 'small dump',
      check: null,
    });
  });

  it('clear resets to the empty draft (Add N tasks path)', async () => {
    await setBrainDumpDraft(testDb.db, { text: 'leftover', check: null });
    await clearBrainDumpDraft(testDb.db);

    await expect(getBrainDumpDraft(testDb.db)).resolves.toEqual(EMPTY_BRAIN_DUMP_DRAFT);
  });
});
