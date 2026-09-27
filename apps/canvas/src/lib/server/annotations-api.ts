import { validateAnnotations } from '../canvas-annotations-validate';
import {
  StoreError,
  deleteImageFile,
  readAnnotations,
  saveImageFile,
  writeAnnotations,
  type AnnotationPaths,
} from './canvas-annotations-store';

/**
 * The canvas-annotations endpoint (ported from ignite's Next route handler)
 * as a plain Request → Response function; vite.config.ts mounts it on the
 * dev server, which is the only place the canvas runs (its frames need the
 * Metro story renderer anyway), so there is no read-only production branch.
 *
 * GET  → the document, plus a status header telling the client whether it is
 *        the stored one ("ok"), not stored yet ("missing") or unreadable
 *        ("invalid", in which case the client must not autosave over it).
 * PUT  → replace the document. POST (multipart `file`) → store an image.
 * DELETE ?id= → remove an image's file.
 */
export const STATUS_HEADER = 'X-Canvas-Annotations-Status';

function json(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init);
}

function errorResponse(error: unknown): Response {
  if (error instanceof StoreError) return json({ error: error.message }, { status: error.status });
  // oxlint-disable-next-line no-console
  console.error('[canvas-annotations]', error);
  return json({ error: 'Unexpected server error' }, { status: 500 });
}

export async function handleAnnotationsRequest(
  request: Request,
  paths: AnnotationPaths,
): Promise<Response> {
  switch (request.method) {
    case 'GET': {
      const { doc, status } = await readAnnotations(paths);
      return json(doc, { headers: { [STATUS_HEADER]: status } });
    }
    case 'PUT': {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Body must be JSON' }, { status: 400 });
      }
      const result = validateAnnotations(body);
      if (!result.ok) return json({ error: result.error }, { status: 400 });
      try {
        await writeAnnotations(result.value, paths);
        return json(result.value);
      } catch (error) {
        return errorResponse(error);
      }
    }
    case 'POST': {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return json({ error: 'Expected multipart form data' }, { status: 400 });
      }
      const file = form.get('file');
      if (!(file instanceof File)) return json({ error: 'Missing file field' }, { status: 400 });
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return json(await saveImageFile(bytes, file.type, paths), { status: 201 });
      } catch (error) {
        return errorResponse(error);
      }
    }
    case 'DELETE': {
      const id = new URL(request.url).searchParams.get('id') ?? '';
      try {
        await deleteImageFile(id, paths);
        return new Response(null, { status: 204 });
      } catch (error) {
        return errorResponse(error);
      }
    }
    default:
      return json({ error: 'Method not allowed' }, { status: 405 });
  }
}
