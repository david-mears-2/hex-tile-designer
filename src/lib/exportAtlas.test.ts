import { describe, it, expect } from 'vitest';
import { buildAtlasMetadata } from './exportAtlas';
import type { AtlasLayout, AtlasTileEntry, HexConfig } from '../types';

const hexConfig: HexConfig = { radius: 32, squishY: 0.75, skewX: 0.2 };

function entry(tileId: string, tileName: string, x: number): AtlasTileEntry {
  return { tileId, tileName, x, y: 1, width: 66, height: 44 };
}

function layoutOf(entries: AtlasTileEntry[]): AtlasLayout {
  return { columns: entries.length, rows: 1, atlasWidth: 0, atlasHeight: 0, entries };
}

describe('buildAtlasMetadata', () => {
  it('stamps version 1 and echoes the hex config', () => {
    const meta = buildAtlasMetadata(hexConfig, layoutOf([entry('id-a', 'Grass', 1)]));
    expect(meta.version).toBe(1);
    expect(meta.hexConfig).toEqual(hexConfig);
  });

  it('keys each tile by a name-derived slug, carrying name and rect', () => {
    const meta = buildAtlasMetadata(
      hexConfig,
      layoutOf([entry('id-a', 'Grass', 1), entry('id-b', 'Deep Water', 68)])
    );
    expect(meta.tiles).toEqual({
      grass: { name: 'Grass', x: 1, y: 1, width: 66, height: 44 },
      'deep-water': { name: 'Deep Water', x: 68, y: 1, width: 66, height: 44 },
    });
  });

  it('suffixes slugs that collide so no entry is dropped', () => {
    const meta = buildAtlasMetadata(
      hexConfig,
      layoutOf([entry('id-1', 'Deep Water', 1), entry('id-2', 'deep_water', 68)])
    );
    expect(Object.keys(meta.tiles)).toEqual(['deep-water', 'deep-water-2']);
    expect(meta.tiles['deep-water'].x).toBe(1);
    expect(meta.tiles['deep-water-2'].x).toBe(68);
  });

  it('falls back to "tile" when a name has no slug-safe characters', () => {
    const meta = buildAtlasMetadata(hexConfig, layoutOf([entry('id-x', '!!!', 1)]));
    expect(Object.keys(meta.tiles)).toEqual(['tile']);
  });

  it('produces an empty tiles map for an empty layout', () => {
    const meta = buildAtlasMetadata(hexConfig, layoutOf([]));
    expect(meta.tiles).toEqual({});
  });
});
