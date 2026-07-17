import { computeStarTotals, startOfLocalDay } from './star-totals';

// Local-time constructors throughout — the boundary is DEVICE-local midnight,
// so the assertions must not depend on the test runner's timezone.
const NOW = new Date(2026, 5, 10, 12, 0); // 10 Jun 2026, noon local

function row(amount: number, createdAt: Date) {
  return { amount, createdAt };
}

describe('startOfLocalDay', () => {
  it('returns local midnight of the same day', () => {
    expect(startOfLocalDay(NOW)).toEqual(new Date(2026, 5, 10, 0, 0, 0, 0));
  });
});

describe('computeStarTotals', () => {
  it('returns zeros for an empty ledger (AC4)', () => {
    expect(computeStarTotals([], NOW)).toEqual({ total: 0, today: 0 });
  });

  it('splits mixed-day rows around local midnight', () => {
    const rows = [
      row(10, new Date(2026, 5, 8, 9, 0)), // two days ago
      row(3, new Date(2026, 5, 9, 23, 59)), // yesterday 23:59 — NOT today
      row(10, new Date(2026, 5, 10, 0, 0)), // exactly local midnight — today
      row(5, new Date(2026, 5, 10, 11, 30)), // this morning — today
    ];

    expect(computeStarTotals(rows, NOW)).toEqual({ total: 28, today: 15 });
  });

  it('negative amounts subtract from both sums (signed ledger)', () => {
    const rows = [
      row(10, new Date(2026, 5, 9, 10, 0)),
      row(-2, new Date(2026, 5, 10, 8, 0)),
      row(5, new Date(2026, 5, 10, 9, 0)),
    ];

    expect(computeStarTotals(rows, NOW)).toEqual({ total: 13, today: 3 });
  });
});
