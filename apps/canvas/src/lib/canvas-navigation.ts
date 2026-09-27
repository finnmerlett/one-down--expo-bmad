import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';

/**
 * Canvas navigation maths: wheel scrolls pan, middle-button drags pan, and
 * middle-held (or Ctrl — a trackpad pinch arrives as ctrl+wheel) wheels zoom
 * around the cursor. Pure functions over the stage transform, so the rules
 * are testable without a DOM; `useCanvasNavigation` wires them to events.
 */
export interface StageTransform {
  positionX: number;
  positionY: number;
  scale: number;
}

export interface WheelInput {
  deltaX: number;
  deltaY: number;
  /** WheelEvent.deltaMode: 0 pixels, 1 lines, 2 pages. */
  deltaMode: number;
  ctrlKey: boolean;
}

const LINE_PX = 16;
/** Per-pixel zoom rate for mouse wheels (a ~100px notch ≈ 18%). */
const WHEEL_ZOOM_RATE = 0.002;
/** Pinch reports small deltas many times a second, so it gets a steeper rate. */
const PINCH_ZOOM_RATE = 0.01;

/** Wheel deltas in pixels whatever the device reported. */
export function wheelPixels(input: WheelInput, pageHeight: number): { dx: number; dy: number } {
  const unit = input.deltaMode === 1 ? LINE_PX : input.deltaMode === 2 ? pageHeight : 1;
  return { dx: input.deltaX * unit, dy: input.deltaY * unit };
}

export function panBy(stage: StageTransform, dx: number, dy: number): StageTransform {
  return { ...stage, positionX: stage.positionX + dx, positionY: stage.positionY + dy };
}

/**
 * Scale by `factor`, clamped, keeping the canvas point under `point` (stage
 * container coordinates) fixed on screen.
 */
export function zoomAt(
  stage: StageTransform,
  point: { x: number; y: number },
  factor: number,
  minScale: number,
  maxScale: number,
): StageTransform {
  const scale = Math.min(maxScale, Math.max(minScale, stage.scale * factor));
  const ratio = scale / stage.scale;
  return {
    scale,
    positionX: point.x - (point.x - stage.positionX) * ratio,
    positionY: point.y - (point.y - stage.positionY) * ratio,
  };
}

/** What a wheel does: zoom while the middle button is held or on pinch, otherwise pan. */
export function applyWheel(
  stage: StageTransform,
  input: WheelInput,
  point: { x: number; y: number },
  options: { middleHeld: boolean; pageHeight: number; minScale: number; maxScale: number },
): StageTransform {
  const { dx, dy } = wheelPixels(input, options.pageHeight);
  if (options.middleHeld || input.ctrlKey) {
    const rate = input.ctrlKey ? PINCH_ZOOM_RATE : WHEEL_ZOOM_RATE;
    return zoomAt(stage, point, Math.exp(-dy * rate), options.minScale, options.maxScale);
  }
  // Scrolling moves the view over the canvas, so the content moves the other way.
  return panBy(stage, -dx, -dy);
}

/** Wheels and middle presses here belong to the UI, not the stage. */
const IGNORE_WHEEL = '.wheelDisabled, [role="dialog"]';
/** …plus links, so a middle-click still opens a frame in a new tab. */
const IGNORE_MIDDLE = `${IGNORE_WHEEL}, a[href]`;

interface TransformHandle {
  state: StageTransform;
  setTransform: (x: number, y: number, scale: number, animationTime?: number) => void;
}

/**
 * Wires the rules above to the page. Returns the same handlers for input the
 * story frames forward (a live iframe swallows events over it): `wheel` takes
 * a point in page coordinates; the middle-drag handlers take SCREEN
 * coordinates, which stay stable while the stage — and the iframe under the
 * pointer with it — moves.
 */
export function useCanvasNavigation({
  transformRef,
  minScale,
  maxScale,
}: {
  transformRef: RefObject<TransformHandle | null>;
  minScale: number;
  maxScale: number;
}) {
  /** Last screen point of the middle-button drag in progress, if any. */
  const middleRef = useRef<{ x: number; y: number } | null>(null);

  const wheel = useCallback(
    (input: WheelInput, point: { x: number; y: number }, middleHeld = false) => {
      const handle = transformRef.current;
      if (!handle) return;
      const next = applyWheel(handle.state, input, point, {
        middleHeld: middleHeld || middleRef.current !== null,
        pageHeight: window.innerHeight,
        minScale,
        maxScale,
      });
      handle.setTransform(next.positionX, next.positionY, next.scale, 0);
    },
    [transformRef, minScale, maxScale],
  );

  const middleDown = useCallback((screenX: number, screenY: number) => {
    middleRef.current = { x: screenX, y: screenY };
  }, []);

  const middleMove = useCallback(
    (screenX: number, screenY: number) => {
      const last = middleRef.current;
      const handle = transformRef.current;
      if (!last || !handle) return;
      middleRef.current = { x: screenX, y: screenY };
      const next = panBy(handle.state, screenX - last.x, screenY - last.y);
      handle.setTransform(next.positionX, next.positionY, next.scale, 0);
    },
    [transformRef],
  );

  const middleUp = useCallback(() => {
    middleRef.current = null;
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.target instanceof Element && e.target.closest(IGNORE_WHEEL)) return;
      e.preventDefault();
      wheel(e, { x: e.clientX, y: e.clientY }, (e.buttons & 4) !== 0);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1 || (e.target instanceof Element && e.target.closest(IGNORE_MIDDLE)))
        return;
      e.preventDefault(); // no autoscroll cursor
      middleDown(e.screenX, e.screenY);
    };
    const onMouseMove = (e: MouseEvent) => middleMove(e.screenX, e.screenY);
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1) middleUp();
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', middleUp);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', middleUp);
    };
  }, [wheel, middleDown, middleMove, middleUp]);

  return useMemo(
    () => ({ wheel, middleDown, middleMove, middleUp }),
    [wheel, middleDown, middleMove, middleUp],
  );
}
