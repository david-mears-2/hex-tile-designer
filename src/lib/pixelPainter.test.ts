import { describe, it, expect } from 'vitest';
import { getPixel, paintPixel, parseColor, rgbaToHex, floodFill, getBrushOffsets } from './pixelPainter';
import { hexBBox } from './hexGeometry';
import type { HexConfig } from '../types';

const cfg: HexConfig = { radius: 16, squishY: 1.0, skewX: 0 };

function makePixels(config: HexConfig): Uint8ClampedArray {
  const { width, height } = hexBBox(config);
  return new Uint8ClampedArray(width * height * 4);
}

describe('paintPixel / getPixel', () => {
  it('round-trips a color', () => {
    const { width } = hexBBox(cfg);
    const px = makePixels(cfg);
    paintPixel(px, width, 2, 3, 255, 128, 0, 200);
    expect(getPixel(px, width, 2, 3)).toEqual([255, 128, 0, 200]);
  });

  it('does not affect adjacent pixels', () => {
    const { width } = hexBBox(cfg);
    const px = makePixels(cfg);
    paintPixel(px, width, 5, 5, 1, 2, 3, 4);
    expect(getPixel(px, width, 5, 4)).toEqual([0, 0, 0, 0]);
    expect(getPixel(px, width, 6, 5)).toEqual([0, 0, 0, 0]);
  });
});

describe('parseColor', () => {
  it('parses 6-digit hex', () => {
    expect(parseColor('#ff8000')).toEqual([255, 128, 0, 255]);
  });

  it('handles leading hash', () => {
    expect(parseColor('#000000')).toEqual([0, 0, 0, 255]);
  });
});

describe('rgbaToHex', () => {
  it('converts rgb to hex string', () => {
    expect(rgbaToHex(255, 128, 0)).toBe('#ff8000');
    expect(rgbaToHex(0, 0, 0)).toBe('#000000');
  });
});

describe('getBrushCoverage', () => {
  it('size 1 is a single fully-covered pixel', () => {
    expect(getBrushCoverage(1, 'circle')).toEqual([[0, 0, 1]]);
  });

  it('square gives full coverage at every pixel', () => {
    const cov = getBrushCoverage(3, 'square');
    expect(cov.every(([, , c]) => c === 1)).toBe(true);
  });

  it('circle centre is full while the edge fades below 1', () => {
    const cov = getBrushCoverage(3, 'circle');
    const centre = cov.find(([dx, dy]) => dx === 0 && dy === 0);
    const edge = cov.find(([dx, dy]) => dx === 2 && dy === 0);
    expect(centre?.[2]).toBe(1);
    expect(edge?.[2]).toBeGreaterThan(0);
    expect(edge?.[2]).toBeLessThan(1);
  });
});

describe('floodFill', () => {
  it('fills connected region of matching color', () => {
    const { width, height } = hexBBox(cfg);
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const px = makePixels(cfg);

    const filled = floodFill(px, width, height, cx, cy, 255, 0, 0, 255, cfg);

    expect(getPixel(filled, width, cx, cy)).toEqual([255, 0, 0, 255]);
  });

  it('does not fill outside hex boundary', () => {
    const { width, height } = hexBBox(cfg);
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const px = makePixels(cfg);

    const filled = floodFill(px, width, height, cx, cy, 255, 0, 0, 255, cfg);

    // Corner pixels are outside the hex; should remain unfilled
    expect(getPixel(filled, width, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(getPixel(filled, width, width - 1, height - 1)).toEqual([0, 0, 0, 0]);
  });

  it('does not fill when start color matches fill color', () => {
    const { width, height } = hexBBox(cfg);
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const px = makePixels(cfg);

    const filled = floodFill(px, width, height, cx, cy, 0, 0, 0, 0, cfg);

    // Should return unchanged pixels since start color == fill color (both transparent)
    let changed = false;
    for (let i = 0; i < filled.length; i++) {
      if (filled[i] !== px[i]) { changed = true; break; }
    }
    expect(changed).toBe(false);
  });

  it('respects color boundaries', () => {
    const { width, height } = hexBBox(cfg);
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const px = makePixels(cfg);

    // Paint a row through center red to create a boundary
    for (let x = 0; x < width; x++) {
      paintPixel(px, width, x, cy, 255, 0, 0, 255);
    }

    // Fill above center with blue
    const filled = floodFill(px, width, height, cx, cy - 1, 0, 0, 255, 255, cfg);

    // Red row should not be overwritten
    expect(getPixel(filled, width, cx, cy)).toEqual([255, 0, 0, 255]);
    // Below red row should remain transparent
    if (isInsideHexCoord(cx, cy + 1, cfg, width, height)) {
      expect(getPixel(filled, width, cx, cy + 1)).toEqual([0, 0, 0, 0]);
    }
  });
});

describe('getBrushOffsets', () => {
  it('size 1 returns only (0,0) for all shapes', () => {
    expect(getBrushOffsets(1, 'circle')).toEqual([[0, 0]]);
    expect(getBrushOffsets(1, 'square')).toEqual([[0, 0]]);
    expect(getBrushOffsets(1, 'diamond')).toEqual([[0, 0]]);
  });

  it('size 2 circle returns 5 pixels (cross)', () => {
    const offsets = getBrushOffsets(2, 'circle');
    expect(offsets).toHaveLength(5);
    expect(offsets).toContainEqual([0, 0]);
    expect(offsets).toContainEqual([1, 0]);
    expect(offsets).toContainEqual([-1, 0]);
    expect(offsets).toContainEqual([0, 1]);
    expect(offsets).toContainEqual([0, -1]);
  });

  it('size 2 square returns 9 pixels (3×3 block) including corners', () => {
    const offsets = getBrushOffsets(2, 'square');
    expect(offsets).toHaveLength(9);
    expect(offsets).toContainEqual([1, 1]);
    expect(offsets).toContainEqual([-1, -1]);
  });

  it('size 2 diamond returns 5 pixels (same shape as circle at radius 1)', () => {
    expect(getBrushOffsets(2, 'diamond')).toHaveLength(5);
  });

  it('size 3 circle and diamond are both 13 pixels at radius 2', () => {
    expect(getBrushOffsets(3, 'circle')).toHaveLength(13);
    expect(getBrushOffsets(3, 'diamond')).toHaveLength(13);
  });

  it('size 3 square returns 25 pixels (5×5 block)', () => {
    expect(getBrushOffsets(3, 'square')).toHaveLength(25);
  });

  it('size 4 circle includes (2,2) but diamond does not', () => {
    const circle = getBrushOffsets(4, 'circle');
    const diamond = getBrushOffsets(4, 'diamond');
    expect(circle).toContainEqual([2, 2]);
    expect(diamond).not.toContainEqual([2, 2]);
  });

  it('square always includes corners that circle and diamond exclude', () => {
    const circle = getBrushOffsets(3, 'circle');
    const square = getBrushOffsets(3, 'square');
    expect(square.length).toBeGreaterThan(circle.length);
    expect(square).toContainEqual([2, 2]);
    expect(circle).not.toContainEqual([2, 2]);
  });

  it('all shapes are symmetric about both axes', () => {
    for (const shape of ['circle', 'square', 'diamond'] as const) {
      const offsets = getBrushOffsets(3, shape);
      const set = new Set(offsets.map(([dx, dy]) => `${dx},${dy}`));
      for (const [dx, dy] of offsets) {
        expect(set.has(`${-dx},${dy}`)).toBe(true);
        expect(set.has(`${dx},${-dy}`)).toBe(true);
      }
    }
  });
});

function isInsideHexCoord(x: number, y: number, _config: HexConfig, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}
