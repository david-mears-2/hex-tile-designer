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

// Builds the atlas sidecar metadata: hex config plus an id -> { name, rect } lookup.
// Keying by the stable tile id (rather than the editable name) keeps the mapping
// unambiguous even if two tiles share a name, and stable across renames.
export function buildAtlasMetadata(
  hexConfig: HexConfig,
  layout: AtlasLayout
): AtlasMetadata {
  const metadata: AtlasMetadata = {
    version: 2,
    hexConfig,
    tiles: {},
  };

  for (const entry of layout.entries) {
    metadata.tiles[entry.tileId] = {
      name: entry.tileName,
      x: entry.x,
      y: entry.y,
      width: entry.width,
      height: entry.height,
    };
  }

  return metadata;
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

  const metadata = buildAtlasMetadata(hexConfig, layout);

  const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(jsonBlob, 'atlas.json');
}
