import { MAX_INITIAL_IMAGE_WIDTH } from '@/lib/types/canvas-annotations';

export interface ContentRect {
  left: number;
  top: number;
}

/** Convert a viewport point to canvas coordinates given the content origin and zoom scale. */
export function screenToCanvas(
  clientX: number,
  clientY: number,
  rect: ContentRect,
  scale: number,
): { x: number; y: number } {
  const safeScale = scale > 0 ? scale : 1;
  return {
    x: (clientX - rect.left) / safeScale,
    y: (clientY - rect.top) / safeScale,
  };
}

/** Initial displayed size: natural width capped at maxWidth, aspect ratio preserved. */
export function initialImageSize(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number = MAX_INITIAL_IMAGE_WIDTH,
): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxWidth, height: maxWidth };
  }
  const width = Math.min(naturalWidth, maxWidth);
  const height = Math.round((width * naturalHeight) / naturalWidth);
  return { width, height };
}

/** Offset applied to the n-th item placed in one batch so they fan out. */
export function fanOffset(index: number): number {
  return index * 24;
}
