import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readImageDimensions } from '../image-dimensions';
import {
  isValidImageId,
  validateAnnotations,
  validateUpload,
} from '../canvas-annotations-validate';
import {
  createEmptyAnnotations,
  newId,
  type CanvasAnnotations,
  type CanvasImage,
} from '../types/canvas-annotations';

export interface AnnotationPaths {
  /** Absolute path of the JSON document */
  jsonPath: string;
  /** Absolute path of the directory holding image files */
  imagesDir: string;
  /** URL prefix under which imagesDir is served, no trailing slash */
  publicPrefix: string;
}

/** Layout under an app root: the JSON is committed data, images are served from Vite's publicDir. */
export function annotationPathsFor(root: string): AnnotationPaths {
  return {
    jsonPath: path.join(root, 'canvas-data', 'annotations.json'),
    imagesDir: path.join(root, 'public', 'canvas-images'),
    publicPrefix: '/canvas-images',
  };
}

export const DEFAULT_PATHS: AnnotationPaths = annotationPathsFor(process.cwd());

/** An error that maps directly to an HTTP status. */
export class StoreError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

/** A missing file is the normal first-run case, so it is not worth warning about. */
function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'ENOENT'
  );
}

/**
 * How the read went:
 * - "ok": the file was there and validated.
 * - "missing": no file yet, the normal first-run case. Editing stays enabled.
 * - "invalid": the file exists but could not be understood, so the document we
 *   return is not the committed one and callers must not overwrite it.
 */
export type AnnotationsReadStatus = 'ok' | 'missing' | 'invalid';

export interface ReadAnnotationsResult {
  /** Always a usable document; empty unless the status is "ok". */
  doc: CanvasAnnotations;
  status: AnnotationsReadStatus;
  /** Why the read was "invalid"; absent otherwise. */
  error?: string;
}

function describe(cause: unknown): string {
  if (cause instanceof Error && cause.message) return cause.message;
  const text = String(cause);
  return text || 'Unknown error';
}

/**
 * Read the document. On any problem the returned `doc` is a fresh empty one and
 * `status` says why, so callers can tell a first run ("missing", safe to edit)
 * from a file they must not clobber ("invalid"). Problems are also logged.
 */
export async function readAnnotations(
  paths: AnnotationPaths = DEFAULT_PATHS,
): Promise<ReadAnnotationsResult> {
  let raw: string;
  try {
    raw = await fs.readFile(paths.jsonPath, 'utf8');
  } catch (cause) {
    if (isFileNotFound(cause)) {
      return { doc: createEmptyAnnotations(), status: 'missing' };
    }
    // oxlint-disable-next-line no-console
    console.warn('[canvas-annotations] could not read the annotations file', {
      path: paths.jsonPath,
      cause,
    });
    return { doc: createEmptyAnnotations(), status: 'invalid', error: describe(cause) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    // oxlint-disable-next-line no-console
    console.warn('[canvas-annotations] annotations file is not valid JSON', {
      path: paths.jsonPath,
      cause,
    });
    return { doc: createEmptyAnnotations(), status: 'invalid', error: describe(cause) };
  }

  const result = validateAnnotations(parsed);
  if (!result.ok) {
    // oxlint-disable-next-line no-console
    console.warn('[canvas-annotations] annotations file failed validation', {
      path: paths.jsonPath,
      cause: result.error,
    });
    return { doc: createEmptyAnnotations(), status: 'invalid', error: result.error };
  }
  return { doc: result.value, status: 'ok' };
}

/** Write the document atomically: a temp file next to the target, then a rename over it. */
export async function writeAnnotations(
  doc: CanvasAnnotations,
  paths: AnnotationPaths = DEFAULT_PATHS,
): Promise<void> {
  await fs.mkdir(path.dirname(paths.jsonPath), { recursive: true });
  // Unique per writer so two concurrent writes never share (and clobber) the same temp file.
  const tempPath = `${paths.jsonPath}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    await fs.writeFile(tempPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    await fs.rename(tempPath, paths.jsonPath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

/** Validate, read dimensions, write the file. Returns an entry with zero position and size; the client fills those in. */
export async function saveImageFile(
  bytes: Uint8Array,
  mimeType: string,
  paths: AnnotationPaths = DEFAULT_PATHS,
): Promise<CanvasImage> {
  const upload = validateUpload(mimeType, bytes.byteLength);
  if (!upload.ok) throw new StoreError(400, upload.error);

  let dimensions: { width: number; height: number };
  try {
    dimensions = readImageDimensions(bytes, mimeType);
  } catch {
    throw new StoreError(400, 'Could not read image dimensions. Is the file a valid PNG or JPEG?');
  }

  const id = newId('img');
  const fileName = `${id}.${upload.value}`;
  await fs.mkdir(paths.imagesDir, { recursive: true });
  await fs.writeFile(path.join(paths.imagesDir, fileName), bytes);

  return {
    id,
    kind: 'image',
    src: `${paths.publicPrefix}/${fileName}`,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    naturalWidth: dimensions.width,
    naturalHeight: dimensions.height,
  };
}

/** Remove every file named `<id>.*` in the images directory. Missing files are not an error. */
export async function deleteImageFile(
  id: string,
  paths: AnnotationPaths = DEFAULT_PATHS,
): Promise<void> {
  if (!isValidImageId(id)) throw new StoreError(400, 'Invalid image id');
  let entries: string[];
  try {
    entries = await fs.readdir(paths.imagesDir);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((name) => name.startsWith(`${id}.`))
      .map((name) => fs.unlink(path.join(paths.imagesDir, name)).catch(() => undefined)),
  );
}
