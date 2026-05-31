import type { HexConfig } from '../types';

export interface HexBBox {
  width: number;
  height: number;
}

export function hexVertices(
  config: HexConfig,
  cx: number,
  cy: number,
  overrides?: { skewX?: number; squishY?: number }
): [number, number][] {
  const r = config.radius;
  const sy = overrides?.squishY ?? config.squishY;
  const kx = overrides?.skewX ?? 0;
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 * Math.PI) / 180;
    return [
      cx + r * Math.cos(a) + kx * r * Math.sin(a),
      cy + r * sy * Math.sin(a),
    ] as [number, number];
  });
}

export function hexBBox(config: HexConfig): HexBBox {
  const verts = hexVertices(config, 0, 0);
  const xs = verts.map(([x]) => x);
  const ys = verts.map(([, y]) => y);
  const w = Math.max(...xs) - Math.min(...xs) + 2;
  const h = Math.max(...ys) - Math.min(...ys) + 2;
  return {
    width: Math.ceil(w / 2) * 2,
    height: Math.ceil(h / 2) * 2,
  };
}

export function hexPath2D(
  config: HexConfig,
  cx: number,
  cy: number,
  overrides?: { skewX?: number; squishY?: number }
): Path2D {
  const verts = hexVertices(config, cx, cy, overrides);
  const path = new Path2D();
  path.moveTo(verts[0][0], verts[0][1]);
  for (let i = 1; i < 6; i++) {
    path.lineTo(verts[i][0], verts[i][1]);
  }
  path.closePath();
  return path;
}

export function isInsideHex(px: number, py: number, config: HexConfig): boolean {
  const bbox = hexBBox(config);
  const cx = bbox.width / 2;
  const cy = bbox.height / 2;
  const verts = hexVertices(config, cx, cy);
  for (let i = 0; i < 6; i++) {
    const [ax, ay] = verts[i];
    const [bx, by] = verts[(i + 1) % 6];
    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    if (cross < 0) return false;
  }
  return true;
}
