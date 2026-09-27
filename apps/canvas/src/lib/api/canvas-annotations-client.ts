import { validateAnnotations } from '@/lib/canvas-annotations-validate';
import {
  createEmptyAnnotations,
  type CanvasAnnotations,
  type CanvasImage,
} from '@/lib/types/canvas-annotations';

const BASE_URL = '/api/canvas-annotations';
const STATUS_HEADER = 'X-Canvas-Annotations-Status';

/**
 * Whether the document we loaded is the stored one ("ok"), not stored yet
 * ("missing", the first-run case), or unreadable on the server or here
 * ("invalid" — do not save over it).
 */
export type AnnotationsLoadStatus = 'ok' | 'missing' | 'invalid';

export interface FetchAnnotationsResult {
  /** Always a usable document; empty unless the status is "ok". */
  doc: CanvasAnnotations;
  status: AnnotationsLoadStatus;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    // ignore: body was not JSON
  }
  return fallback;
}

/**
 * An older or proxied response without the header is treated as a good load.
 * Any other non-empty value is unrecognised and treated as "invalid" so we
 * fail closed rather than silently trusting an unknown status.
 */
function readStatus(response: Response): AnnotationsLoadStatus {
  const raw = response.headers.get(STATUS_HEADER);
  if (!raw) return 'ok';
  return raw === 'ok' || raw === 'missing' || raw === 'invalid' ? raw : 'invalid';
}

/**
 * Load the document along with how the load went. A body we cannot validate is
 * reported as "invalid" rather than passed off as an empty but healthy document,
 * so callers know not to overwrite whatever is stored.
 */
export async function fetchAnnotations(): Promise<FetchAnnotationsResult> {
  const response = await fetch(BASE_URL, { cache: 'no-store' });
  if (!response.ok)
    throw new Error(await readErrorMessage(response, 'Could not load canvas annotations'));
  const status = readStatus(response);
  const result = validateAnnotations(await response.json());
  if (!result.ok) return { doc: createEmptyAnnotations(), status: 'invalid' };
  return { doc: result.value, status };
}

export async function saveAnnotations(doc: CanvasAnnotations): Promise<void> {
  const response = await fetch(BASE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!response.ok)
    throw new Error(await readErrorMessage(response, 'Could not save canvas annotations'));
}

export async function uploadImage(file: File): Promise<CanvasImage> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(BASE_URL, { method: 'POST', body: form });
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Upload failed'));
  return (await response.json()) as CanvasImage;
}

export async function deleteImageFile(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await readErrorMessage(response, 'Could not delete image'));
}
