import { useCallback, useRef, useState } from 'react';

const MIN_W = 200;
const MAX_W = 600;
const clamp = (v: number) => Math.max(MIN_W, Math.min(MAX_W, v));

export function useDraggableColumns(defaultLeft = 300, defaultRight = 300) {
  const [leftWidth, setLeftWidth] = useState(defaultLeft);
  const [rightWidth, setRightWidth] = useState(defaultRight);

  const dragging = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const raf = useRef(0);

  const onLeftDividerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = 'left';
    startX.current = e.clientX;
    startWidth.current = leftWidth;
  }, [leftWidth]);

  const onRightDividerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = 'right';
    startX.current = e.clientX;
    startWidth.current = rightWidth;
  }, [rightWidth]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const side = dragging.current;
    const next = clamp(startWidth.current + (side === 'left' ? dx : -dx));
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      if (side === 'left') setLeftWidth(next);
      else setRightWidth(next);
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  return {
    leftWidth,
    rightWidth,
    onLeftDividerDown,
    onRightDividerDown,
    layoutProps: { onPointerMove, onPointerUp } as React.HTMLAttributes<HTMLDivElement>,
  };
}
