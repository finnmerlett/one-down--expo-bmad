import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ANNOTATIONS, type CanvasAnnotations } from '@/lib/types/canvas-annotations';
import { fetchAnnotations } from './canvas-annotations-client';

const STATUS_HEADER = 'X-Canvas-Annotations-Status';

const VALID_DOC: CanvasAnnotations = {
  version: 1,
  images: [],
  stickies: [{ id: 'sn-1', kind: 'sticky', x: 1, y: 2, text: 'hi', color: 'pink', size: 'sm' }],
};

/** Stub global fetch with a single JSON response. */
function stubFetch(body: unknown, init?: ResponseInit): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
          ...init,
        }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAnnotations', () => {
  it('returns the document as ok when the header says ok', async () => {
    stubFetch(VALID_DOC, { headers: { [STATUS_HEADER]: 'ok' } });
    expect(await fetchAnnotations()).toEqual({ doc: VALID_DOC, status: 'ok' });
  });

  it('treats a response with no status header as ok', async () => {
    stubFetch(VALID_DOC);
    expect(await fetchAnnotations()).toEqual({ doc: VALID_DOC, status: 'ok' });
  });

  it('passes through a missing status so a first run stays editable', async () => {
    stubFetch(EMPTY_ANNOTATIONS, { headers: { [STATUS_HEADER]: 'missing' } });
    expect(await fetchAnnotations()).toEqual({ doc: EMPTY_ANNOTATIONS, status: 'missing' });
  });

  it('reports an invalid header as invalid with an empty document', async () => {
    stubFetch(EMPTY_ANNOTATIONS, { headers: { [STATUS_HEADER]: 'invalid' } });
    const result = await fetchAnnotations();
    expect(result.status).toBe('invalid');
    expect(result.doc).toEqual(EMPTY_ANNOTATIONS);
  });

  it('treats an unrecognised header value as invalid with an empty document', async () => {
    stubFetch(EMPTY_ANNOTATIONS, { headers: { [STATUS_HEADER]: 'weird' } });
    const result = await fetchAnnotations();
    expect(result.status).toBe('invalid');
    expect(result.doc).toEqual(EMPTY_ANNOTATIONS);
  });

  it('reports a body that fails validation as invalid, even when the header says ok', async () => {
    stubFetch({ version: 2, images: [], stickies: [] }, { headers: { [STATUS_HEADER]: 'ok' } });
    const result = await fetchAnnotations();
    expect(result.status).toBe('invalid');
    expect(result.doc).toEqual(EMPTY_ANNOTATIONS);
  });

  it("throws the server's message on a non-2xx response", async () => {
    stubFetch({ error: 'Nope, could not read it' }, { status: 500 });
    await expect(fetchAnnotations()).rejects.toThrow('Nope, could not read it');
  });
});
