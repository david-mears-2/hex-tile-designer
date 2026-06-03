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
  it('stamps version 2 and echoes the hex config', () => {
    const meta = buildAtlasMetadata(hexConfig, layoutOf([entry('id-a', 'Grass', 1)]));
    expect(meta.version).toBe(2);
    expect(meta.hexConfig).toEqual(hexConfig);
  });

  it('keys each tile by id, carrying the name and atlas rect', () => {
    const meta = buildAtlasMetadata(
      hexConfig,
      layoutOf([entry('id-a', 'Grass', 1), entry('id-b', 'Water', 68)])
    );
    expect(meta.tiles).toEqual({
      'id-a': { name: 'Grass', x: 1, y: 1, width: 66, height: 44 },
      'id-b': { name: 'Water', x: 68, y: 1, width: 66, height: 44 },
    });
  });

  it('keeps same-named tiles distinct via their ids', () => {
    const meta = buildAtlasMetadata(
      hexConfig,
      layoutOf([entry('id-1', 'Grass', 1), entry('id-2', 'Grass', 68)])
    );
    expect(Object.keys(meta.tiles)).toEqual(['id-1', 'id-2']);
    expect(meta.tiles['id-1'].x).toBe(1);
    expect(meta.tiles['id-2'].x).toBe(68);
    expect(meta.tiles['id-1'].name).toBe('Grass');
    expect(meta.tiles['id-2'].name).toBe('Grass');
  });

  it('produces an empty tiles map for an empty layout', () => {
    const meta = buildAtlasMetadata(hexConfig, layoutOf([]));
    expect(meta.tiles).toEqual({});
  });
});
