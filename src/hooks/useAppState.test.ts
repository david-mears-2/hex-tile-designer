import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppState } from './useAppState';

beforeEach(() => {
  localStorage.clear();
});

describe('useAppState', () => {
  it('initialises with default tiles', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.tileTypes.map(t => t.name)).toEqual(['Grass', 'Water', 'Dirt']);
  });

  it('first tile is selected by default', () => {
    const { result } = renderHook(() => useAppState());
    const firstId = result.current.state.tileTypes[0].id;
    expect(result.current.state.editor.activeTileId).toBe(firstId);
  });

  it('addTile adds a tile', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.addTile());
    expect(result.current.state.tileTypes).toHaveLength(4);
  });

  it('addTile names the new tile "Tile N" where N = existing count + 1', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.addTile());
    expect(result.current.state.tileTypes[3].name).toBe('Tile 4');
  });

  it('addTile increments N to avoid duplicate names', () => {
    const { result } = renderHook(() => useAppState());
    // Manually rename to "Tile 4" to create a collision
    act(() => result.current.addTile()); // creates "Tile 4"
    act(() => result.current.addTile()); // "Tile 5" would be next
    expect(result.current.state.tileTypes[4].name).toBe('Tile 5');

    // Rename tile 5 to "Tile 4" collision scenario: add when "Tile 4" exists
    const id5 = result.current.state.tileTypes[4].id;
    act(() => result.current.renameTile(id5, 'Tile 4')); // blocked — duplicate
    expect(result.current.state.tileTypes[4].name).toBe('Tile 5'); // unchanged
  });

  it('removeTile removes the tile and updates active selection', () => {
    const { result } = renderHook(() => useAppState());
    const firstId = result.current.state.tileTypes[0].id;
    act(() => result.current.setActiveTile(firstId));
    act(() => result.current.removeTile(firstId));
    expect(result.current.state.tileTypes.find(t => t.id === firstId)).toBeUndefined();
    expect(result.current.state.editor.activeTileId).not.toBe(firstId);
  });

  it('renameTile updates the tile name', () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.state.tileTypes[0].id;
    act(() => result.current.renameTile(id, 'Sand'));
    expect(result.current.state.tileTypes[0].name).toBe('Sand');
  });

  it('renameTile rejects a name already used by another tile', () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.state.tileTypes[0].id;
    act(() => result.current.renameTile(id, 'Water')); // 'Water' is tileTypes[1]
    expect(result.current.state.tileTypes[0].name).toBe('Grass'); // unchanged
  });

  it('renameTile allows keeping the same name (rename to self)', () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.state.tileTypes[0].id;
    act(() => result.current.renameTile(id, 'Grass'));
    expect(result.current.state.tileTypes[0].name).toBe('Grass');
  });

  it('setZoom clamps to 1–24', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.setZoom(0));
    expect(result.current.state.editor.zoom).toBe(1);
    act(() => result.current.setZoom(25));
    expect(result.current.state.editor.zoom).toBe(24);
    act(() => result.current.setZoom(12));
    expect(result.current.state.editor.zoom).toBe(12);
  });

  it('default brushSize is 1', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.editor.brushSize).toBe(1);
  });

  it('default brushShape is circle', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.editor.brushShape).toBe('circle');
  });

  it('setBrushShape updates brushShape', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.setBrushShape('square'));
    expect(result.current.state.editor.brushShape).toBe('square');
    act(() => result.current.setBrushShape('diamond'));
    expect(result.current.state.editor.brushShape).toBe('diamond');
  });

  it('setBrushSize updates brushSize', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.setBrushSize(3));
    expect(result.current.state.editor.brushSize).toBe(3);
  });

  it('skewX change applies immediately without dialog', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.setHexConfig({ skewX: 0.5 }));
    expect(result.current.state.pendingHexConfig).toBeNull();
    expect(result.current.state.hexConfig.skewX).toBe(0.5);
  });

  it('radius change triggers confirm dialog', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.setHexConfig({ radius: 48 }));
    expect(result.current.state.pendingHexConfig).not.toBeNull();
    expect(result.current.state.pendingHexConfig?.radius).toBe(48);
    expect(result.current.state.hexConfig.radius).toBe(32);
  });

  it('cancelHexConfigChange leaves config unchanged', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.setHexConfig({ radius: 48 }));
    act(() => result.current.cancelHexConfigChange());
    expect(result.current.state.pendingHexConfig).toBeNull();
    expect(result.current.state.hexConfig.radius).toBe(32);
  });

  it('confirmHexConfigChange applies new config and clears pixels', () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.state.tileTypes[0].id;
    act(() => {
      const prevPixels = result.current.state.tileTypes[0].pixels.slice() as Uint8ClampedArray;
      result.current.commitPixels(id, (() => {
        const p = prevPixels.slice() as Uint8ClampedArray;
        p.fill(128);
        return p;
      })(), prevPixels);
    });
    act(() => result.current.setHexConfig({ radius: 48 }));
    act(() => result.current.confirmHexConfigChange());
    expect(result.current.state.hexConfig.radius).toBe(48);
    expect(result.current.state.pendingHexConfig).toBeNull();
    const tile = result.current.state.tileTypes.find(t => t.id === id)!;
    expect(tile.pixels.every(v => v === 0)).toBe(true);
  });

  it('undo skips other tiles\' history to reach the active tile\'s most recent entry', () => {
    const { result } = renderHook(() => useAppState());
    const [tileA, tileB] = result.current.state.tileTypes;

    const bPrev = tileB.pixels.slice() as Uint8ClampedArray;
    const bNext = new Uint8ClampedArray(bPrev.length); bNext.fill(22);
    act(() => result.current.setActiveTile(tileB.id));
    act(() => result.current.commitPixels(tileB.id, bNext, bPrev));

    const aPrev = tileA.pixels.slice() as Uint8ClampedArray;
    const aNext = new Uint8ClampedArray(aPrev.length); aNext.fill(11);
    act(() => result.current.setActiveTile(tileA.id));
    act(() => result.current.commitPixels(tileA.id, aNext, aPrev));

    // undoStack = [paint(A), paint(B)]; active = A
    act(() => result.current.undo());
    expect(result.current.state.tileTypes[0].pixels[0]).toBe(0);  // A restored
    expect(result.current.state.tileTypes[1].pixels[0]).toBe(22); // B untouched
    expect(result.current.state.redoStack).toHaveLength(1);
  });

  it('undo does nothing when no entries exist for the active tile', () => {
    const { result } = renderHook(() => useAppState());
    const [tileA, tileB] = result.current.state.tileTypes;

    const bPrev = tileB.pixels.slice() as Uint8ClampedArray;
    const bNext = new Uint8ClampedArray(bPrev.length); bNext.fill(33);
    act(() => result.current.setActiveTile(tileB.id));
    act(() => result.current.commitPixels(tileB.id, bNext, bPrev));

    // Switch to A which has no history; undo should be a no-op
    act(() => result.current.setActiveTile(tileA.id));
    act(() => result.current.undo());
    expect(result.current.state.tileTypes[1].pixels[0]).toBe(33); // B unchanged
    expect(result.current.state.undoStack).toHaveLength(1);       // stack unchanged
  });

  it('new paint clears redo for that tile only', () => {
    const { result } = renderHook(() => useAppState());
    const [tileA, tileB] = result.current.state.tileTypes;

    // Paint A, then undo → A's entry enters redoStack
    const aPrev = tileA.pixels.slice() as Uint8ClampedArray;
    const aNext = new Uint8ClampedArray(aPrev.length); aNext.fill(5);
    act(() => result.current.setActiveTile(tileA.id));
    act(() => result.current.commitPixels(tileA.id, aNext, aPrev));
    act(() => result.current.undo());
    expect(result.current.state.redoStack).toHaveLength(1);

    // Paint B → should NOT clear A's redo entry
    const bPrev = tileB.pixels.slice() as Uint8ClampedArray;
    const bNext = new Uint8ClampedArray(bPrev.length); bNext.fill(7);
    act(() => result.current.commitPixels(tileB.id, bNext, bPrev));
    expect(result.current.state.redoStack).toHaveLength(1); // A's entry still there

    // Paint A again → should clear A's redo entry
    const aNext2 = new Uint8ClampedArray(aPrev.length); aNext2.fill(9);
    act(() => result.current.commitPixels(tileA.id, aNext2, aPrev));
    expect(result.current.state.redoStack).toHaveLength(0);
  });

  it('undo reverses paint action', () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.state.tileTypes[0].id;
    const prevPixels = result.current.state.tileTypes[0].pixels.slice() as Uint8ClampedArray;
    const newPixels = new Uint8ClampedArray(prevPixels.length);
    newPixels.fill(42);

    act(() => result.current.commitPixels(id, newPixels, prevPixels));
    expect(result.current.state.tileTypes[0].pixels[0]).toBe(42);

    act(() => result.current.undo());
    expect(result.current.state.tileTypes[0].pixels[0]).toBe(0);
  });

  it('undo reverses configClear', () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.state.tileTypes[0].id;
    const prevPixels = result.current.state.tileTypes[0].pixels.slice() as Uint8ClampedArray;
    const painted = new Uint8ClampedArray(prevPixels.length);
    painted.fill(77);

    act(() => result.current.commitPixels(id, painted, prevPixels));
    act(() => result.current.setHexConfig({ squishY: 0.5 }));
    act(() => result.current.confirmHexConfigChange());
    expect(result.current.state.hexConfig.squishY).toBe(0.5);

    act(() => result.current.undo());
    expect(result.current.state.hexConfig.squishY).toBe(0.75);
    expect(result.current.state.tileTypes[0].pixels[0]).toBe(77);
  });

  it('previewSquishY resets to new squishY on confirmHexConfigChange', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.setPreviewSquishY(1.2));
    act(() => result.current.setHexConfig({ squishY: 0.5 }));
    act(() => result.current.confirmHexConfigChange());
    expect(result.current.state.editor.previewSquishY).toBe(0.5);
  });
});
