import {
  hasReviewItems,
  parseReviewFlags,
  removeReviewFlag,
  type TaskReviewFlags,
} from '@one-down/shared';

// Pure shared helpers behind Story 6.1/6.2 review flags — tested here (the
// shared package has no test runner; mobile is their primary consumer).
describe('parseReviewFlags', () => {
  it('decodes a full flag set', () => {
    expect(parseReviewFlags('{"inferred":["size","deadline"],"missingDeadline":true}')).toEqual({
      inferred: ['size', 'deadline'],
      missingDeadline: true,
    });
  });

  it('normalizes null/malformed/empty values to null', () => {
    expect(parseReviewFlags(null)).toBeNull();
    expect(parseReviewFlags('')).toBeNull();
    expect(parseReviewFlags('not json')).toBeNull();
    expect(parseReviewFlags('[]')).toBeNull();
    expect(parseReviewFlags('{}')).toBeNull();
    expect(parseReviewFlags('{"inferred":[]}')).toBeNull();
    expect(parseReviewFlags('{"missingDeadline":false}')).toBeNull();
  });

  it('drops unknown fields and keys but keeps the valid remainder', () => {
    expect(parseReviewFlags('{"inferred":["size","title",42],"other":true}')).toEqual({
      inferred: ['size'],
    });
    // Only unknown items left → nothing to review.
    expect(parseReviewFlags('{"inferred":["title"]}')).toBeNull();
  });
});

describe('removeReviewFlag / hasReviewItems', () => {
  it('removes one inferred field, keeping the rest', () => {
    const flags: TaskReviewFlags = { inferred: ['size', 'contexts'], missingDeadline: true };
    expect(removeReviewFlag(flags, 'size')).toEqual({
      inferred: ['contexts'],
      missingDeadline: true,
    });
  });

  it('removes missingDeadline independently of inferred fields', () => {
    const flags: TaskReviewFlags = { inferred: ['deadline'], missingDeadline: true };
    expect(removeReviewFlag(flags, 'missingDeadline')).toEqual({ inferred: ['deadline'] });
  });

  it('returns null when the last item clears (and null stays null)', () => {
    expect(removeReviewFlag({ inferred: ['size'] }, 'size')).toBeNull();
    expect(removeReviewFlag({ missingDeadline: true }, 'missingDeadline')).toBeNull();
    expect(removeReviewFlag(null, 'size')).toBeNull();
  });

  it('removing an absent item is a harmless no-op shape-wise', () => {
    expect(removeReviewFlag({ inferred: ['contexts'] }, 'size')).toEqual({
      inferred: ['contexts'],
    });
  });

  it('hasReviewItems matches the emptiness rules', () => {
    expect(hasReviewItems(null)).toBe(false);
    expect(hasReviewItems({})).toBe(false);
    expect(hasReviewItems({ inferred: [] })).toBe(false);
    expect(hasReviewItems({ inferred: ['size'] })).toBe(true);
    expect(hasReviewItems({ missingDeadline: true })).toBe(true);
  });
});
