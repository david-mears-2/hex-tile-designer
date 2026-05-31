import type { TileType, AtlasLayout, AtlasTileEntry } from '../types';
import type { HexBBox } from './hexGeometry';

export function computeAtlasLayout(tileTypes: TileType[], bbox: HexBBox): AtlasLayout {
  const count = tileTypes.length;
  if (count === 0) {
    return { columns: 0, rows: 0, atlasWidth: 0, atlasHeight: 0, entries: [] };
  }

  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const padding = 1;
  const atlasWidth = columns * (bbox.width + padding) + padding;
  const atlasHeight = rows * (bbox.height + padding) + padding;

  const entries: AtlasTileEntry[] = tileTypes.map((tile, i) => ({
    tileId: tile.id,
    tileName: tile.name,
    x: padding + (i % columns) * (bbox.width + padding),
    y: padding + Math.floor(i / columns) * (bbox.height + padding),
    width: bbox.width,
    height: bbox.height,
  }));

  return { columns, rows, atlasWidth, atlasHeight, entries };
}

export function buildAtlasImageData(
  tileTypes: TileType[],
  layout: AtlasLayout,
  bbox: HexBBox
): ImageData {
  const imageData = new ImageData(layout.atlasWidth, layout.atlasHeight);
  const data = imageData.data;

  for (const entry of layout.entries) {
    const tile = tileTypes.find(t => t.id === entry.tileId);
    if (!tile) continue;

    for (let ty = 0; ty < bbox.height; ty++) {
      for (let tx = 0; tx < bbox.width; tx++) {
        const srcIdx = (ty * bbox.width + tx) * 4;
        const dstIdx = ((entry.y + ty) * layout.atlasWidth + (entry.x + tx)) * 4;
        data[dstIdx] = tile.pixels[srcIdx];
        data[dstIdx + 1] = tile.pixels[srcIdx + 1];
        data[dstIdx + 2] = tile.pixels[srcIdx + 2];
        data[dstIdx + 3] = tile.pixels[srcIdx + 3];
      }
    }
  }

  return imageData;
}
