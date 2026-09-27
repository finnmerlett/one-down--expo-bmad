import { useRef, useState } from 'react';

/** Screen-pixel movement below which a pointer down/up counts as a click. */
const CLICK_THRESHOLD_PX = 3;

export interface UseDragOptions {
  /** Current canvas zoom; deltas are divided by it so elements track the cursor at any zoom. */
  getScale: () => number;
  onStart?: () => void;
  /** Total delta since pointer down, in canvas units. */
  onMove: (dx: number, dy: number) => void;
  /** `didDrag` is false for a clean click. */
  onEnd?: (didDrag: boolean) => void;
}

export interface DragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (e: React.PointerEvent<HTMLElement>) => void;
}

export function useDrag({ getScale, onStart, onMove, onEnd }: UseDragOptions): {
  dragging: boolean;
  handlers: DragHandlers;
} {
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const didDragRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    // Ignore additional pointers while one is already dragging: a second pointer
    // down would overwrite the start slot, re-fire `onStart`, and leave the first
    // pointer's `pointerup` unmatched — sticking `dragging` on forever.
    if (startRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    didDragRef.current = false;
    onStart?.();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const start = startRef.current;
    if (!start || e.pointerId !== start.pointerId) return;
    const screenDx = e.clientX - start.x;
    const screenDy = e.clientY - start.y;
    if (!didDragRef.current && Math.hypot(screenDx, screenDy) > CLICK_THRESHOLD_PX) {
      didDragRef.current = true;
      setDragging(true);
    }
    if (!didDragRef.current) return;
    const scale = getScale() || 1;
    onMove(screenDx / scale, screenDy / scale);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const start = startRef.current;
    if (!start || e.pointerId !== start.pointerId) return;
    startRef.current = null;
    setDragging(false);
    onEnd?.(didDragRef.current);
  };

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      // A lost capture (element unmounted mid-drag, browser-initiated cancel)
      // must clear state too, otherwise the start slot stays occupied.
      onLostPointerCapture: onPointerUp,
    },
  };
}
