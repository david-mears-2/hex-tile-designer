import { useRef, useEffect } from 'react';
import type { TileType, HexConfig } from '../types';
import { hexBBox, hexPath2D } from '../lib/hexGeometry';

const DISPLAY_WIDTH = 40; // CSS px

interface Props {
  tile: TileType;
  hexConfig: HexConfig;
}

export function TilePreviewCanvas({ tile, hexConfig }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bbox = hexBBox(hexConfig);
    const { width, height } = bbox;
    const cx = width / 2;
    const cy = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#2a2a2e';
    ctx.fillRect(0, 0, width, height);

    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
    offscreenRef.current.width = width;
    offscreenRef.current.height = height;
    const offCtx = offscreenRef.current.getContext('2d');
    if (!offCtx) return;

    const hexPath = hexPath2D(hexConfig, cx, cy);

    ctx.save();
    ctx.clip(hexPath);
    offCtx.putImageData(new ImageData(new Uint8ClampedArray(tile.pixels), width, height), 0, 0);
    ctx.drawImage(offscreenRef.current, 0, 0);
    ctx.restore();

    ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke(hexPath);
  }, [tile, hexConfig]);

  const bbox = hexBBox(hexConfig);
  const displayHeight = Math.round(bbox.height * DISPLAY_WIDTH / bbox.width);

  return (
    <canvas
      ref={canvasRef}
      width={bbox.width}
      height={bbox.height}
      style={{
        width: DISPLAY_WIDTH,
        height: displayHeight,
        imageRendering: 'pixelated',
        flexShrink: 0,
        borderRadius: 3,
      }}
    />
  );
}
