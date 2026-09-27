import { describe, expect, it } from 'vitest';

import { applyWheel, wheelPixels, zoomAt, type StageTransform } from './canvas-navigation';

const stage: StageTransform = { positionX: 100, positionY: 50, scale: 0.5 };
const limits = { minScale: 0.1, maxScale: 2 };
const wheel = { deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false };

/** Canvas coordinate currently drawn at a container point. */
const canvasPointAt = (s: StageTransform, p: { x: number; y: number }) => ({
  x: (p.x - s.positionX) / s.scale,
  y: (p.y - s.positionY) / s.scale,
});

describe('zoomAt', () => {
  it('keeps the canvas point under the cursor fixed', () => {
    const cursor = { x: 640, y: 360 };
    const zoomed = zoomAt(stage, cursor, 1.5, limits.minScale, limits.maxScale);
    expect(zoomed.scale).toBeCloseTo(0.75);
    expect(canvasPointAt(zoomed, cursor).x).toBeCloseTo(canvasPointAt(stage, cursor).x);
    expect(canvasPointAt(zoomed, cursor).y).toBeCloseTo(canvasPointAt(stage, cursor).y);
  });

  it('clamps to the scale limits without drifting the view', () => {
    const cursor = { x: 300, y: 200 };
    const zoomed = zoomAt(stage, cursor, 100, limits.minScale, limits.maxScale);
    expect(zoomed.scale).toBe(2);
    expect(canvasPointAt(zoomed, cursor).x).toBeCloseTo(canvasPointAt(stage, cursor).x);
  });
});

describe('applyWheel', () => {
  const options = { middleHeld: false, pageHeight: 800, ...limits };
  const cursor = { x: 400, y: 300 };

  it('pans on a plain wheel, x and y independently, opposite to the scroll', () => {
    const next = applyWheel(stage, { ...wheel, deltaX: 30, deltaY: -40 }, cursor, options);
    expect(next).toEqual({ positionX: 70, positionY: 90, scale: 0.5 });
  });

  it('zooms instead while the middle button is held — scroll up zooms in', () => {
    const next = applyWheel(stage, { ...wheel, deltaY: -100 }, cursor, {
      ...options,
      middleHeld: true,
    });
    expect(next.scale).toBeGreaterThan(stage.scale);
    expect(canvasPointAt(next, cursor).x).toBeCloseTo(canvasPointAt(stage, cursor).x);
  });

  it('zooms on ctrl+wheel (trackpad pinch) even without the middle button', () => {
    const next = applyWheel(stage, { ...wheel, deltaY: 10, ctrlKey: true }, cursor, options);
    expect(next.scale).toBeLessThan(stage.scale);
  });
});

describe('wheelPixels', () => {
  it('converts line and page deltas to pixels', () => {
    expect(wheelPixels({ ...wheel, deltaY: 3, deltaMode: 1 }, 800)).toEqual({ dx: 0, dy: 48 });
    expect(wheelPixels({ ...wheel, deltaX: 1, deltaMode: 2 }, 800)).toEqual({ dx: 800, dy: 0 });
  });
});
