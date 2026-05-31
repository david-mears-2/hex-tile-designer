import { useRef } from 'react';
import type { TileType, HexConfig, EditorState, AtlasLayout } from '../types';
import { useTessellationPreview } from '../hooks/useAtlasPreview';

interface Props {
  tileTypes: TileType[];
  hexConfig: HexConfig;
  editor: EditorState;
  layout: AtlasLayout;
}

export function AtlasPreview({ tileTypes, hexConfig, editor, layout }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useTessellationPreview(canvasRef, tileTypes, hexConfig, editor, layout);

  return (
    <section className="panel panel--atlas">
      <h2 className="panel__title">Tessellation preview</h2>
      <div className="atlas-preview__scroll">
        {layout.atlasWidth > 0 ? (
          <canvas
            ref={canvasRef}
            style={{ display: 'block', maxWidth: '100%' }}
          />
        ) : (
          <p className="panel__note">No tiles yet</p>
        )}
      </div>
    </section>
  );
}
