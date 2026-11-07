import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  STICKY_COLORS,
  STICKY_SIZES,
  type CanvasAnnotations,
  type CanvasImage,
  type StickyColor,
  type StickyNote,
  type StickySize,
} from './types/canvas-annotations';

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const IMAGE_ID_PATTERN = /^img-[a-z0-9]+$/;
const IMAGE_SRC_PREFIX = '/canvas-images/';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function validateImage(input: unknown, index: number): ValidationResult<CanvasImage> {
  const where = `images[${index}]`;
  if (!isRecord(input)) return fail(`${where} must be an object`);
  if (typeof input.id !== 'string' || !input.id) return fail(`${where}.id must be a string`);
  if (!isValidImageId(input.id)) return fail(`${where}.id must match img-<alphanumeric>`);
  if (input.kind !== 'image') return fail(`${where}.kind must be "image"`);
  if (typeof input.src !== 'string' || !input.src.startsWith(IMAGE_SRC_PREFIX)) {
    return fail(`${where}.src must start with ${IMAGE_SRC_PREFIX}`);
  }
  if (input.src.includes('..')) return fail(`${where}.src must not contain ".."`);
  for (const key of ['x', 'y', 'width', 'height', 'naturalWidth', 'naturalHeight'] as const) {
    if (!isFiniteNumber(input[key])) return fail(`${where}.${key} must be a number`);
  }
  return {
    ok: true,
    value: {
      id: input.id,
      kind: 'image',
      src: input.src,
      x: input.x as number,
      y: input.y as number,
      width: input.width as number,
      height: input.height as number,
      naturalWidth: input.naturalWidth as number,
      naturalHeight: input.naturalHeight as number,
    },
  };
}

function validateSticky(input: unknown, index: number): ValidationResult<StickyNote> {
  const where = `stickies[${index}]`;
  if (!isRecord(input)) return fail(`${where} must be an object`);
  if (typeof input.id !== 'string' || !input.id) return fail(`${where}.id must be a string`);
  if (input.kind !== 'sticky') return fail(`${where}.kind must be "sticky"`);
  if (!isFiniteNumber(input.x) || !isFiniteNumber(input.y))
    return fail(`${where}.x and .y must be numbers`);
  if (typeof input.text !== 'string') return fail(`${where}.text must be a string`);
  if (!STICKY_COLORS.includes(input.color as StickyColor))
    return fail(`${where}.color is not a known colour`);
  if (!STICKY_SIZES.includes(input.size as StickySize))
    return fail(`${where}.size is not a known size`);
  return {
    ok: true,
    value: {
      id: input.id,
      kind: 'sticky',
      x: input.x,
      y: input.y,
      text: input.text,
      color: input.color as StickyColor,
      size: input.size as StickySize,
    },
  };
}

/** Validate an untrusted document and return a copy containing only known fields. */
export function validateAnnotations(input: unknown): ValidationResult<CanvasAnnotations> {
  if (!isRecord(input)) return fail('Document must be an object');
  if (input.version !== 1) return fail('Unsupported document version');
  if (!Array.isArray(input.images)) return fail('images must be an array');
  if (!Array.isArray(input.stickies)) return fail('stickies must be an array');

  const images: CanvasImage[] = [];
  for (let i = 0; i < input.images.length; i++) {
    const result = validateImage(input.images[i], i);
    if (!result.ok) return result;
    images.push(result.value);
  }

  const stickies: StickyNote[] = [];
  for (let i = 0; i < input.stickies.length; i++) {
    const result = validateSticky(input.stickies[i], i);
    if (!result.ok) return result;
    stickies.push(result.value);
  }

  return { ok: true, value: { version: 1, images, stickies } };
}

export function isValidImageId(id: unknown): id is string {
  return typeof id === 'string' && IMAGE_ID_PATTERN.test(id);
}

/** Check MIME type and size; on success return the file extension to store. */
export function validateUpload(
  mimeType: string,
  sizeBytes: number,
): ValidationResult<'png' | 'jpg'> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return fail('Only PNG and JPEG images are supported');
  }
  if (sizeBytes > MAX_IMAGE_BYTES) {
    return fail('Images must be under 10 MB');
  }
  return { ok: true, value: mimeType === 'image/png' ? 'png' : 'jpg' };
}
