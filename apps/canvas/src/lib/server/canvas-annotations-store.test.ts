import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_ANNOTATIONS,
  createEmptyAnnotations,
  type CanvasAnnotations,
} from '@/lib/types/canvas-annotations';
import {
  StoreError,
  deleteImageFile,
  readAnnotations,
  saveImageFile,
  writeAnnotations,
  type AnnotationPaths,
} from './canvas-annotations-store';

function pngBytes(width: number, height: number): Uint8Array {
  const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...u32(13),
    0x49,
    0x48,
    0x44,
    0x52,
    ...u32(width),
    ...u32(height),
    0x08,
    0x06,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
  ]);
}

describe('canvas annotations store', () => {
  let root: string;
  let paths: AnnotationPaths;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'canvas-store-'));
    paths = {
      jsonPath: path.join(root, 'data', 'canvas-annotations.json'),
      imagesDir: path.join(root, 'public', 'canvas-images'),
      publicPrefix: '/canvas-images',
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  it('reports a missing file as "missing", without warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await readAnnotations(paths);
    expect(result.status).toBe('missing');
    expect(result.error).toBeUndefined();
    expect(result.doc).toEqual(EMPTY_ANNOTATIONS);
    expect(warn).not.toHaveBeenCalled();
  });

  it('returns a mutable document, not the shared frozen constant', async () => {
    const { doc } = await readAnnotations(paths);
    expect(Object.isFrozen(doc)).toBe(false);
    doc.stickies.push({
      id: 'sn-1',
      kind: 'sticky',
      x: 0,
      y: 0,
      text: 'hi',
      color: 'pink',
      size: 'sm',
    });
    expect(EMPTY_ANNOTATIONS.stickies).toHaveLength(0);
  });

  it('reports a non-ENOENT read failure as "invalid" and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.mkdir(paths.jsonPath, { recursive: true });
    const result = await readAnnotations(paths);
    expect(result.status).toBe('invalid');
    expect(result.doc).toEqual(EMPTY_ANNOTATIONS);
    expect(result.error).toBeTruthy();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('reports a malformed file as "invalid" and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.mkdir(path.dirname(paths.jsonPath), { recursive: true });
    await fs.writeFile(paths.jsonPath, '{ not json');
    const result = await readAnnotations(paths);
    expect(result.status).toBe('invalid');
    expect(result.error).toBeTruthy();
    expect(result.doc).toEqual(EMPTY_ANNOTATIONS);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[canvas-annotations]'),
      expect.objectContaining({ path: paths.jsonPath }),
    );
  });

  it('reports a file that fails validation as "invalid" and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.mkdir(path.dirname(paths.jsonPath), { recursive: true });
    await fs.writeFile(paths.jsonPath, JSON.stringify({ version: 2, images: [], stickies: [] }));
    const result = await readAnnotations(paths);
    expect(result.status).toBe('invalid');
    expect(result.error).toContain('version');
    expect(result.doc).toEqual(EMPTY_ANNOTATIONS);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[canvas-annotations]'),
      expect.objectContaining({ path: paths.jsonPath, cause: expect.stringContaining('version') }),
    );
  });

  it('leaves no temporary file behind after a successful write', async () => {
    await writeAnnotations(createEmptyAnnotations(), paths);
    const entries = await fs.readdir(path.dirname(paths.jsonPath));
    expect(entries).toContain('canvas-annotations.json');
    // The temp name carries a pid and a random suffix, so match the shape rather than a fixed name.
    expect(entries.filter((name) => /^canvas-annotations\.json\..*\.tmp$/.test(name))).toEqual([]);
  });

  it('round-trips a document through write and read', async () => {
    const doc: CanvasAnnotations = {
      version: 1,
      images: [],
      stickies: [{ id: 'sn-1', kind: 'sticky', x: 1, y: 2, text: 'hi', color: 'pink', size: 'sm' }],
    };
    await writeAnnotations(doc, paths);
    expect(await readAnnotations(paths)).toEqual({ doc, status: 'ok' });
    const raw = await fs.readFile(paths.jsonPath, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
  });

  it('saves a PNG and returns an entry with natural dimensions', async () => {
    const image = await saveImageFile(pngBytes(640, 480), 'image/png', paths);
    expect(image.kind).toBe('image');
    expect(image.id).toMatch(/^img-[a-z0-9]+$/);
    expect(image.src).toBe(`/canvas-images/${image.id}.png`);
    expect(image.naturalWidth).toBe(640);
    expect(image.naturalHeight).toBe(480);
    expect(image).toMatchObject({ x: 0, y: 0, width: 0, height: 0 });
    const stored = await fs.readFile(path.join(paths.imagesDir, `${image.id}.png`));
    expect(stored.byteLength).toBe(pngBytes(640, 480).byteLength);
  });

  it('rejects an unsupported type with a 400 StoreError', async () => {
    await expect(saveImageFile(pngBytes(1, 1), 'image/gif', paths)).rejects.toMatchObject({
      status: 400,
    });
    await expect(saveImageFile(pngBytes(1, 1), 'image/gif', paths)).rejects.toBeInstanceOf(
      StoreError,
    );
  });

  it('rejects bytes that cannot be parsed with a 400 StoreError', async () => {
    await expect(
      saveImageFile(new Uint8Array([1, 2, 3]), 'image/png', paths),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('deletes the image file by id', async () => {
    const image = await saveImageFile(pngBytes(1, 1), 'image/png', paths);
    await deleteImageFile(image.id, paths);
    await expect(fs.stat(path.join(paths.imagesDir, `${image.id}.png`))).rejects.toThrow();
  });

  it('is a no-op when deleting a file that is already gone', async () => {
    await expect(deleteImageFile('img-missing', paths)).resolves.toBeUndefined();
  });

  it('rejects an invalid id on delete with a 400 StoreError', async () => {
    await expect(deleteImageFile('../x', paths)).rejects.toMatchObject({ status: 400 });
  });
});
