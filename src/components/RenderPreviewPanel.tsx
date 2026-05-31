import type { HexConfig, EditorState } from '../types';

interface Props {
  hexConfig: HexConfig;
  editor: EditorState;
  onSkewChange: (v: number) => void;
  onPreviewSquishYChange: (v: number) => void;
}

export function RenderPreviewPanel({
  hexConfig,
  editor,
  onSkewChange,
  onPreviewSquishYChange,
}: Props) {
  const squishAtDefault = Math.abs(editor.previewSquishY - hexConfig.squishY) < 0.001;

  return (
    <section className="panel">
      <h2 className="panel__title">Render preview</h2>
      <p className="panel__note">Display only — does not affect stored pixels</p>

      <div className="control-row">
        <div className="control-row__label">
          <span>Skew X <strong>{hexConfig.skewX.toFixed(2)}</strong></span>
          <button
            className="reset-btn"
            aria-label="Reset skew X"
            disabled={hexConfig.skewX === 0}
            onClick={() => onSkewChange(0)}
          >↺</button>
        </div>
        <input
          type="range" min={-1.0} max={1.0} step={0.01}
          value={hexConfig.skewX}
          aria-label="Skew X"
          onChange={e => onSkewChange(Number(e.target.value))}
        />
      </div>

      <div className="control-row">
        <div className="control-row__label">
          <span>Preview squish Y <strong>{editor.previewSquishY.toFixed(2)}</strong></span>
          <button
            className="reset-btn"
            aria-label="Reset preview squish Y"
            disabled={squishAtDefault}
            onClick={() => onPreviewSquishYChange(hexConfig.squishY)}
          >↺</button>
        </div>
        <input
          type="range" min={0.3} max={1.5} step={0.01}
          value={editor.previewSquishY}
          aria-label="Preview squish Y"
          onChange={e => onPreviewSquishYChange(Number(e.target.value))}
        />
      </div>
      <p className="panel__note">
        Design squish: {hexConfig.squishY.toFixed(2)}
        {squishAtDefault ? ' (matching)' : ''}
      </p>
    </section>
  );
}
