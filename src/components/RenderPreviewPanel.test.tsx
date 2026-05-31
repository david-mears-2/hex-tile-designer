import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RenderPreviewPanel } from './RenderPreviewPanel';
import type { EditorState } from '../types';

const hexConfig = { radius: 32, squishY: 0.75, skewX: 0 };

const editor: EditorState = {
  activeTileId: null,
  activeTool: 'pencil',
  activeColor: '#3a7bd5',
  zoom: 5,
  brushSize: 1,
  previewSquishY: 0.75,
};

describe('RenderPreviewPanel reset buttons', () => {
  it('reset skew X button calls onSkewChange(0)', () => {
    const onSkewChange = vi.fn();
    render(
      <RenderPreviewPanel
        hexConfig={{ ...hexConfig, skewX: 0.5 }}
        editor={editor}
        onSkewChange={onSkewChange}
        onPreviewSquishYChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /reset skew x/i }));
    expect(onSkewChange).toHaveBeenCalledWith(0);
  });

  it('reset preview squish Y button calls onPreviewSquishYChange with design squishY', () => {
    const onPreviewSquishYChange = vi.fn();
    render(
      <RenderPreviewPanel
        hexConfig={hexConfig}
        editor={{ ...editor, previewSquishY: 1.2 }}
        onSkewChange={vi.fn()}
        onPreviewSquishYChange={onPreviewSquishYChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /reset preview squish y/i }));
    expect(onPreviewSquishYChange).toHaveBeenCalledWith(hexConfig.squishY);
  });

  it('skew reset is disabled when skewX is 0', () => {
    render(
      <RenderPreviewPanel
        hexConfig={hexConfig}
        editor={editor}
        onSkewChange={vi.fn()}
        onPreviewSquishYChange={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /reset skew x/i })).toBeDisabled();
  });

  it('squish reset is disabled when previewSquishY matches design squishY', () => {
    render(
      <RenderPreviewPanel
        hexConfig={hexConfig}
        editor={editor}
        onSkewChange={vi.fn()}
        onPreviewSquishYChange={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /reset preview squish y/i })).toBeDisabled();
  });

  it('skew reset is enabled when skewX is non-zero', () => {
    render(
      <RenderPreviewPanel
        hexConfig={{ ...hexConfig, skewX: 0.3 }}
        editor={editor}
        onSkewChange={vi.fn()}
        onPreviewSquishYChange={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /reset skew x/i })).not.toBeDisabled();
  });

  it('squish reset is enabled when previewSquishY differs from design squishY', () => {
    render(
      <RenderPreviewPanel
        hexConfig={hexConfig}
        editor={{ ...editor, previewSquishY: 1.0 }}
        onSkewChange={vi.fn()}
        onPreviewSquishYChange={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /reset preview squish y/i })).not.toBeDisabled();
  });
});
