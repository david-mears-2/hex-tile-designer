import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TilePreviewCanvas } from './TilePreviewCanvas';
import { hexBBox } from '../lib/hexGeometry';

const hexConfig = { radius: 32, squishY: 0.75, skewX: 0 };
const bbox = hexBBox(hexConfig);

function makeTile(fill = 0) {
  const pixels = new Uint8ClampedArray(bbox.width * bbox.height * 4);
  if (fill) pixels.fill(fill);
  return { id: 'test', name: 'Test', pixels };
}

describe('TilePreviewCanvas', () => {
  it('renders a canvas element', () => {
    const { container } = render(<TilePreviewCanvas tile={makeTile()} hexConfig={hexConfig} />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('canvas native size matches hexBBox', () => {
    const { container } = render(<TilePreviewCanvas tile={makeTile()} hexConfig={hexConfig} />);
    const canvas = container.querySelector('canvas')!;
    expect(Number(canvas.getAttribute('width'))).toBe(bbox.width);
    expect(Number(canvas.getAttribute('height'))).toBe(bbox.height);
  });

  it('updates canvas dimensions when hexConfig changes', () => {
    const smallConfig = { radius: 16, squishY: 0.75, skewX: 0 };
    const smallBbox = hexBBox(smallConfig);
    const smallPixels = new Uint8ClampedArray(smallBbox.width * smallBbox.height * 4);
    const { container, rerender } = render(
      <TilePreviewCanvas tile={{ id: 't', name: 'T', pixels: smallPixels }} hexConfig={smallConfig} />
    );
    const canvas = container.querySelector('canvas')!;
    expect(Number(canvas.getAttribute('width'))).toBe(smallBbox.width);

    const bigConfig = { radius: 48, squishY: 0.75, skewX: 0 };
    const bigBbox = hexBBox(bigConfig);
    const bigPixels = new Uint8ClampedArray(bigBbox.width * bigBbox.height * 4);
    rerender(<TilePreviewCanvas tile={{ id: 't', name: 'T', pixels: bigPixels }} hexConfig={bigConfig} />);
    expect(Number(canvas.getAttribute('width'))).toBe(bigBbox.width);
  });

  it('re-renders without error when tile pixels change', () => {
    const tile = makeTile(0);
    const { rerender } = render(<TilePreviewCanvas tile={tile} hexConfig={hexConfig} />);
    const updatedTile = { ...tile, pixels: makeTile(128).pixels };
    expect(() => rerender(<TilePreviewCanvas tile={updatedTile} hexConfig={hexConfig} />)).not.toThrow();
  });
});
