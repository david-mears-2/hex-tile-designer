import { describe, it, expect } from 'vitest';
import { buildAtlasMetadata } from './exportAtlas';
import type { AtlasLayout, AtlasTileEntry, HexConfig } from '../types';

const hexConfig: HexConfig = { radius: 32, squishY: 0.75, skewX: 0.2 };

function entry(tileName: string, x: number, y: number): AtlasTileEntry {
  return { tileId: `${tileName}-${x}-${y}`, tileName, x, y, width: 66, height: 44 };
}

function layoutOf(entries: AtlasTileEntry[]): AtlasLayout {
  return { columns: entries.length, rows: 1, atlasWidth: 0, atlasHeight: 0, entries };
}

describe('buildAtlasMetadata', () => {
  it('stamps version 1 and echoes the hex config', () => {
    const meta = buildAtlasMetadata(hexConfig, layoutOf([entry('Grass', 1, 1)]));
    expect(meta.version).toBe(1);
    expect(meta.hexConfig).toEqual(hexConfig);
  });

  it('keys each tile by name with its atlas rect', () => {
    const meta = buildAtlasMetadata(
      hexConfig,
      layoutOf([entry('Grass', 1, 1), entry('Water', 68, 1)])
    );
    expect(meta.tiles).toEqual({
      Grass: { x: 1, y: 1, width: 66, height: 44 },
      Water: { x: 68, y: 1, width: 66, height: 44 },
    });
  });

  it('suffixes duplicate names so no entry is dropped', () => {
    const meta = buildAtlasMetadata(
      hexConfig,
      layoutOf([entry('Grass', 1, 1), entry('Grass', 68, 1), entry('Grass', 135, 1)])
    );
    expect(Object.keys(meta.tiles)).toEqual(['Grass', 'Grass_2', 'Grass_3']);
    expect(meta.tiles['Grass'].x).toBe(1);
    expect(meta.tiles['Grass_2'].x).toBe(68);
    expect(meta.tiles['Grass_3'].x).toBe(135);
  });

  it('produces an empty tiles map for an empty layout', () => {
    const meta = buildAtlasMetadata(hexConfig, layoutOf([]));
    expect(meta.tiles).toEqual({});
  });
});
