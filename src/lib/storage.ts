import type { HexConfig, TileType, ToolType } from '../types';

const STORAGE_KEY = 'tile-designer-v1';

interface StoredState {
  version: 1;
  hexConfig: HexConfig;
  tileTypes: Array<{ id: string; name: string; pixels: string }>;
  activeColor: string;
  activeTool: ToolType;
}

function encodePixels(pixels: Uint8ClampedArray): string {
  let binary = '';
  for (let i = 0; i < pixels.length; i++) {
    binary += String.fromCharCode(pixels[i]);
  }
  return btoa(binary);
}

function decodePixels(b64: string): Uint8ClampedArray {
  const binary = atob(b64);
  const result = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) {
    result[i] = binary.charCodeAt(i);
  }
  return result;
}

export function saveState(
  hexConfig: HexConfig,
  tileTypes: TileType[],
  activeColor: string,
  activeTool: ToolType
): void {
  const stored: StoredState = {
    version: 1,
    hexConfig,
    tileTypes: tileTypes.map(t => ({
      id: t.id,
      name: t.name,
      pixels: encodePixels(t.pixels),
    })),
    activeColor,
    activeTool,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

interface LoadedState {
  hexConfig: HexConfig;
  tileTypes: TileType[];
  activeColor: string;
  activeTool: ToolType;
}

export function loadState(): LoadedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredState;
    if (stored.version !== 1) return null;
    return {
      hexConfig: stored.hexConfig,
      tileTypes: stored.tileTypes.map(t => ({
        id: t.id,
        name: t.name,
        pixels: decodePixels(t.pixels),
      })),
      activeColor: stored.activeColor,
      activeTool: stored.activeTool,
    };
  } catch {
    return null;
  }
}
