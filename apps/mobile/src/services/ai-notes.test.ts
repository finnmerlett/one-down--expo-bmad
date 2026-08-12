import { MAX_AI_GENERAL_NOTES_CHARS } from '@one-down/shared';

import { appendBullet, clampNotes } from './ai-notes';

describe('ai-notes pure helpers (9-5 item 4)', () => {
  it('appendBullet adds a dashed line, first line unprefixed by blank notes', () => {
    expect(appendBullet('', 'Likes tiny steps')).toBe('- Likes tiny steps');
    expect(appendBullet('- Existing fact', 'Likes tiny steps')).toBe(
      '- Existing fact\n- Likes tiny steps',
    );
  });

  it('appendBullet drops exact duplicates', () => {
    const notes = '- Likes tiny steps';
    expect(appendBullet(notes, 'Likes tiny steps')).toBe(notes);
  });

  it('clampNotes drops OLDEST lines first once past the cap', () => {
    const oldLine = `- old ${'x'.repeat(MAX_AI_GENERAL_NOTES_CHARS - 20)}`;
    const newLine = '- brand new learning';
    const clamped = clampNotes(`${oldLine}\n${newLine}\n${'- filler '.repeat(5)}`);
    expect(clamped.length).toBeLessThanOrEqual(MAX_AI_GENERAL_NOTES_CHARS);
    expect(clamped).toContain(newLine);
    expect(clamped).not.toContain('- old');
  });

  it('clampNotes hard-cuts a single oversized line', () => {
    const oversized = 'y'.repeat(MAX_AI_GENERAL_NOTES_CHARS + 50);
    expect(clampNotes(oversized).length).toBe(MAX_AI_GENERAL_NOTES_CHARS);
  });
});
