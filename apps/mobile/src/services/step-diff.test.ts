import { appendDiff, diffSteps } from './step-diff';

describe('diffSteps (D4 report line)', () => {
  it('counts surplus steps as added and the rest of the fresh ones as changed', () => {
    const diff = diffSteps(
      ['Sort the pile', 'File the keepers'],
      ['Sort the pile', 'File the keepers by year', 'Shred the rest'],
    );
    expect(diff.added).toBe(1);
    expect(diff.changed).toBe(1);
    expect([...diff.newTitles].sort()).toEqual(['File the keepers by year', 'Shred the rest']);
  });

  it('same-count rewrite is all changed, nothing added', () => {
    const diff = diffSteps(['A', 'B'], ['A', 'C']);
    expect(diff.added).toBe(0);
    expect(diff.changed).toBe(1);
    expect(diff.newTitles.has('C')).toBe(true);
    expect(diff.newTitles.has('A')).toBe(false);
  });

  it('identical result reports nothing', () => {
    const diff = diffSteps(['A', 'B'], ['A', 'B']);
    expect(diff.added).toBe(0);
    expect(diff.changed).toBe(0);
    expect(diff.newTitles.size).toBe(0);
  });

  it('a shrinking rewrite never reports negative counts', () => {
    const diff = diffSteps(['A', 'B', 'C'], ['D']);
    expect(diff.added).toBe(0);
    expect(diff.changed).toBe(1);
  });

  it('appendDiff marks every appended step as added and NEW', () => {
    const diff = appendDiff(['X', 'Y', 'Z']);
    expect(diff.added).toBe(3);
    expect(diff.changed).toBe(0);
    expect(diff.newTitles.size).toBe(3);
  });
});
