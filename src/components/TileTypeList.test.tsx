import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TileTypeList } from './TileTypeList';
import type { TileType, HexConfig } from '../types';

const hexConfig: HexConfig = { radius: 32, squishY: 0.75, skewX: 0 };

function makeTile(id: string, name: string): TileType {
  return { id, name, pixels: new Uint8ClampedArray(4) };
}

function renderList(tiles: TileType[], overrides: Partial<Parameters<typeof TileTypeList>[0]> = {}) {
  const props = {
    tileTypes: tiles,
    activeTileId: tiles[0]?.id ?? null,
    hexConfig,
    onSelect: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onRename: vi.fn(),
    ...overrides,
  };
  render(<TileTypeList {...props} />);
  return props;
}

describe('TileTypeList', () => {
  it('renders every tile name', () => {
    renderList([makeTile('a', 'Grass'), makeTile('b', 'Water')]);
    expect(screen.getByText('Grass')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('double-click then Enter commits a trimmed rename', () => {
    const { onRename } = renderList([makeTile('a', 'Grass')]);
    fireEvent.doubleClick(screen.getByText('Grass'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  Meadow  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('a', 'Meadow');
  });

  it('rejects a duplicate rename and flags the input', () => {
    const { onRename } = renderList([makeTile('a', 'Grass'), makeTile('b', 'Water')]);
    fireEvent.doubleClick(screen.getByText('Water'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Grass' } });
    expect(input).toHaveClass('tile-list__rename--error');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).not.toHaveBeenCalled();
  });

  it('Escape cancels editing without renaming', () => {
    const { onRename } = renderList([makeTile('a', 'Grass')]);
    fireEvent.doubleClick(screen.getByText('Grass'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Meadow' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('disables remove when only one tile remains', () => {
    renderList([makeTile('a', 'Grass')]);
    expect(screen.getByRole('button', { name: /remove grass/i })).toBeDisabled();
  });

  it('remove button calls onRemove for the right tile', () => {
    const { onRemove } = renderList([makeTile('a', 'Grass'), makeTile('b', 'Water')]);
    fireEvent.click(screen.getByRole('button', { name: /remove water/i }));
    expect(onRemove).toHaveBeenCalledWith('b');
  });

  it('add button calls onAdd', () => {
    const { onAdd } = renderList([makeTile('a', 'Grass')]);
    fireEvent.click(screen.getByRole('button', { name: /add tile/i }));
    expect(onAdd).toHaveBeenCalled();
  });
});
