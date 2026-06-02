import { useRef, useState } from 'react';
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
  // View-only preference (not part of the tile design, not exported/undoable):
  // toggles anti-aliasing of the final upscale — soft vs. crisp hex seams.
  const [smoothSeams, setSmoothSeams] = useState(true);

  useTessellationPreview(canvasRef, tileTypes, hexConfig, editor, layout, smoothSeams);

  return (
    <section className="panel panel--atlas">
      <h2 className="panel__title">Tessellation preview</h2>
      <label className="control-row control-row--checkbox">
        <input
          type="checkbox"
          checked={smoothSeams}
          onChange={e => setSmoothSeams(e.target.checked)}
        />
        <span>Smooth seams</span>
      </label>
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
