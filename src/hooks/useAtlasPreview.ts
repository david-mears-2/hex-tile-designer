import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { TileType, HexConfig, EditorState, AtlasLayout } from '../types';
import { hexBBox, hexPath2D } from '../lib/hexGeometry';
import { buildAtlasImageData } from '../lib/atlasLayout';

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

    const parent = canvas.parentElement;
    if (!parent) return;

    function render() {
      if (!canvas || !parent) return;
      const W = parent.clientWidth;
      const H = parent.clientHeight;
      if (W === 0 || H === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bbox = hexBBox(hexConfig);
      const r = hexConfig.radius;
      const sy = hexConfig.squishY;
      const stepX = r * 1.5;
      const stepY = r * sy * Math.sqrt(3);

      // Enough columns/rows to fill the container at native scale (add 2 as buffer)
      const COLS = Math.max(2, Math.ceil((W - bbox.width) / stepX) + 2);
      const ROWS = Math.max(2, Math.ceil((H - bbox.height - stepY / 2) / stepY) + 2);

      canvas.width = W;
      canvas.height = H;

      ctx.fillStyle = '#1c1c1e';
      ctx.fillRect(0, 0, W, H);

      // Build atlas canvas — source of truth for tile pixels
      if (!atlasCanvasRef.current) atlasCanvasRef.current = document.createElement('canvas');
      atlasCanvasRef.current.width = layout.atlasWidth;
      atlasCanvasRef.current.height = layout.atlasHeight;
      const atlasCtx = atlasCanvasRef.current.getContext('2d');
      if (!atlasCtx) return;
      atlasCtx.putImageData(buildAtlasImageData(tileTypes, layout, bbox), 0, 0);

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

          // Skip tiles whose center is clearly off-canvas
          if (cx - bbox.width / 2 > W || cy - bbox.height / 2 > H) continue;

          offCtx.clearRect(0, 0, bbox.width, bbox.height);
          offCtx.drawImage(
            atlasCanvasRef.current!,
            entry.x, entry.y, bbox.width, bbox.height,
            0, 0, bbox.width, bbox.height,
          );

          if (hasTransform) {
            const clipPath = hexPath2D(hexConfig, cx, cy, { skewX, squishY });
            ctx.save();
            ctx.clip(clipPath);
            ctx.translate(cx, cy);
            ctx.transform(1, 0, skewX, scaleY, 0, 0);
            ctx.drawImage(offscreenRef.current!, -bbox.width / 2, -bbox.height / 2);
            ctx.restore();
            ctx.strokeStyle = 'rgba(180, 180, 180, 0.25)';
            ctx.lineWidth = 1;
            ctx.stroke(clipPath);
          } else {
            const clipPath = hexPath2D(hexConfig, cx, cy);
            ctx.save();
            ctx.clip(clipPath);
            ctx.drawImage(offscreenRef.current!, cx - bbox.width / 2, cy - bbox.height / 2);
            ctx.restore();
            ctx.strokeStyle = 'rgba(180, 180, 180, 0.25)';
            ctx.lineWidth = 1;
            ctx.stroke(clipPath);
          }
        }
      }
    }

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(parent);
    schedule(); // initial render

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [canvasRef, tileTypes, hexConfig, editor, layout]);
}
