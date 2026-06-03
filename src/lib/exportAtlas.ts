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

// Converts a display name to an asset-friendly slug: lowercased, with runs of
// non-alphanumeric characters collapsed to single hyphens. Falls back to "tile" when
// the name contains no usable characters.
function slugify(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'tile';
}

// Builds the atlas sidecar metadata: hex config plus a slug -> { name, rect } lookup.
// Tiles are keyed by a name-derived slug so the game can reference them with readable
// keys (e.g. atlas.tiles["deep-water"]). Names are unique in the UI, but if two ever
// slugify to the same value the later occurrences are suffixed (-2, -3, …).
export function buildAtlasMetadata(
  hexConfig: HexConfig,
  layout: AtlasLayout
): AtlasMetadata {
  const slugCounts = new Map<string, number>();
  const metadata: AtlasMetadata = {
    version: 1,
    hexConfig,
    tiles: {},
  };

  for (const entry of layout.entries) {
    const base = slugify(entry.tileName);
    const count = (slugCounts.get(base) ?? 0) + 1;
    slugCounts.set(base, count);
    const key = count === 1 ? base : `${base}-${count}`;
    metadata.tiles[key] = {
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
