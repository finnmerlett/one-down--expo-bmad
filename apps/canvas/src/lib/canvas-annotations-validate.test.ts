import { describe, expect, it } from 'vitest';
import { isValidImageId, validateAnnotations, validateUpload } from './canvas-annotations-validate';

const validImage = {
  id: 'img-abc123',
  kind: 'image',
  src: '/canvas-images/img-abc123.png',
  x: 10,
  y: 20,
  width: 300,
  height: 200,
  naturalWidth: 600,
  naturalHeight: 400,
};

const validSticky = {
  id: 'sn-abc123',
  kind: 'sticky',
  x: 0,
  y: 0,
  text: 'hello',
  color: 'yellow',
  size: 'md',
};

describe('validateAnnotations', () => {
  it('accepts a valid document and returns a normalised copy', () => {
    const result = validateAnnotations({
      version: 1,
      images: [validImage],
      stickies: [validSticky],
      extra: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ version: 1, images: [validImage], stickies: [validSticky] });
    }
  });

  it('rejects a wrong version', () => {
    const result = validateAnnotations({ version: 2, images: [], stickies: [] });
    expect(result).toEqual({ ok: false, error: expect.stringContaining('version') });
  });

  it('rejects a missing stickies array', () => {
    const result = validateAnnotations({ version: 1, images: [] });
    expect(result).toEqual({ ok: false, error: expect.stringContaining('stickies') });
  });

  it('rejects a sticky with non-string text', () => {
    const result = validateAnnotations({
      version: 1,
      images: [],
      stickies: [{ ...validSticky, text: 42 }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a sticky with an unknown colour', () => {
    const result = validateAnnotations({
      version: 1,
      images: [],
      stickies: [{ ...validSticky, color: 'teal' }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an image whose src is outside /canvas-images/', () => {
    const result = validateAnnotations({
      version: 1,
      images: [{ ...validImage, src: '/etc/passwd' }],
      stickies: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an image whose src contains a parent-directory segment', () => {
    const result = validateAnnotations({
      version: 1,
      images: [{ ...validImage, src: '/canvas-images/../../etc/passwd' }],
      stickies: [],
    });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('src must not contain ".."'),
    });
  });

  it('rejects an image whose id is not of the form img-<alphanumeric>', () => {
    const result = validateAnnotations({
      version: 1,
      images: [{ ...validImage, id: '../x' }],
      stickies: [],
    });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('id must match img-<alphanumeric>'),
    });
  });

  it('rejects non-object input', () => {
    expect(validateAnnotations(null).ok).toBe(false);
    expect(validateAnnotations('nope').ok).toBe(false);
  });
});

describe('isValidImageId', () => {
  it('accepts ids of the form img-<alphanumeric>', () => {
    expect(isValidImageId('img-abc123')).toBe(true);
  });

  it('rejects path traversal and other prefixes', () => {
    expect(isValidImageId('../x')).toBe(false);
    expect(isValidImageId('img-../x')).toBe(false);
    expect(isValidImageId('sn-abc123')).toBe(false);
    expect(isValidImageId(undefined)).toBe(false);
  });
});

describe('validateUpload', () => {
  it('maps png and jpeg to file extensions', () => {
    expect(validateUpload('image/png', 1000)).toEqual({ ok: true, value: 'png' });
    expect(validateUpload('image/jpeg', 1000)).toEqual({ ok: true, value: 'jpg' });
  });

  it('rejects other types', () => {
    expect(validateUpload('image/gif', 1000)).toEqual({
      ok: false,
      error: expect.stringContaining('PNG'),
    });
  });

  it('rejects files over 10 MB', () => {
    expect(validateUpload('image/png', 10 * 1024 * 1024 + 1)).toEqual({
      ok: false,
      error: expect.stringContaining('10 MB'),
    });
  });
});
