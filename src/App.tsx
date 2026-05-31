import { useEffect, useMemo } from 'react';
import { useAppState } from './hooks/useAppState';
import { useDraggableColumns } from './hooks/useDraggableColumns';
import { hexBBox } from './lib/hexGeometry';
import { computeAtlasLayout } from './lib/atlasLayout';
import { TileTypeList } from './components/TileTypeList';
import { HexConfigPanel } from './components/HexConfigPanel';
import { RenderPreviewPanel } from './components/RenderPreviewPanel';
import { TileEditor } from './components/TileEditor';
import { AtlasPreview } from './components/AtlasPreview';
import { ExportButton } from './components/ExportButton';
import { ConfirmClearDialog } from './components/ConfirmClearDialog';

export function App() {
  const {
    state,
    setHexConfig,
    confirmHexConfigChange,
    cancelHexConfigChange,
    addTile,
    removeTile,
    renameTile,
    setActiveTile,
    commitPixels,
    setTool,
    setColor,
    setZoom,
    setBrushSize,
    setBrushShape,
    setBrushAntiAlias,
    setCrispEdges,
    setEditorBgColor,
    setPreviewSquishY,
    undo,
    redo,
  } = useAppState();

  const { hexConfig, tileTypes, editor, pendingHexConfig } = state;
  const { leftWidth, rightWidth, onLeftDividerDown, onRightDividerDown, layoutProps } = useDraggableColumns();

  const activeTile = tileTypes.find(t => t.id === editor.activeTileId) ?? null;
  const bbox = hexBBox(hexConfig);
  const layout = useMemo(
    () => computeAtlasLayout(tileTypes, bbox),
    [tileTypes, bbox]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const gridTemplate = `${leftWidth}px 4px 1fr 4px ${rightWidth}px`;

  return (
    <div className="app-layout" style={{ gridTemplateColumns: gridTemplate }} {...layoutProps}>
      <aside className="sidebar sidebar--left">
        <TileTypeList
          tileTypes={tileTypes}
          activeTileId={editor.activeTileId}
          hexConfig={hexConfig}
          onSelect={setActiveTile}
          onAdd={addTile}
          onRemove={removeTile}
          onRename={renameTile}
        />
        <HexConfigPanel
          hexConfig={hexConfig}
          onChange={setHexConfig}
        />
      </aside>
      <div className="column-divider" onPointerDown={onLeftDividerDown} />

      <main className="editor-area">
        <TileEditor
          tile={activeTile}
          hexConfig={hexConfig}
          editor={editor}
          onCommitPixels={commitPixels}
          onColorPick={setColor}
          onPushUndo={() => {}}
          onToolChange={setTool}
          onColorChange={setColor}
          onZoomChange={setZoom}
          onBrushSizeChange={setBrushSize}
          onBrushShapeChange={setBrushShape}
          onBrushAntiAliasChange={setBrushAntiAlias}
          onEditorBgColorChange={setEditorBgColor}
          onCrispEdgesChange={setCrispEdges}
          onUndo={undo}
          onRedo={redo}
          canUndo={state.undoStack.some(e =>
            e.type === 'configClear' || e.tileId === editor.activeTileId
          )}
          canRedo={state.redoStack.some(e =>
            e.type === 'configClear' || e.tileId === editor.activeTileId
          )}
        />
      </main>
      <div className="column-divider" onPointerDown={onRightDividerDown} />

      <aside className="sidebar sidebar--right">
        <RenderPreviewPanel
          hexConfig={hexConfig}
          editor={editor}
          onSkewChange={v => setHexConfig({ skewX: v })}
          onPreviewSquishYChange={setPreviewSquishY}
        />
        <AtlasPreview
          tileTypes={tileTypes}
          hexConfig={hexConfig}
          editor={editor}
          layout={layout}
        />
        <ExportButton
          tileTypes={tileTypes}
          hexConfig={hexConfig}
          layout={layout}
        />
      </aside>

      {pendingHexConfig && (
        <ConfirmClearDialog
          onConfirm={confirmHexConfigChange}
          onCancel={cancelHexConfigChange}
        />
      )}
    </div>
  );
}
