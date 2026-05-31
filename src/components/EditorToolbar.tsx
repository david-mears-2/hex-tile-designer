import type { ToolType } from '../types';

const TOOLS: { tool: ToolType; label: string; title: string }[] = [
  { tool: 'pencil', label: '✏', title: 'Pencil' },
  { tool: 'fill', label: '🪣', title: 'Fill' },
  { tool: 'eraser', label: '⬜', title: 'Eraser' },
  { tool: 'picker', label: '💉', title: 'Colour picker' },
];

interface Props {
  activeTool: ToolType;
  activeColor: string;
  zoom: number;
  canUndo: boolean;
  onToolChange: (t: ToolType) => void;
  onColorChange: (c: string) => void;
  onZoomChange: (z: number) => void;
  onUndo: () => void;
}

export function EditorToolbar({ activeTool, activeColor, zoom, canUndo, onToolChange, onColorChange, onZoomChange, onUndo }: Props) {
  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar__tools">
        {TOOLS.map(({ tool, label, title }) => (
          <button
            key={tool}
            className={`tool-btn${activeTool === tool ? ' tool-btn--active' : ''}`}
            title={title}
            onClick={() => onToolChange(tool)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="editor-toolbar__color" title="Active colour">
        <input
          type="color"
          value={activeColor}
          onChange={e => onColorChange(e.target.value)}
        />
        <span className="editor-toolbar__color-swatch" style={{ background: activeColor }} />
      </label>
      <button
        className="tool-btn"
        title="Undo (Ctrl+Z)"
        onClick={onUndo}
        disabled={!canUndo}
      >
        ↩
      </button>
      <div className="editor-toolbar__zoom">
        <button className="zoom-btn" onClick={() => onZoomChange(zoom - 1)} disabled={zoom <= 1}>−</button>
        <span className="zoom-label">{zoom}×</span>
        <button className="zoom-btn" onClick={() => onZoomChange(zoom + 1)} disabled={zoom >= 24}>+</button>
      </div>
    </div>
  );
}
