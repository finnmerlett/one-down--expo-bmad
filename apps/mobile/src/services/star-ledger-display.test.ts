import type { StarActivityData } from '@one-down/shared';

import { visibleLedgerRows } from './star-ledger-display';

// Pure display logic (9.7 convention pass): the ledger is append-only, so
// what the user sees is decided here — same-LOCAL-day do/undo pairs are
// churn and collapse; cross-day pairs are honest history and stay.

function row(
  overrides: Partial<StarActivityData> & Pick<StarActivityData, 'id'>,
): StarActivityData {
  return {
    taskId: 'task-1',
    taskTitle: 'Sample task',
    action: 'task_completed',
    amount: 10,
    createdAt: new Date('2026-08-10T10:00:00'),
    ...overrides,
  };
}

const ids = (rows: StarActivityData[]) => rows.map((entry) => entry.id).sort();

describe('visibleLedgerRows', () => {
  it('collapses a same-day complete/undo pair', () => {
    const rows = [
      row({ id: 'a', amount: 12, createdAt: new Date('2026-08-10T10:00:00') }),
      row({
        id: 'b',
        action: 'completion_undone',
        amount: -12,
        createdAt: new Date('2026-08-10T10:05:00'),
      }),
    ];
    expect(visibleLedgerRows(rows)).toEqual([]);
  });

  it('keeps a CROSS-day pair visible (honest history)', () => {
    const rows = [
      row({ id: 'a', amount: 12, createdAt: new Date('2026-08-10T23:50:00') }),
      row({
        id: 'b',
        action: 'completion_undone',
        amount: -12,
        createdAt: new Date('2026-08-11T00:10:00'),
      }),
    ];
    expect(ids(visibleLedgerRows(rows))).toEqual(['a', 'b']);
  });

  it('collapses repeated same-day complete/undo cycles independently', () => {
    const rows = [
      row({ id: 'a1', amount: 12, createdAt: new Date('2026-08-10T09:00:00') }),
      row({
        id: 'u1',
        action: 'completion_undone',
        amount: -12,
        createdAt: new Date('2026-08-10T09:05:00'),
      }),
      row({ id: 'a2', amount: 15, createdAt: new Date('2026-08-10T11:00:00') }),
      row({
        id: 'u2',
        action: 'completion_undone',
        amount: -15,
        createdAt: new Date('2026-08-10T11:30:00'),
      }),
      row({ id: 'a3', amount: 13, createdAt: new Date('2026-08-10T12:00:00') }),
    ];
    // Both pairs vanish; the live re-completion stays.
    expect(ids(visibleLedgerRows(rows))).toEqual(['a3']);
  });

  it('handles the cut-loose family separately from completions', () => {
    const rows = [
      row({
        id: 'c',
        action: 'task_cut_loose',
        amount: 2,
        createdAt: new Date('2026-08-10T10:00:00'),
      }),
      row({
        id: 'cu',
        action: 'cut_loose_undone',
        amount: -2,
        createdAt: new Date('2026-08-10T10:01:00'),
      }),
      row({ id: 'a', amount: 12, createdAt: new Date('2026-08-10T10:00:00') }),
    ];
    // The cut-loose pair collapses; the unrelated completion is untouched.
    expect(ids(visibleLedgerRows(rows))).toEqual(['a']);
  });

  it('never matches across tasks', () => {
    const rows = [
      row({ id: 'a', taskId: 'task-1', amount: 12 }),
      row({
        id: 'b',
        taskId: 'task-2',
        action: 'completion_undone',
        amount: -12,
        createdAt: new Date('2026-08-10T10:05:00'),
      }),
    ];
    expect(ids(visibleLedgerRows(rows))).toEqual(['a', 'b']);
  });

  it('leaves partial mismatches fully visible (never hides stars it cannot account for)', () => {
    const rows = [
      row({ id: 'a', amount: 12 }),
      row({
        id: 'b',
        action: 'completion_undone',
        amount: -2,
        createdAt: new Date('2026-08-10T10:05:00'),
      }),
    ];
    // -2 cannot exactly consume +12 — both stay.
    expect(ids(visibleLedgerRows(rows))).toEqual(['a', 'b']);
  });

  it('a negative never cancels a LATER award', () => {
    const rows = [
      row({
        id: 'u',
        action: 'completion_undone',
        amount: -12,
        createdAt: new Date('2026-08-10T09:00:00'),
      }),
      row({ id: 'a', amount: 12, createdAt: new Date('2026-08-10T10:00:00') }),
    ];
    expect(ids(visibleLedgerRows(rows))).toEqual(['a', 'u']);
  });

  it('passes non-family rows and null-taskId rows through untouched', () => {
    const rows = [
      row({ id: 's', action: 'subtask_completed', amount: 1 }),
      row({ id: 't', taskId: '', action: 'triage_confirmed', amount: 2 }),
      row({ id: 'r', action: 'archive_retraction', amount: -5 }),
      row({ id: 'n', taskId: null, amount: 12 }),
    ];
    expect(ids(visibleLedgerRows(rows))).toEqual(['n', 'r', 's', 't']);
  });

  it('one same-day undo can consume multiple awards when amounts add up exactly', () => {
    const rows = [
      row({ id: 'a1', amount: 5, createdAt: new Date('2026-08-10T09:00:00') }),
      row({ id: 'a2', amount: 7, createdAt: new Date('2026-08-10T10:00:00') }),
      row({
        id: 'u',
        action: 'completion_undone',
        amount: -12,
        createdAt: new Date('2026-08-10T11:00:00'),
      }),
    ];
    expect(visibleLedgerRows(rows)).toEqual([]);
  });

  it('preserves the caller row order for whatever stays visible', () => {
    const rows = [
      row({ id: 'z', amount: 3, createdAt: new Date('2026-08-09T10:00:00') }),
      row({ id: 'a', amount: 12, createdAt: new Date('2026-08-10T10:00:00') }),
      row({ id: 's', action: 'subtask_completed', amount: 1 }),
    ];
    expect(visibleLedgerRows(rows).map((entry) => entry.id)).toEqual(['z', 'a', 's']);
  });
});
