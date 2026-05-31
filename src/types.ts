export interface HexConfig {
  radius: number;
  squishY: number;
  skewX: number;
}

export interface TileType {
  id: string;
  name: string;
  pixels: Uint8ClampedArray;
}

export type ToolType = 'pencil' | 'fill' | 'eraser' | 'picker';
export type BrushShape = 'circle' | 'square' | 'diamond';

export interface EditorState {
  activeTileId: string | null;
  activeTool: ToolType;
  activeColor: string;
  zoom: number;
  brushSize: number;
  brushShape: BrushShape;
  previewSquishY: number;
}

export type UndoEntry =
  | { type: 'paint'; tileId: string; prevPixels: Uint8ClampedArray; nextPixels: Uint8ClampedArray }
  | { type: 'configClear'; prevConfig: HexConfig; prevPixelsByTile: Record<string, Uint8ClampedArray>; nextConfig: HexConfig }

export interface AtlasTileEntry {
  tileId: string;
  tileName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AtlasLayout {
  columns: number;
  rows: number;
  atlasWidth: number;
  atlasHeight: number;
  entries: AtlasTileEntry[];
}

export interface AtlasMetadata {
  version: 1;
  hexConfig: HexConfig;
  tiles: Record<string, { x: number; y: number; width: number; height: number }>;
}
