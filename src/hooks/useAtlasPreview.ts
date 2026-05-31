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

      // Scale tiles so 5 columns exactly span the container width; ROWS fill height
      const nativeW5 = 4 * stepX + bbox.width;
      const zoom = W / nativeW5;

      const COLS = 5;
      const ROWS = Math.max(2, Math.ceil((H / zoom - bbox.height - stepY / 2) / stepY) + 2);

      canvas.width = W;
      canvas.height = H;
      ctx.imageSmoothingEnabled = false;

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
      const hasSquish = Math.abs(scaleY - 1) > 0.001;

      const visH = H / zoom;
      const yMid = visH / 2;
      // SkewX shifts whole rows horizontally to keep the lattice tessellating:
      // rows above the vertical centre move right, rows below move left. This is a
      // single global shear (x' = x − skewX·(y − yMid)) of the whole tiling, so the
      // hexes still meet edge-to-edge. Extra columns cover the slanted rows.
      const extraCols = Math.abs(skewX) < 0.001
        ? 0
        : Math.ceil((Math.abs(skewX) * yMid) / stepX) + 1;
      const entryCount = layout.entries.length;

      // Apply zoom: tile coordinates are in native units; ctx.scale maps them to screen.
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.transform(1, 0, -skewX, 1, skewX * yMid, 0); // global skew shear

      for (let col = -extraCols; col < COLS + extraCols; col++) {
        for (let row = 0; row < ROWS; row++) {
          const entryIndex = (((col + row) % entryCount) + entryCount) % entryCount;
          const entry = layout.entries[entryIndex];

          const cx = col * stepX + bbox.width / 2;
          const cy = row * stepY + (((col % 2) + 2) % 2 === 1 ? stepY / 2 : 0) + bbox.height / 2;

          offCtx.clearRect(0, 0, bbox.width, bbox.height);
          offCtx.drawImage(
            atlasCanvasRef.current!,
            entry.x, entry.y, bbox.width, bbox.height,
            0, 0, bbox.width, bbox.height,
          );

          // The hex shape carries only the preview squish; the global shear above
          // applies the skew to both the cell shape and its row position.
          const clipPath = hexPath2D(hexConfig, cx, cy, { squishY });
          ctx.save();
          ctx.clip(clipPath);
          if (hasSquish) {
            ctx.translate(cx, cy);
            ctx.transform(1, 0, 0, scaleY, 0, 0);
            ctx.drawImage(offscreenRef.current!, -bbox.width / 2, -bbox.height / 2);
          } else {
            ctx.drawImage(offscreenRef.current!, cx - bbox.width / 2, cy - bbox.height / 2);
          }
          ctx.restore();
        }
      }

      ctx.restore(); // end zoom + shear
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
