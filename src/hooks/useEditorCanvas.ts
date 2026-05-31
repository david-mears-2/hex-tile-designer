import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { TileType, HexConfig, EditorState, UndoEntry } from '../types';
import { hexBBox, hexPath2D, isInsideHex } from '../lib/hexGeometry';
import { paintPixel, getPixel, parseColor, rgbaToHex, floodFill, getBrushOffsets, getBrushCoverage } from '../lib/pixelPainter';

interface UseEditorCanvasOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  tile: TileType | null;
  hexConfig: HexConfig;
  editor: EditorState;
  onCommitPixels: (tileId: string, pixels: Uint8ClampedArray, prevPixels: Uint8ClampedArray) => void;
  onColorPick: (color: string) => void;
  onPushUndo: (entry: UndoEntry) => void;
}

const CHECKER_LIGHT = 204; // #cccccc
const CHECKER_DARK  = 170; // #aaaaaa
const CHECKER_SIZE  = 4;

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  for (let y = 0; y < h; y += CHECKER_SIZE) {
    for (let x = 0; x < w; x += CHECKER_SIZE) {
      ctx.fillStyle = ((Math.floor(x / CHECKER_SIZE) + Math.floor(y / CHECKER_SIZE)) % 2 === 0)
        ? '#cccccc' : '#aaaaaa';
      ctx.fillRect(x, y, CHECKER_SIZE, CHECKER_SIZE);
    }
  }
}

// Builds a pixel-perfect RGBA buffer: checkerboard composited with tile pixels, masked
// to the hex boundary. Pixels outside the hex stay at alpha=0, revealing the dark
// background drawn on the main canvas before drawImage is called.
function drawContentCrisp(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray | null,
  hexConfig: HexConfig,
  width: number,
  height: number,
  offscreen: HTMLCanvasElement
): void {
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const buf = new ImageData(width, height); // initialised to all-zero (transparent)
  const d = buf.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isInsideHex(x, y, hexConfig)) continue; // stays transparent → dark bg shows

      const i = (y * width + x) * 4;
      const cb = ((Math.floor(x / CHECKER_SIZE) + Math.floor(y / CHECKER_SIZE)) % 2 === 0)
        ? CHECKER_LIGHT : CHECKER_DARK;

      if (pixels && pixels[i + 3] > 0) {
        // Alpha-composite tile over checkerboard
        const a = pixels[i + 3] / 255;
        d[i]     = Math.round(pixels[i]     * a + cb * (1 - a));
        d[i + 1] = Math.round(pixels[i + 1] * a + cb * (1 - a));
        d[i + 2] = Math.round(pixels[i + 2] * a + cb * (1 - a));
      } else {
        d[i] = d[i + 1] = d[i + 2] = cb;
      }
      d[i + 3] = 255;
    }
  }

  offCtx.putImageData(buf, 0, 0);
  ctx.drawImage(offscreen, 0, 0);
  // No stroke: the hard pixel boundary against the dark background is the edge
}

function renderCanvas(
  canvas: HTMLCanvasElement,
  tile: TileType | null,
  hexConfig: HexConfig,
  offscreen: HTMLCanvasElement,
  crispEdges: boolean
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

  if (crispEdges) {
    drawContentCrisp(ctx, tile?.pixels ?? null, hexConfig, width, height, offscreen);
  } else {
    const hexPath = hexPath2D(hexConfig, cx, cy);
    ctx.save();
    ctx.clip(hexPath);
    drawCheckerboard(ctx, width, height);
    if (tile) {
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.putImageData(new ImageData(new Uint8ClampedArray(tile.pixels), width, height), 0, 0);
        ctx.drawImage(offscreen, 0, 0);
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
    ctx.lineWidth = 1;
    ctx.stroke(hexPath);
  }
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
  // Per-stroke max coverage reached at each pixel, used for anti-aliased brushes.
  const coverageMaskRef = useRef<Float32Array | null>(null);
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

  // Re-render canvas whenever tile, config, or crisp mode changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenRef.current;
    if (!canvas || !offscreen) return;
    renderCanvas(canvas, tile, hexConfig, offscreen, editor.crispEdges);
  }, [canvasRef, tile, hexConfig, editor.crispEdges]);

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
      if (editor.brushAntiAlias) {
        paintAtAA(pixels, x, y);
        return;
      }
      const color: [number, number, number, number] =
        editor.activeTool === 'eraser' ? [0, 0, 0, 0] : parseColor(editor.activeColor);
      for (const [dx, dy] of getBrushOffsets(editor.brushSize, editor.brushShape)) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (!isInsideHex(nx, ny, hexConfig)) continue;
        paintPixel(pixels, width, nx, ny, ...color);
      }
    }

    // Anti-aliased stamp: feathers curved edges via fractional coverage. To avoid
    // edge buildup where stamps overlap during a drag, coverage is tracked as a
    // per-stroke maximum and every affected pixel is recomposited from the
    // pre-stroke pixels rather than from the running buffer.
    function paintAtAA(pixels: Uint8ClampedArray, x: number, y: number): void {
      const prev = prevPixelsRef.current;
      const mask = coverageMaskRef.current;
      if (!prev || !mask) return;
      const isEraser = editor.activeTool === 'eraser';
      const [sr, sg, sb] = isEraser ? [0, 0, 0] : parseColor(editor.activeColor);

      for (const [dx, dy, stampCov] of getBrushCoverage(editor.brushSize, editor.brushShape)) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (!isInsideHex(nx, ny, hexConfig)) continue;
        const p = ny * width + nx;
        if (stampCov <= mask[p]) continue; // already painted at >= this coverage
        mask[p] = stampCov;

        const i = p * 4;
        const da = prev[i + 3] / 255;
        if (isEraser) {
          pixels[i] = prev[i];
          pixels[i + 1] = prev[i + 1];
          pixels[i + 2] = prev[i + 2];
          pixels[i + 3] = Math.round(da * (1 - stampCov) * 255);
        } else {
          const outA = stampCov + da * (1 - stampCov);
          if (outA <= 0) {
            pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 0;
          } else {
            pixels[i]     = Math.round((sr * stampCov + prev[i]     * da * (1 - stampCov)) / outA);
            pixels[i + 1] = Math.round((sg * stampCov + prev[i + 1] * da * (1 - stampCov)) / outA);
            pixels[i + 2] = Math.round((sb * stampCov + prev[i + 2] * da * (1 - stampCov)) / outA);
            pixels[i + 3] = Math.round(outA * 255);
          }
        }
      }
    }

    function paintLine(
      pixels: Uint8ClampedArray,
      x0: number, y0: number,
      x1: number, y1: number
    ): void {
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

      if (editor.crispEdges) {
        drawContentCrisp(ctx, pixels, hexConfig, width, height, offscreen);
      } else {
        const cx = width / 2;
        const cy = height / 2;
        const hexPath = hexPath2D(hexConfig, cx, cy);
        ctx.save();
        ctx.clip(hexPath);
        drawCheckerboard(ctx, width, height);
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
          ctx.drawImage(offscreen, 0, 0);
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke(hexPath);
      }
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

      prevPixelsRef.current = tile.pixels.slice() as Uint8ClampedArray;
      workingPixelsRef.current = tile.pixels.slice() as Uint8ClampedArray;
      coverageMaskRef.current = new Float32Array(width * height);
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
      coverageMaskRef.current = null;
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
