import type { HexConfig } from '../types';

interface Props {
  hexConfig: HexConfig;
  onChange: (patch: Partial<HexConfig>) => void;
}

export function HexConfigPanel({ hexConfig, onChange }: Props) {
  return (
    <section className="panel">
      <h2 className="panel__title">Hex config</h2>
      <label className="control-row">
        <span className="control-row__label">Radius <strong>{hexConfig.radius}px</strong></span>
        <input
          type="range" min={8} max={64} step={1}
          value={hexConfig.radius}
          onChange={e => onChange({ radius: Number(e.target.value) })}
        />
      </label>
      <label className="control-row">
        <span className="control-row__label">Squish Y <strong>{hexConfig.squishY.toFixed(2)}</strong></span>
        <input
          type="range" min={0.3} max={1.0} step={0.01}
          value={hexConfig.squishY}
          onChange={e => onChange({ squishY: Number(e.target.value) })}
        />
      </label>
    </section>
  );
}
