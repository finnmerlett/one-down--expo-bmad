import { sanitizeEventProperties } from './sanitize';

describe('sanitizeEventProperties (NFR-S3)', () => {
  it('redacts denylisted keys at any nesting depth, case-insensitively', () => {
    const input = {
      source: 'quick_add',
      title: 'buy milk',
      Details: 'semi-skimmed from the corner shop',
      nested: { notes: 'private', count: 2, deeper: { DESCRIPTION: 'x' } },
      items: [{ task_title: 'secret' }, { safe: true }],
    };

    const result = sanitizeEventProperties(input);

    expect(result.source).toBe('quick_add');
    expect(result.title).toBe('[redacted:nfr-s3]');
    expect(result.Details).toBe('[redacted:nfr-s3]');
    expect(result.nested.notes).toBe('[redacted:nfr-s3]');
    expect(result.nested.count).toBe(2);
    expect(result.nested.deeper.DESCRIPTION).toBe('[redacted:nfr-s3]');
    expect(result.items[0]?.task_title).toBe('[redacted:nfr-s3]');
    expect(result.items[1]?.safe).toBe(true);
  });

  it('redacts autocapture element text and a11y labels ($autocapture payload shape)', () => {
    const event = {
      $event_type: 'touch',
      $elements: [
        { tag_name: 'Text', $el_text: 'Buy milk', attr__accessibilityLabel: 'Buy milk card' },
        { tag_name: 'View', attr__testID: 'task-card' },
      ],
    };

    const result = sanitizeEventProperties(event);

    expect(result.$elements[0]?.$el_text).toBe('[redacted:nfr-s3]');
    expect(result.$elements[0]?.attr__accessibilityLabel).toBe('[redacted:nfr-s3]');
    expect(result.$elements[0]?.tag_name).toBe('Text');
    expect(result.$elements[1]?.attr__testID).toBe('task-card');
  });

  it('passes through primitives and leaves non-denylisted structure intact', () => {
    expect(sanitizeEventProperties(null)).toBeNull();
    expect(sanitizeEventProperties(42)).toBe(42);
    expect(sanitizeEventProperties('plain')).toBe('plain');
    expect(sanitizeEventProperties({ has_details: true })).toEqual({ has_details: true });
  });
});
