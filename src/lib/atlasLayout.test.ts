import { describe, it, expect } from 'vitest';
import { computeAtlasLayout, buildAtlasImageData } from './atlasLayout';
import { hexBBox } from './hexGeometry';
import { paintPixel } from './pixelPainter';
import type { TileType, HexConfig } from '../types';

const cfg: HexConfig = { radius: 16, squishY: 1.0, skewX: 0 };

function makeTile(id: string, name: string): TileType {
  const bbox = hexBBox(cfg);
  return { id, name, pixels: new Uint8ClampedArray(bbox.width * bbox.height * 4) };
}

describe('computeAtlasLayout', () => {
  it('returns empty layout for zero tiles', () => {
    const layout = computeAtlasLayout([], hexBBox(cfg));
    expect(layout.entries).toHaveLength(0);
    expect(layout.atlasWidth).toBe(0);
  });

  it('single tile: 1x1 grid with correct position', () => {
    const tile = makeTile('a', 'Grass');
    const bbox = hexBBox(cfg);
    const layout = computeAtlasLayout([tile], bbox);

    expect(layout.columns).toBe(1);
    expect(layout.rows).toBe(1);
    expect(layout.entries[0].x).toBe(1);
    expect(layout.entries[0].y).toBe(1);
    expect(layout.entries[0].width).toBe(bbox.width);
  });

  it('4 tiles: 2x2 grid', () => {
    const tiles = [makeTile('a','A'), makeTile('b','B'), makeTile('c','C'), makeTile('d','D')];
    const layout = computeAtlasLayout(tiles, hexBBox(cfg));
    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(2);
  });

  it('atlas is large enough to contain all entries', () => {
    const tiles = Array.from({ length: 9 }, (_, i) => makeTile(String(i), `T${i}`));
    const bbox = hexBBox(cfg);
    const layout = computeAtlasLayout(tiles, bbox);

    for (const e of layout.entries) {
      expect(e.x + e.width).toBeLessThanOrEqual(layout.atlasWidth);
      expect(e.y + e.height).toBeLessThanOrEqual(layout.atlasHeight);
    }
  });

  it('tile IDs match input order', () => {
    const tiles = [makeTile('x','X'), makeTile('y','Y'), makeTile('z','Z')];
    const layout = computeAtlasLayout(tiles, hexBBox(cfg));
    expect(layout.entries.map(e => e.tileId)).toEqual(['x', 'y', 'z']);
  });
});

describe('buildAtlasImageData', () => {
  it('dimensions match layout', () => {
    const tiles = [makeTile('a', 'A'), makeTile('b', 'B')];
    const bbox = hexBBox(cfg);
    const layout = computeAtlasLayout(tiles, bbox);
    const img = buildAtlasImageData(tiles, layout, bbox);
    expect(img.width).toBe(layout.atlasWidth);
    expect(img.height).toBe(layout.atlasHeight);
  });

  it('copies pixel data to correct atlas position', () => {
    const bbox = hexBBox(cfg);
    const tile = makeTile('a', 'A');
    paintPixel(tile.pixels, bbox.width, 0, 0, 255, 0, 0, 255);

    const layout = computeAtlasLayout([tile], bbox);
    const img = buildAtlasImageData([tile], layout, bbox);

    const entry = layout.entries[0];
    const dstIdx = (entry.y * layout.atlasWidth + entry.x) * 4;
    expect(img.data[dstIdx]).toBe(255);
    expect(img.data[dstIdx + 1]).toBe(0);
    expect(img.data[dstIdx + 2]).toBe(0);
    expect(img.data[dstIdx + 3]).toBe(255);
  });

  it('padding pixels remain transparent', () => {
    const bbox = hexBBox(cfg);
    const tiles = [makeTile('a','A'), makeTile('b','B')];
    for (const t of tiles) t.pixels.fill(255);
    const layout = computeAtlasLayout(tiles, bbox);
    const img = buildAtlasImageData(tiles, layout, bbox);

    // x=0,y=0 is padding
    expect(img.data[0]).toBe(0);
    expect(img.data[3]).toBe(0);
  });
});
