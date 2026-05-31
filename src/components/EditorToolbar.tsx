import type { ToolType, BrushShape } from '../types';

const TOOLS: { tool: ToolType; label: string; title: string }[] = [
  { tool: 'pencil', label: '✏', title: 'Pencil' },
  { tool: 'fill', label: '🪣', title: 'Fill' },
  { tool: 'eraser', label: '⬜', title: 'Eraser' },
  { tool: 'picker', label: '💉', title: 'Colour picker' },
];

// Dot diameters (px) shown inside each brush size button
const BRUSH_DOTS = [2, 5, 8, 11, 15];

const BRUSH_SHAPES: { shape: BrushShape; label: string; title: string }[] = [
  { shape: 'circle',  label: '●', title: 'Circle brush'  },
  { shape: 'square',  label: '■', title: 'Square brush'  },
  { shape: 'diamond', label: '◆', title: 'Diamond brush' },
];

interface Props {
  activeTool: ToolType;
  activeColor: string;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  brushSize: number;
  brushShape: BrushShape;
  onToolChange: (t: ToolType) => void;
  onColorChange: (c: string) => void;
  onZoomChange: (z: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onBrushSizeChange: (s: number) => void;
  onBrushShapeChange: (s: BrushShape) => void;
}

export function EditorToolbar({
  activeTool, activeColor, zoom, canUndo, canRedo, brushSize, brushShape,
  onToolChange, onColorChange, onZoomChange, onUndo, onRedo, onBrushSizeChange, onBrushShapeChange,
}: Props) {
  const showBrush = activeTool === 'pencil' || activeTool === 'eraser';

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

      {showBrush && (
        <div className="brush-shape-group" title="Brush shape">
          {BRUSH_SHAPES.map(({ shape, label, title }) => (
            <button
              key={shape}
              className={`brush-btn${brushShape === shape ? ' brush-btn--active' : ''}`}
              title={title}
              onClick={() => onBrushShapeChange(shape)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {showBrush && <div className="toolbar-sep" aria-hidden="true" />}

      {showBrush && (
        <div className="brush-size-group" title="Brush size">
          {BRUSH_DOTS.map((dotPx, i) => {
            const size = i + 1;
            return (
              <button
                key={size}
                className={`brush-btn${brushSize === size ? ' brush-btn--active' : ''}`}
                title={`Brush size ${size}`}
                onClick={() => onBrushSizeChange(size)}
              >
                <span style={{
                  display: 'block',
                  width: dotPx,
                  height: dotPx,
                  borderRadius: '50%',
                  background: 'currentColor',
                  flexShrink: 0,
                }} />
              </button>
            );
          })}
        </div>
      )}

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
      <button
        className="tool-btn"
        title="Redo (Ctrl+Y)"
        onClick={onRedo}
        disabled={!canRedo}
      >
        ↪
      </button>
      <div className="editor-toolbar__zoom">
        <button className="zoom-btn" onClick={() => onZoomChange(zoom - 1)} disabled={zoom <= 1}>−</button>
        <span className="zoom-label">{zoom}×</span>
        <button className="zoom-btn" onClick={() => onZoomChange(zoom + 1)} disabled={zoom >= 24}>+</button>
      </div>
    </div>
  );
}
