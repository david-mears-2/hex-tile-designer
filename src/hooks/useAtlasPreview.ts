import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { TileType, HexConfig, EditorState, AtlasLayout } from '../types';
import { hexBBox } from '../lib/hexGeometry';
import { buildAtlasImageData } from '../lib/atlasLayout';

// Each tile is drawn ~BLEED px larger than its hex bbox so neighbouring hexes always
// overlap, leaving no background sliver between them in the native composite. The
// outward shift is ~0 at a tile's centre and ~BLEED px at its rim, so interior art is
// preserved. See plan: snuggly-plotting-matsumoto.md.
const BLEED = 1;

export function useTessellationPreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  tileTypes: TileType[],
  hexConfig: HexConfig,
  editor: EditorState,
  layout: AtlasLayout,
  smoothSeams: boolean,
): void {
  const atlasCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeRef = useRef<HTMLCanvasElement | null>(null);

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

      // Scale tiles so 5 columns exactly span the container width; ROWS fill height.
      // fitScale is derived from the panel width (not a user zoom control): tiles
      // resize automatically when the right column is dragged wider or narrower.
      const nativeW5 = 4 * stepX + bbox.width;
      const fitScale = W / nativeW5;
      const visH = H / fitScale;

      const COLS = 5;
      const ROWS = Math.max(2, Math.ceil((visH - bbox.height - stepY / 2) / stepY) + 2);

      // Atlas canvas — source of truth for tile pixels.
      if (!atlasCanvasRef.current) atlasCanvasRef.current = document.createElement('canvas');
      const atlas = atlasCanvasRef.current;
      atlas.width = layout.atlasWidth;
      atlas.height = layout.atlasHeight;
      const atlasCtx = atlas.getContext('2d');
      if (!atlasCtx) return;
      atlasCtx.putImageData(buildAtlasImageData(tileTypes, layout, bbox), 0, 0);

      // Stage 1 — native-resolution composite, assembled gap-free with hard edges.
      // Stage 2 scales it to the panel in a single drawImage; scaling a gap-free
      // source cannot introduce gaps, so seams never leak the background at any
      // fitScale (the old per-tile scaling did, hence the semi-regular seams).
      const compositeW = Math.ceil(nativeW5);
      const compositeH = Math.ceil(visH);
      if (!compositeRef.current) compositeRef.current = document.createElement('canvas');
      const composite = compositeRef.current;
      composite.width = compositeW;
      composite.height = compositeH;
      const cctx = composite.getContext('2d');
      if (!cctx) return;
      cctx.clearRect(0, 0, compositeW, compositeH);
      cctx.imageSmoothingEnabled = false; // hard edges in the source

      const skewX = hexConfig.skewX;
      const squishY = editor.previewSquishY;
      const designSquishY = hexConfig.squishY;
      const scaleY = designSquishY === 0 ? 1 : squishY / designSquishY;
      const hasSquish = Math.abs(scaleY - 1) > 0.001;

      const yMid = visH / 2;
      // SkewX shifts whole rows horizontally to keep the lattice tessellating: rows
      // above the vertical centre move right, rows below move left. A single global
      // shear (x' = x − skewX·(y − yMid)) of the whole tiling keeps hexes edge-to-edge;
      // extra columns cover the slanted rows.
      const extraCols = Math.abs(skewX) < 0.001
        ? 0
        : Math.ceil((Math.abs(skewX) * yMid) / stepX) + 1;
      const entryCount = layout.entries.length;

      cctx.save();
      cctx.transform(1, 0, -skewX, 1, skewX * yMid, 0); // global skew shear (native units)

      const dw = bbox.width + 2 * BLEED;
      const dh = bbox.height + 2 * BLEED;

      for (let col = -extraCols; col < COLS + extraCols; col++) {
        for (let row = 0; row < ROWS; row++) {
          const entryIndex = (((col + row) % entryCount) + entryCount) % entryCount;
          const entry = layout.entries[entryIndex];

          const cx = col * stepX + bbox.width / 2;
          const cy = row * stepY + (((col % 2) + 2) % 2 === 1 ? stepY / 2 : 0) + bbox.height / 2;

          // Tiles are hex-masked (transparent outside the hex); the BLEED enlargement
          // overlaps neighbours so the fractional vertical step leaves no sliver.
          if (hasSquish) {
            cctx.save();
            cctx.translate(cx, cy);
            cctx.transform(1, 0, 0, scaleY, 0, 0); // preview squish about the cell centre
            cctx.drawImage(
              atlas,
              entry.x, entry.y, bbox.width, bbox.height,
              -bbox.width / 2 - BLEED, -bbox.height / 2 - BLEED, dw, dh,
            );
            cctx.restore();
          } else {
            cctx.drawImage(
              atlas,
              entry.x, entry.y, bbox.width, bbox.height,
              cx - bbox.width / 2 - BLEED, cy - bbox.height / 2 - BLEED, dw, dh,
            );
          }
        }
      }

      cctx.restore(); // end skew shear

      // Stage 2 — one scale of the gap-free composite onto the visible canvas.
      // imageSmoothingEnabled is the user-facing "Smooth seams" toggle: on = soft
      // (anti-aliased) edges, off = crisp. Either way the source has no background
      // between hexes, so neither leaks.
      canvas.width = W;
      canvas.height = H;
      ctx.imageSmoothingEnabled = smoothSeams;
      ctx.fillStyle = '#1c1c1e';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(composite, 0, 0, compositeW, compositeH, 0, 0, W, H);
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
  }, [canvasRef, tileTypes, hexConfig, editor, layout, smoothSeams]);
}
