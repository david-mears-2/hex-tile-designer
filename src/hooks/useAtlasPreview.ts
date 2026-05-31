import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { TileType, HexConfig, EditorState, AtlasLayout } from '../types';
import { hexBBox, hexPath2D } from '../lib/hexGeometry';
import { buildAtlasImageData } from '../lib/atlasLayout';

const COLS = 5;
const ROWS = 4;

export function useTessellationPreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  tileTypes: TileType[],
  hexConfig: HexConfig,
  editor: EditorState,
  layout: AtlasLayout,
): void {
  const atlasCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layout.atlasWidth === 0 || layout.entries.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bbox = hexBBox(hexConfig);
    const r = hexConfig.radius;
    const sy = hexConfig.squishY;

    const stepX = r * 1.5;
    const stepY = r * sy * Math.sqrt(3);

    const canvasWidth = Math.ceil((COLS - 1) * stepX + bbox.width);
    const canvasHeight = Math.ceil((ROWS - 1) * stepY + stepY / 2 + bbox.height);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Build atlas canvas — the tessellation sources pixels from the atlas export
    if (!atlasCanvasRef.current) atlasCanvasRef.current = document.createElement('canvas');
    atlasCanvasRef.current.width = layout.atlasWidth;
    atlasCanvasRef.current.height = layout.atlasHeight;
    const atlasCtx = atlasCanvasRef.current.getContext('2d');
    if (!atlasCtx) return;
    atlasCtx.putImageData(buildAtlasImageData(tileTypes, layout, bbox), 0, 0);

    // Offscreen tile canvas for per-hex clip + transform
    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
    offscreenRef.current.width = bbox.width;
    offscreenRef.current.height = bbox.height;
    const offCtx = offscreenRef.current.getContext('2d');
    if (!offCtx) return;

    const skewX = hexConfig.skewX;
    const squishY = editor.previewSquishY;
    const designSquishY = hexConfig.squishY;
    const scaleY = designSquishY === 0 ? 1 : squishY / designSquishY;
    const hasTransform = Math.abs(skewX) > 0.001 || Math.abs(scaleY - 1) > 0.001;

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const entryIndex = (col + row) % layout.entries.length;
        const entry = layout.entries[entryIndex];

        const cx = col * stepX + bbox.width / 2;
        const cy = row * stepY + (col % 2) * (stepY / 2) + bbox.height / 2;

        // Sample this tile's pixels from the atlas canvas
        offCtx.clearRect(0, 0, bbox.width, bbox.height);
        offCtx.drawImage(
          atlasCanvasRef.current,
          entry.x, entry.y, bbox.width, bbox.height,
          0, 0, bbox.width, bbox.height,
        );

        if (hasTransform) {
          const clipPath = hexPath2D(hexConfig, cx, cy, { skewX, squishY });
          ctx.save();
          ctx.clip(clipPath);
          ctx.translate(cx, cy);
          ctx.transform(1, 0, skewX, scaleY, 0, 0);
          ctx.drawImage(offscreenRef.current, -bbox.width / 2, -bbox.height / 2);
          ctx.restore();
          ctx.strokeStyle = 'rgba(180, 180, 180, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke(clipPath);
        } else {
          const clipPath = hexPath2D(hexConfig, cx, cy);
          ctx.save();
          ctx.clip(clipPath);
          ctx.drawImage(offscreenRef.current, cx - bbox.width / 2, cy - bbox.height / 2);
          ctx.restore();
          ctx.strokeStyle = 'rgba(180, 180, 180, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke(clipPath);
        }
      }
    }
  }, [canvasRef, tileTypes, hexConfig, editor, layout]);
}
