import { useRef } from 'react';
import type { TileType, HexConfig, EditorState, UndoEntry } from '../types';
import { hexBBox } from '../lib/hexGeometry';
import { useEditorCanvas } from '../hooks/useEditorCanvas';
import { EditorToolbar } from './EditorToolbar';
import type { ToolType } from '../types';

interface Props {
  tile: TileType | null;
  hexConfig: HexConfig;
  editor: EditorState;
  onCommitPixels: (tileId: string, pixels: Uint8ClampedArray, prevPixels: Uint8ClampedArray) => void;
  onColorPick: (color: string) => void;
  onPushUndo: (entry: UndoEntry) => void;
  onToolChange: (t: ToolType) => void;
  onColorChange: (c: string) => void;
  onZoomChange: (z: number) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export function TileEditor({
  tile,
  hexConfig,
  editor,
  onCommitPixels,
  onColorPick,
  onPushUndo,
  onToolChange,
  onColorChange,
  onZoomChange,
  onUndo,
  canUndo,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bbox = hexBBox(hexConfig);

  useEditorCanvas({
    canvasRef,
    tile,
    hexConfig,
    editor,
    onCommitPixels,
    onColorPick,
    onPushUndo,
  });

  return (
    <div className="tile-editor">
      <EditorToolbar
        activeTool={editor.activeTool}
        activeColor={editor.activeColor}
        zoom={editor.zoom}
        canUndo={canUndo}
        onToolChange={onToolChange}
        onColorChange={onColorChange}
        onZoomChange={onZoomChange}
        onUndo={onUndo}
      />
      <div className="tile-editor__canvas-wrapper">
        {tile ? (
          <canvas
            ref={canvasRef}
            width={bbox.width}
            height={bbox.height}
            style={{
              width: bbox.width * editor.zoom,
              height: bbox.height * editor.zoom,
              imageRendering: 'pixelated',
              cursor: editor.activeTool === 'picker' ? 'crosshair' : 'default',
            }}
          />
        ) : (
          <p className="tile-editor__empty">Select a tile to edit</p>
        )}
      </div>
    </div>
  );
}
