import { isInsideHex } from './hexGeometry';
import type { HexConfig, BrushShape } from '../types';

export function getPixel(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
}

export function paintPixel(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number
): void {
  const i = (y * width + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

export function parseColor(color: string): [number, number, number, number] {
  const hex = color.startsWith('#') ? color.slice(1) : color;
  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      255,
    ];
  }
  return [0, 0, 0, 255];
}

export function rgbaToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function getBrushOffsets(brushSize: number, brushShape: BrushShape): [number, number][] {
  const r = brushSize - 1;
  if (r === 0) return [[0, 0]];
  const offsets: [number, number][] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const inside =
        brushShape === 'circle'  ? dx * dx + dy * dy <= r * r :
        brushShape === 'diamond' ? Math.abs(dx) + Math.abs(dy) <= r :
        true; // square
      if (inside) offsets.push([dx, dy]);
    }
  }
  return offsets;
}

export function floodFill(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillR: number,
  fillG: number,
  fillB: number,
  fillA: number,
  config: HexConfig
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixels);

  const [tr, tg, tb, ta] = getPixel(result, width, startX, startY);
  if (tr === fillR && tg === fillG && tb === fillB && ta === fillA) return result;

  const visited = new Uint8Array(width * height);
  const stack: [number, number][] = [[startX, startY]];
  visited[startY * width + startX] = 1;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;

    const [r, g, b, a] = getPixel(result, width, x, y);
    if (r !== tr || g !== tg || b !== tb || a !== ta) continue;
    if (!isInsideHex(x, y, config)) continue;

    paintPixel(result, width, x, y, fillR, fillG, fillB, fillA);

    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as [number, number][]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (visited[ny * width + nx]) continue;
      visited[ny * width + nx] = 1;
      stack.push([nx, ny]);
    }
  }

  return result;
}
