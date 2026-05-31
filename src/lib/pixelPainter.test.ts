import { describe, it, expect } from 'vitest';
import { getPixel, paintPixel, parseColor, rgbaToHex, floodFill } from './pixelPainter';
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

function isInsideHexCoord(x: number, y: number, _config: HexConfig, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}
