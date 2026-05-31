import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { TileType, HexConfig, EditorState, UndoEntry } from '../types';
import { hexBBox, hexPath2D, isInsideHex } from '../lib/hexGeometry';
import { paintPixel, getPixel, parseColor, rgbaToHex, floodFill } from '../lib/pixelPainter';

interface UseEditorCanvasOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  tile: TileType | null;
  hexConfig: HexConfig;
  editor: EditorState;
  onCommitPixels: (tileId: string, pixels: Uint8ClampedArray, prevPixels: Uint8ClampedArray) => void;
  onColorPick: (color: string) => void;
  onPushUndo: (entry: UndoEntry) => void;
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const size = 4;
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) ? '#cccccc' : '#aaaaaa';
      ctx.fillRect(x, y, size, size);
    }
  }
}

function renderCanvas(
  canvas: HTMLCanvasElement,
  tile: TileType | null,
  hexConfig: HexConfig,
  offscreen: HTMLCanvasElement
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const bbox = hexBBox(hexConfig);
  const { width, height } = bbox;
  const cx = width / 2;
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, width, height);

  const hexPath = hexPath2D(hexConfig, cx, cy);

  ctx.save();
  ctx.clip(hexPath);
  drawCheckerboard(ctx, width, height);

  if (tile) {
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      const imageData = new ImageData(new Uint8ClampedArray(tile.pixels), width, height);
      offCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(offscreen, 0, 0);
    }
  }

  ctx.restore();

  ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
  ctx.lineWidth = 1;
  ctx.stroke(hexPath);
}

export function useEditorCanvas({
  canvasRef,
  tile,
  hexConfig,
  editor,
  onCommitPixels,
  onColorPick,
  onPushUndo: _onPushUndo,
}: UseEditorCanvasOptions): void {
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const prevPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const workingPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const lastPointRef = useRef<[number, number] | null>(null);
  const isDownRef = useRef(false);

  // Keep offscreen canvas in sync with bbox
  useEffect(() => {
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
    }
    const bbox = hexBBox(hexConfig);
    offscreenRef.current.width = bbox.width;
    offscreenRef.current.height = bbox.height;
  }, [hexConfig]);

  // Re-render canvas whenever tile or config changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenRef.current;
    if (!canvas || !offscreen) return;
    renderCanvas(canvas, tile, hexConfig, offscreen);
  }, [canvasRef, tile, hexConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bbox = hexBBox(hexConfig);
    const { width, height } = bbox;

    function toNative(cssX: number, cssY: number): [number, number] {
      const rect = canvas!.getBoundingClientRect();
      const x = Math.floor((cssX - rect.left) / editor.zoom);
      const y = Math.floor((cssY - rect.top) / editor.zoom);
      return [Math.max(0, Math.min(width - 1, x)), Math.max(0, Math.min(height - 1, y))];
    }

    function paintAt(pixels: Uint8ClampedArray, x: number, y: number): void {
      const br = editor.brushSize - 1; // radius in pixels (0 = single pixel)
      const color: [number, number, number, number] =
        editor.activeTool === 'eraser' ? [0, 0, 0, 0] : parseColor(editor.activeColor);
      for (let dy = -br; dy <= br; dy++) {
        for (let dx = -br; dx <= br; dx++) {
          if (dx * dx + dy * dy > br * br) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (!isInsideHex(nx, ny, hexConfig)) continue;
          paintPixel(pixels, width, nx, ny, ...color);
        }
      }
    }

    function paintLine(
      pixels: Uint8ClampedArray,
      x0: number, y0: number,
      x1: number, y1: number
    ): void {
      // Bresenham's line
      let dx = Math.abs(x1 - x0);
      let dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      let x = x0;
      let y = y0;
      while (true) {
        paintAt(pixels, x, y);
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
      }
    }

    function redrawCanvas(pixels: Uint8ClampedArray): void {
      const offscreen = offscreenRef.current;
      if (!offscreen || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const hexPath = hexPath2D(hexConfig, cx, cy);

      ctx.save();
      ctx.clip(hexPath);
      drawCheckerboard(ctx, width, height);

      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
        offCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(offscreen, 0, 0);
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke(hexPath);
    }

    function onPointerDown(e: PointerEvent): void {
      if (!tile) return;
      canvas!.setPointerCapture(e.pointerId);
      isDownRef.current = true;

      const [x, y] = toNative(e.clientX, e.clientY);
      lastPointRef.current = [x, y];

      if (editor.activeTool === 'picker') {
        const [r, g, b] = getPixel(tile.pixels, width, x, y);
        onColorPick(rgbaToHex(r, g, b));
        return;
      }

      if (editor.activeTool === 'fill') {
        const [fr, fg, fb, fa] = parseColor(editor.activeColor);
        const newPixels = floodFill(tile.pixels, width, height, x, y, fr, fg, fb, fa, hexConfig);
        onCommitPixels(tile.id, newPixels, tile.pixels);
        return;
      }

      // pencil / eraser: start stroke
      prevPixelsRef.current = tile.pixels.slice() as Uint8ClampedArray;
      workingPixelsRef.current = tile.pixels.slice() as Uint8ClampedArray;
      paintAt(workingPixelsRef.current, x, y);
      redrawCanvas(workingPixelsRef.current);
    }

    function onPointerMove(e: PointerEvent): void {
      if (!isDownRef.current || !workingPixelsRef.current || !tile) return;
      if (editor.activeTool !== 'pencil' && editor.activeTool !== 'eraser') return;

      const [x, y] = toNative(e.clientX, e.clientY);
      const [lx, ly] = lastPointRef.current ?? [x, y];
      lastPointRef.current = [x, y];

      paintLine(workingPixelsRef.current, lx, ly, x, y);
      redrawCanvas(workingPixelsRef.current);
    }

    function onPointerUp(): void {
      if (!isDownRef.current) return;
      isDownRef.current = false;

      if (
        workingPixelsRef.current &&
        prevPixelsRef.current &&
        tile &&
        (editor.activeTool === 'pencil' || editor.activeTool === 'eraser')
      ) {
        onCommitPixels(tile.id, workingPixelsRef.current, prevPixelsRef.current);
      }

      workingPixelsRef.current = null;
      prevPixelsRef.current = null;
      lastPointRef.current = null;
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [canvasRef, tile, hexConfig, editor, onCommitPixels, onColorPick]);
}
