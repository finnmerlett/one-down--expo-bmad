/**
 * Canvas annotations: images and sticky notes the user places on /canvas.
 * Coordinates are canvas pixels at scale 1, measured from the
 * TransformComponent content origin. Shared by client and server.
 */

export type StickyColor = 'yellow' | 'pink' | 'green' | 'blue' | 'orange' | 'purple';
export type StickySize = 'sm' | 'md' | 'lg';

export interface CanvasImage {
  id: string;
  kind: 'image';
  /** Public URL, e.g. "/canvas-images/img-abc123.png" */
  src: string;
  x: number;
  y: number;
  /** Displayed size in canvas px */
  width: number;
  height: number;
  /** Pixel size of the file, used to lock aspect ratio */
  naturalWidth: number;
  naturalHeight: number;
}

export interface StickyNote {
  id: string;
  kind: 'sticky';
  x: number;
  y: number;
  text: string;
  color: StickyColor;
  size: StickySize;
}

export type CanvasAnnotation = CanvasImage | StickyNote;

export interface CanvasAnnotations {
  version: 1;
  images: CanvasImage[];
  stickies: StickyNote[];
}

/** A fresh empty document. Use this anywhere the result may later be mutated. */
export function createEmptyAnnotations(): CanvasAnnotations {
  return { version: 1, images: [], stickies: [] };
}

const emptyAnnotations = createEmptyAnnotations();
Object.freeze(emptyAnnotations.images);
Object.freeze(emptyAnnotations.stickies);

/**
 * A shared empty document, deeply frozen so accidental mutation throws in strict
 * mode. Safe to compare against; call createEmptyAnnotations() when you need one
 * you can change.
 */
export const EMPTY_ANNOTATIONS: CanvasAnnotations = Object.freeze(emptyAnnotations);

export const STICKY_STYLES: Record<StickyColor, string> = {
  yellow: 'bg-yellow-200',
  pink: 'bg-pink-200',
  green: 'bg-green-200',
  blue: 'bg-blue-200',
  orange: 'bg-orange-200',
  purple: 'bg-purple-200',
};

export const STICKY_COLORS = Object.keys(STICKY_STYLES) as StickyColor[];
export const STICKY_SIZES: StickySize[] = ['sm', 'md', 'lg'];

/** Tailwind width class per size */
export const STICKY_WIDTHS: Record<StickySize, string> = {
  sm: 'w-32',
  md: 'w-44',
  lg: 'w-60',
};

/** Pixel width per size, matching STICKY_WIDTHS, used to centre a new note on the cursor */
export const STICKY_WIDTH_PX: Record<StickySize, number> = {
  sm: 128,
  md: 176,
  lg: 240,
};

/** Half of the sticky's min-height (7rem = 112px), used to centre a new note on the cursor */
export const STICKY_HALF_HEIGHT_PX = 56;

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg'] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_INITIAL_IMAGE_WIDTH = 600;
export const MIN_IMAGE_WIDTH = 40;

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
