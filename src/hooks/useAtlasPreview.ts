import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { TileType, HexConfig, EditorState, AtlasLayout } from '../types';
import { hexBBox, hexPath2D } from '../lib/hexGeometry';

export function useAtlasPreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  tileTypes: TileType[],
  hexConfig: HexConfig,
  editor: EditorState,
  layout: AtlasLayout
): void {
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layout.atlasWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bbox = hexBBox(hexConfig);

    const LABEL_MARGIN = 22; // px below tile bottom for name text
    canvas.width = layout.atlasWidth;
    canvas.height = layout.atlasHeight + LABEL_MARGIN;

    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, layout.atlasWidth, layout.atlasHeight + LABEL_MARGIN);

    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
    }
    offscreenRef.current.width = bbox.width;
    offscreenRef.current.height = bbox.height;
    const offCtx = offscreenRef.current.getContext('2d');
    if (!offCtx) return;

    const skewX = editor.previewSkew ? hexConfig.skewX : 0;
    const squishY = editor.previewSquishY;
    const designSquishY = hexConfig.squishY;
    const scaleY = designSquishY === 0 ? 1 : squishY / designSquishY;
    const hasTransform = editor.previewSkew || Math.abs(scaleY - 1) > 0.001;

    for (const entry of layout.entries) {
      const tile = tileTypes.find(t => t.id === entry.tileId);
      if (!tile) continue;

      offCtx.clearRect(0, 0, bbox.width, bbox.height);
      offCtx.putImageData(
        new ImageData(new Uint8ClampedArray(tile.pixels), bbox.width, bbox.height),
        0, 0
      );

      const cx = entry.x + bbox.width / 2;
      const cy = entry.y + bbox.height / 2;

      if (hasTransform) {
        const clipPath = hexPath2D(hexConfig, cx, cy, { skewX, squishY });
        ctx.save();
        ctx.clip(clipPath);
        ctx.translate(cx, cy);
        ctx.transform(1, 0, skewX, scaleY, 0, 0);
        ctx.drawImage(offscreenRef.current, -bbox.width / 2, -bbox.height / 2);
        ctx.restore();
        ctx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke(clipPath);
      } else {
        const clipPath = hexPath2D(hexConfig, cx, cy);
        ctx.save();
        ctx.clip(clipPath);
        ctx.drawImage(offscreenRef.current, entry.x, entry.y);
        ctx.restore();
        ctx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke(clipPath);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(entry.tileName, cx, entry.y + bbox.height + 10);
    }
  }, [canvasRef, tileTypes, hexConfig, editor, layout]);
}
