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
  return (
    <section className="panel">
      <h2 className="panel__title">Render preview</h2>
      <p className="panel__note">Display only — does not affect stored pixels</p>

      <label className="control-row">
        <span className="control-row__label">
          Skew X <strong>{hexConfig.skewX.toFixed(2)}</strong>
        </span>
        <input
          type="range" min={-1.0} max={1.0} step={0.01}
          value={hexConfig.skewX}
          onChange={e => onSkewChange(Number(e.target.value))}
        />
      </label>

      <label className="control-row">
        <span className="control-row__label">
          Preview squish Y <strong>{editor.previewSquishY.toFixed(2)}</strong>
        </span>
        <input
          type="range" min={0.3} max={1.5} step={0.01}
          value={editor.previewSquishY}
          onChange={e => onPreviewSquishYChange(Number(e.target.value))}
        />
      </label>
      <p className="panel__note">
        Design squish: {hexConfig.squishY.toFixed(2)}
        {Math.abs(editor.previewSquishY - hexConfig.squishY) < 0.01 ? ' (matching)' : ''}
      </p>
    </section>
  );
}
