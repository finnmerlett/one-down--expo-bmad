import { describe, expect, it } from 'vitest';
import { fanOffset, initialImageSize, screenToCanvas } from './coords';

describe('screenToCanvas', () => {
  const rect = { left: 100, top: 50 };

  it('subtracts the content origin at scale 1', () => {
    expect(screenToCanvas(300, 250, rect, 1)).toEqual({ x: 200, y: 200 });
  });

  it('divides by scale when zoomed out', () => {
    expect(screenToCanvas(300, 250, rect, 0.5)).toEqual({ x: 400, y: 400 });
  });

  it('divides by scale when zoomed in', () => {
    expect(screenToCanvas(300, 250, rect, 2)).toEqual({ x: 100, y: 100 });
  });
});

describe('initialImageSize', () => {
  it('caps a wide image at 600 and keeps the aspect ratio', () => {
    expect(initialImageSize(1200, 800)).toEqual({ width: 600, height: 400 });
  });

  it('leaves a narrow image at its natural size', () => {
    expect(initialImageSize(300, 900)).toEqual({ width: 300, height: 900 });
  });

  it('handles a square image', () => {
    expect(initialImageSize(2000, 2000)).toEqual({ width: 600, height: 600 });
  });

  it('falls back to a square when dimensions are unknown', () => {
    expect(initialImageSize(0, 0)).toEqual({ width: 600, height: 600 });
  });
});

describe('fanOffset', () => {
  it('offsets each subsequent item by 24px', () => {
    expect(fanOffset(0)).toBe(0);
    expect(fanOffset(1)).toBe(24);
    expect(fanOffset(3)).toBe(72);
  });
});
