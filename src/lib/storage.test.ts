import { describe, it, expect, beforeEach } from 'vitest';
import { saveState, loadState } from './storage';
import type { HexConfig, TileType } from '../types';

const hexConfig: HexConfig = { radius: 32, squishY: 0.75, skewX: 0.2 };

function makeTile(id: string, name: string, pixelValue = 0): TileType {
  const pixels = new Uint8ClampedArray(64);
  pixels.fill(pixelValue);
  return { id, name, pixels };
}

beforeEach(() => {
  localStorage.clear();
});

describe('saveState / loadState', () => {
  it('returns null when nothing saved', () => {
    expect(loadState()).toBeNull();
  });

  it('round-trips hex config', () => {
    saveState(hexConfig, [], '#ff0000', 'pencil');
    const loaded = loadState();
    expect(loaded?.hexConfig).toEqual(hexConfig);
  });

  it('round-trips tile names and ids', () => {
    const tiles = [makeTile('abc', 'Grass'), makeTile('def', 'Water')];
    saveState(hexConfig, tiles, '#ffffff', 'fill');
    const loaded = loadState();
    expect(loaded?.tileTypes.map(t => t.id)).toEqual(['abc', 'def']);
    expect(loaded?.tileTypes.map(t => t.name)).toEqual(['Grass', 'Water']);
  });

  it('round-trips pixel data exactly', () => {
    const tile = makeTile('t1', 'Test', 128);
    tile.pixels[7] = 255;
    saveState(hexConfig, [tile], '#000000', 'pencil');
    const loaded = loadState();
    const loadedPixels = loaded!.tileTypes[0].pixels;
    expect(loadedPixels[0]).toBe(128);
    expect(loadedPixels[7]).toBe(255);
    expect(loadedPixels.length).toBe(64);
  });

  it('round-trips activeColor and activeTool', () => {
    saveState(hexConfig, [], '#aabbcc', 'eraser');
    const loaded = loadState();
    expect(loaded?.activeColor).toBe('#aabbcc');
    expect(loaded?.activeTool).toBe('eraser');
  });

  it('returns null for corrupt data', () => {
    localStorage.setItem('tile-designer-v1', 'not-json');
    expect(loadState()).toBeNull();
  });
});
