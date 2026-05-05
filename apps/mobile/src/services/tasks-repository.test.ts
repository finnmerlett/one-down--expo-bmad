import type { LocalTask } from '@one-down/shared/schema-local';

import type { AppDatabase } from '@/lib/local-db';

import { createTask, getMostRecentTask, listTasks } from './tasks-repository';

type InsertCall = { values: Record<string, unknown>; ran: boolean };

function makeFakeDb(rows: LocalTask[] = []) {
  const inserts: InsertCall[] = [];
  let pendingInsert: InsertCall | undefined;
  let captured: { wantById?: string } = {};

  const db = {
    insert(_table: unknown) {
      pendingInsert = { values: {}, ran: false };
      return {
        values(v: Record<string, unknown>) {
          if (!pendingInsert) throw new Error('no pending insert');
          pendingInsert.values = v;
          return {
            run() {
              if (!pendingInsert) throw new Error('no pending insert');
              pendingInsert.ran = true;
              const inserted: LocalTask = {
                id: v.id as string,
                title: v.title as string,
                details: (v.details as string | null | undefined) ?? null,
                createdAt: v.createdAt as Date,
                updatedAt: v.updatedAt as Date,
              };
              rows.unshift(inserted);
              inserts.push(pendingInsert);
              pendingInsert = undefined;
            },
          };
        },
      };
    },
    select() {
      return {
        from(_table: unknown) {
          captured = {};
          return {
            where(condition: { __id?: string }) {
              captured.wantById = condition?.__id;
              return {
                get() {
                  if (captured.wantById) {
                    return rows.find((r) => r.id === captured.wantById);
                  }
                  return rows[0];
                },
              };
            },
            orderBy(_o: unknown) {
              return {
                all() {
                  return rows.slice();
                },
                get() {
                  return rows[0];
                },
                limit(_n: number) {
                  return {
                    get() {
                      return rows[0];
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  return { db: db as unknown as AppDatabase, inserts, rows };
}

jest.mock('drizzle-orm', () => {
  return {
    desc: () => ({}),
    eq: (_col: unknown, value: unknown) => ({ __id: value }),
  };
});

describe('tasks-repository.createTask', () => {
  test('rejects empty title', () => {
    const { db, inserts } = makeFakeDb();
    expect(() => createTask(db, { title: '' })).toThrow('Task title is required');
    expect(inserts).toHaveLength(0);
  });

  test('rejects whitespace-only title', () => {
    const { db, inserts } = makeFakeDb();
    expect(() => createTask(db, { title: '   ' })).toThrow('Task title is required');
    expect(inserts).toHaveLength(0);
  });

  test('trims the title before inserting', () => {
    const { db, inserts } = makeFakeDb();
    const t = createTask(db, { title: '  walk the dog  ' });
    expect(t.title).toBe('walk the dog');
    expect(inserts[0]?.values.title).toBe('walk the dog');
  });

  test('normalises undefined details to null', () => {
    const { db, inserts } = makeFakeDb();
    const t = createTask(db, { title: 'a' });
    expect(t.details).toBeNull();
    expect(inserts[0]?.values.details).toBeNull();
  });

  test('normalises whitespace-only details to null', () => {
    const { db, inserts } = makeFakeDb();
    const t = createTask(db, { title: 'a', details: '   ' });
    expect(t.details).toBeNull();
    expect(inserts[0]?.values.details).toBeNull();
  });

  test('keeps non-empty details after trimming', () => {
    const { db, inserts } = makeFakeDb();
    const t = createTask(db, { title: 'a', details: '  some notes  ' });
    expect(t.details).toBe('some notes');
    expect(inserts[0]?.values.details).toBe('some notes');
  });

  test('generates a UUID-shaped id and timestamps', () => {
    const { db } = makeFakeDb();
    const t = createTask(db, { title: 'a' });
    expect(t.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(t.createdAt).toBeInstanceOf(Date);
    expect(t.updatedAt).toBeInstanceOf(Date);
    expect(t.createdAt.getTime()).toBe(t.updatedAt.getTime());
  });
});

describe('tasks-repository.listTasks / getMostRecentTask', () => {
  test('listTasks returns rows from the fake db', () => {
    const seed: LocalTask[] = [
      {
        id: 'a',
        title: 'first',
        details: null,
        createdAt: new Date(1),
        updatedAt: new Date(1),
      },
    ];
    const { db } = makeFakeDb(seed);
    expect(listTasks(db)).toEqual(seed);
  });

  test('getMostRecentTask returns the head row', () => {
    const a: LocalTask = {
      id: 'a',
      title: 'first',
      details: null,
      createdAt: new Date(2),
      updatedAt: new Date(2),
    };
    const b: LocalTask = {
      id: 'b',
      title: 'second',
      details: null,
      createdAt: new Date(1),
      updatedAt: new Date(1),
    };
    const { db } = makeFakeDb([a, b]);
    expect(getMostRecentTask(db)).toEqual(a);
  });

  test('getMostRecentTask returns undefined when no rows exist', () => {
    const { db } = makeFakeDb([]);
    expect(getMostRecentTask(db)).toBeUndefined();
  });
});
