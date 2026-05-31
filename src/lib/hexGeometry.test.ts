import { describe, it, expect } from 'vitest';
import { hexVertices, hexBBox, isInsideHex } from './hexGeometry';
import type { HexConfig } from '../types';

const baseConfig: HexConfig = { radius: 32, squishY: 1.0, skewX: 0 };
const squishConfig: HexConfig = { radius: 32, squishY: 0.75, skewX: 0 };

describe('hexVertices', () => {
  it('returns 6 vertices', () => {
    expect(hexVertices(baseConfig, 0, 0)).toHaveLength(6);
  });

  it('flat-top: vertex 0 is rightmost at (r, 0) relative to center', () => {
    const verts = hexVertices(baseConfig, 0, 0);
    expect(verts[0][0]).toBeCloseTo(32);
    expect(verts[0][1]).toBeCloseTo(0);
  });

  it('flat-top: vertex 3 is leftmost at (-r, 0) relative to center', () => {
    const verts = hexVertices(baseConfig, 0, 0);
    expect(verts[3][0]).toBeCloseTo(-32);
    expect(verts[3][1]).toBeCloseTo(0);
  });

  it('squishY compresses y coordinates', () => {
    const normal = hexVertices(baseConfig, 0, 0);
    const squished = hexVertices(squishConfig, 0, 0);
    // y coordinates at vertices 1 and 2 should be 0.75x
    expect(squished[1][1]).toBeCloseTo(normal[1][1] * 0.75);
  });

  it('skewX shears x coordinates when passed as override', () => {
    // skewX is render-only — must be passed as an override, not read from config
    const normal = hexVertices(baseConfig, 0, 0);
    const skewed = hexVertices(baseConfig, 0, 0, { skewX: 1.0 });
    // Vertex 1 (a=60°): sin(60°) ≈ 0.866, so x shift = 32 * 1.0 * 0.866 ≈ 27.7
    expect(skewed[1][0]).toBeCloseTo(normal[1][0] + 32 * Math.sin(Math.PI / 3));
    // Vertex 0 (a=0°): sin(0°) = 0, so no x shift
    expect(skewed[0][0]).toBeCloseTo(normal[0][0]);
    // config.skewX is ignored (storage hex always has kx=0)
    const skewInConfig = hexVertices({ ...baseConfig, skewX: 1.0 }, 0, 0);
    expect(skewInConfig[1][0]).toBeCloseTo(normal[1][0]);
  });

  it('respects cx, cy center offset', () => {
    const verts = hexVertices(baseConfig, 100, 50);
    expect(verts[0][0]).toBeCloseTo(132);
    expect(verts[0][1]).toBeCloseTo(50);
  });
});

describe('hexBBox', () => {
  it('width equals 2*radius + 2px padding rounded to even', () => {
    const bbox = hexBBox(baseConfig);
    expect(bbox.width).toBe(66);
  });

  it('height is smaller for squishY < 1', () => {
    const normalBbox = hexBBox(baseConfig);
    const squishBbox = hexBBox(squishConfig);
    expect(squishBbox.height).toBeLessThan(normalBbox.height);
  });

  it('dimensions are always even integers', () => {
    for (const r of [8, 16, 24, 32, 48, 64]) {
      for (const sy of [0.5, 0.75, 1.0]) {
        const bbox = hexBBox({ radius: r, squishY: sy, skewX: 0 });
        expect(bbox.width % 2).toBe(0);
        expect(bbox.height % 2).toBe(0);
      }
    }
  });

  it('skewX does not affect bbox (storage hex uses skewX=0)', () => {
    const noSkew = hexBBox({ radius: 32, squishY: 0.75, skewX: 0 });
    const withSkew = hexBBox({ radius: 32, squishY: 0.75, skewX: 0.5 });
    expect(withSkew.width).toBe(noSkew.width);
    expect(withSkew.height).toBe(noSkew.height);
  });
});

describe('isInsideHex', () => {
  const cfg: HexConfig = { radius: 32, squishY: 1.0, skewX: 0 };

  it('center pixel is inside', () => {
    const bbox = hexBBox(cfg);
    expect(isInsideHex(bbox.width / 2, bbox.height / 2, cfg)).toBe(true);
  });

  it('corner pixel of bbox is outside', () => {
    expect(isInsideHex(0, 0, cfg)).toBe(false);
    expect(isInsideHex(0, hexBBox(cfg).height - 1, cfg)).toBe(false);
  });

  it('pixel a few columns inside the left edge is inside', () => {
    const bbox = hexBBox(cfg);
    // Left vertex is at x=1; a pixel at x=4 is clearly inside
    expect(isInsideHex(4, Math.floor(bbox.height / 2), cfg)).toBe(true);
  });

  it('pixel one column beyond the right vertex is outside', () => {
    const bbox = hexBBox(cfg);
    // Right vertex is at x = bbox.width - 1; bbox.width itself is one past the edge
    expect(isInsideHex(bbox.width, Math.floor(bbox.height / 2), cfg)).toBe(false);
  });

  it('works with squished config', () => {
    const bbox = hexBBox(squishConfig);
    expect(isInsideHex(bbox.width / 2, bbox.height / 2, squishConfig)).toBe(true);
    expect(isInsideHex(0, 0, squishConfig)).toBe(false);
  });
});
