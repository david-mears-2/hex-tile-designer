import { useRef } from 'react';
import type { TileType, HexConfig, EditorState, UndoEntry } from '../types';
import { hexBBox } from '../lib/hexGeometry';
import { useEditorCanvas } from '../hooks/useEditorCanvas';
import { EditorToolbar } from './EditorToolbar';
import type { ToolType, BrushShape } from '../types';

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
  onBrushSizeChange: (s: number) => void;
  onBrushShapeChange: (s: BrushShape) => void;
  onBrushAntiAliasChange: (v: boolean) => void;
  onEditorBgColorChange: (c: string) => void;
  onCrispEdgesChange: (v: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
  onBrushSizeChange,
  onBrushShapeChange,
  onBrushAntiAliasChange,
  onEditorBgColorChange,
  onCrispEdgesChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
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
        canRedo={canRedo}
        crispEdges={editor.crispEdges}
        brushSize={editor.brushSize}
        brushShape={editor.brushShape}
        brushAntiAlias={editor.brushAntiAlias}
        editorBgColor={editor.editorBgColor}
        onToolChange={onToolChange}
        onColorChange={onColorChange}
        onZoomChange={onZoomChange}
        onBrushSizeChange={onBrushSizeChange}
        onBrushShapeChange={onBrushShapeChange}
        onBrushAntiAliasChange={onBrushAntiAliasChange}
        onEditorBgColorChange={onEditorBgColorChange}
        onCrispEdgesChange={onCrispEdgesChange}
        onUndo={onUndo}
        onRedo={onRedo}
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
