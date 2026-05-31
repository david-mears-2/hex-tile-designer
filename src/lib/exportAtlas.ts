import type { TileType, AtlasLayout, AtlasMetadata, HexConfig } from '../types';
import { hexBBox } from './hexGeometry';
import { buildAtlasImageData } from './atlasLayout';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function exportAtlas(
  tileTypes: TileType[],
  hexConfig: HexConfig,
  layout: AtlasLayout
): Promise<void> {
  const bbox = hexBBox(hexConfig);
  const imageData = buildAtlasImageData(tileTypes, layout, bbox);

  const canvas = document.createElement('canvas');
  canvas.width = layout.atlasWidth;
  canvas.height = layout.atlasHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'atlas.png');
      resolve();
    }, 'image/png');
  });

  const nameCounts = new Map<string, number>();
  const metadata: AtlasMetadata = {
    version: 1,
    hexConfig,
    tiles: {},
  };

  for (const entry of layout.entries) {
    const count = (nameCounts.get(entry.tileName) ?? 0) + 1;
    nameCounts.set(entry.tileName, count);
    const key = count === 1 ? entry.tileName : `${entry.tileName}_${count}`;
    metadata.tiles[key] = {
      x: entry.x,
      y: entry.y,
      width: entry.width,
      height: entry.height,
    };
  }

  const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(jsonBlob, 'atlas.json');
}
