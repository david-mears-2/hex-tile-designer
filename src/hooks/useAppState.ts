import { useReducer, useEffect, useCallback } from 'react';
import type { HexConfig, TileType, EditorState, ToolType, UndoEntry } from '../types';
import { hexBBox } from '../lib/hexGeometry';
import { saveState, loadState } from '../lib/storage';

const DEFAULT_HEX_CONFIG: HexConfig = { radius: 32, squishY: 0.75, skewX: 0 };

function makeBlankTile(name: string, pixelCount: number): TileType {
  return {
    id: crypto.randomUUID(),
    name,
    pixels: new Uint8ClampedArray(pixelCount),
  };
}

function defaultEditorState(squishY: number): EditorState {
  return {
    activeTileId: null,
    activeTool: 'pencil',
    activeColor: '#3a7bd5',
    zoom: 5,
    brushSize: 1,
    previewSquishY: squishY,
  };
}

interface State {
  hexConfig: HexConfig;
  tileTypes: TileType[];
  editor: EditorState;
  undoStack: UndoEntry[];
  pendingHexConfig: HexConfig | null;
}

type Action =
  | { type: 'SET_HEX_CONFIG_IMMEDIATE'; config: HexConfig }
  | { type: 'REQUEST_HEX_CONFIG_CHANGE'; config: HexConfig }
  | { type: 'CANCEL_HEX_CONFIG_CHANGE' }
  | { type: 'CONFIRM_HEX_CONFIG_CHANGE' }
  | { type: 'ADD_TILE' }
  | { type: 'REMOVE_TILE'; id: string }
  | { type: 'RENAME_TILE'; id: string; name: string }
  | { type: 'SET_ACTIVE_TILE'; id: string | null }
  | { type: 'COMMIT_PIXELS'; tileId: string; pixels: Uint8ClampedArray; prevPixels: Uint8ClampedArray }
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'SET_COLOR'; color: string }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_BRUSH_SIZE'; size: number }
  | { type: 'SET_PREVIEW_SQUISH_Y'; value: number }
  | { type: 'UNDO' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_HEX_CONFIG_IMMEDIATE':
      return { ...state, hexConfig: action.config };

    case 'REQUEST_HEX_CONFIG_CHANGE':
      return { ...state, pendingHexConfig: action.config };

    case 'CANCEL_HEX_CONFIG_CHANGE':
      return { ...state, pendingHexConfig: null };

    case 'CONFIRM_HEX_CONFIG_CHANGE': {
      if (!state.pendingHexConfig) return state;
      const newConfig = state.pendingHexConfig;
      const newBbox = hexBBox(newConfig);
      const pixelCount = newBbox.width * newBbox.height * 4;

      const prevPixelsByTile: Record<string, Uint8ClampedArray> = {};
      for (const tile of state.tileTypes) {
        prevPixelsByTile[tile.id] = tile.pixels;
      }

      const undoEntry: UndoEntry = {
        type: 'configClear',
        prevConfig: state.hexConfig,
        prevPixelsByTile,
      };

      return {
        ...state,
        hexConfig: newConfig,
        pendingHexConfig: null,
        tileTypes: state.tileTypes.map(t => ({
          ...t,
          pixels: new Uint8ClampedArray(pixelCount),
        })),
        editor: {
          ...state.editor,
          previewSquishY: newConfig.squishY,
        },
        undoStack: [undoEntry, ...state.undoStack].slice(0, 50),
      };
    }

    case 'ADD_TILE': {
      const bbox = hexBBox(state.hexConfig);
      const existingNames = new Set(state.tileTypes.map(t => t.name));
      let n = state.tileTypes.length + 1;
      while (existingNames.has(`Tile ${n}`)) n++;
      const tile = makeBlankTile(`Tile ${n}`, bbox.width * bbox.height * 4);
      const active = state.editor.activeTileId;
      return {
        ...state,
        tileTypes: [...state.tileTypes, tile],
        editor: { ...state.editor, activeTileId: active ?? tile.id },
      };
    }

    case 'REMOVE_TILE': {
      const remaining = state.tileTypes.filter(t => t.id !== action.id);
      const newActive = state.editor.activeTileId === action.id
        ? (remaining[0]?.id ?? null)
        : state.editor.activeTileId;
      return {
        ...state,
        tileTypes: remaining,
        editor: { ...state.editor, activeTileId: newActive },
      };
    }

    case 'RENAME_TILE': {
      const duplicate = state.tileTypes.some(t => t.id !== action.id && t.name === action.name);
      if (duplicate) return state;
      return {
        ...state,
        tileTypes: state.tileTypes.map(t =>
          t.id === action.id ? { ...t, name: action.name } : t
        ),
      };
    }

    case 'SET_ACTIVE_TILE':
      return { ...state, editor: { ...state.editor, activeTileId: action.id } };

    case 'COMMIT_PIXELS': {
      const undoEntry: UndoEntry = {
        type: 'paint',
        tileId: action.tileId,
        prevPixels: action.prevPixels,
      };
      return {
        ...state,
        tileTypes: state.tileTypes.map(t =>
          t.id === action.tileId ? { ...t, pixels: action.pixels } : t
        ),
        undoStack: [undoEntry, ...state.undoStack].slice(0, 50),
      };
    }

    case 'SET_TOOL':
      return { ...state, editor: { ...state.editor, activeTool: action.tool } };

    case 'SET_COLOR':
      return { ...state, editor: { ...state.editor, activeColor: action.color } };

    case 'SET_ZOOM':
      return { ...state, editor: { ...state.editor, zoom: Math.max(1, Math.min(24, action.zoom)) } };

    case 'SET_BRUSH_SIZE':
      return { ...state, editor: { ...state.editor, brushSize: action.size } };

    case 'SET_PREVIEW_SQUISH_Y':
      return { ...state, editor: { ...state.editor, previewSquishY: action.value } };

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const [entry, ...rest] = state.undoStack;

      if (entry.type === 'paint') {
        return {
          ...state,
          undoStack: rest,
          tileTypes: state.tileTypes.map(t =>
            t.id === entry.tileId ? { ...t, pixels: entry.prevPixels } : t
          ),
        };
      }

      if (entry.type === 'configClear') {
        const prevBbox = hexBBox(entry.prevConfig);
        const fallbackPixels = new Uint8ClampedArray(prevBbox.width * prevBbox.height * 4);
        return {
          ...state,
          undoStack: rest,
          hexConfig: entry.prevConfig,
          tileTypes: state.tileTypes.map(t => ({
            ...t,
            pixels: entry.prevPixelsByTile[t.id] ?? fallbackPixels,
          })),
          editor: {
            ...state.editor,
            previewSquishY: entry.prevConfig.squishY,
          },
        };
      }

      return state;
    }

    default:
      return state;
  }
}

function buildInitialState(): State {
  const saved = loadState();
  if (saved) {
    const firstId = saved.tileTypes[0]?.id ?? null;
    return {
      hexConfig: saved.hexConfig,
      tileTypes: saved.tileTypes,
      editor: {
        ...defaultEditorState(saved.hexConfig.squishY),
        activeTileId: firstId,
        activeColor: saved.activeColor,
        activeTool: saved.activeTool,
      },
      undoStack: [],
      pendingHexConfig: null,
    };
  }

  const bbox = hexBBox(DEFAULT_HEX_CONFIG);
  const pixelCount = bbox.width * bbox.height * 4;
  const tiles = ['Grass', 'Water', 'Dirt'].map(name => makeBlankTile(name, pixelCount));
  return {
    hexConfig: DEFAULT_HEX_CONFIG,
    tileTypes: tiles,
    editor: { ...defaultEditorState(DEFAULT_HEX_CONFIG.squishY), activeTileId: tiles[0].id },
    undoStack: [],
    pendingHexConfig: null,
  };
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveState(state.hexConfig, state.tileTypes, state.editor.activeColor, state.editor.activeTool);
    }, 500);
    return () => clearTimeout(timer);
  }, [state.hexConfig, state.tileTypes, state.editor.activeColor, state.editor.activeTool]);

  const setHexConfig = useCallback((patch: Partial<HexConfig>) => {
    const newConfig = { ...state.hexConfig, ...patch };
    const prevBbox = hexBBox(state.hexConfig);
    const newBbox = hexBBox(newConfig);
    if (newBbox.width !== prevBbox.width || newBbox.height !== prevBbox.height) {
      dispatch({ type: 'REQUEST_HEX_CONFIG_CHANGE', config: newConfig });
    } else {
      dispatch({ type: 'SET_HEX_CONFIG_IMMEDIATE', config: newConfig });
    }
  }, [state.hexConfig]);

  const confirmHexConfigChange = useCallback(() => dispatch({ type: 'CONFIRM_HEX_CONFIG_CHANGE' }), []);
  const cancelHexConfigChange = useCallback(() => dispatch({ type: 'CANCEL_HEX_CONFIG_CHANGE' }), []);
  const addTile = useCallback(() => dispatch({ type: 'ADD_TILE' }), []);
  const removeTile = useCallback((id: string) => dispatch({ type: 'REMOVE_TILE', id }), []);
  const renameTile = useCallback((id: string, name: string) => dispatch({ type: 'RENAME_TILE', id, name }), []);
  const setActiveTile = useCallback((id: string | null) => dispatch({ type: 'SET_ACTIVE_TILE', id }), []);

  const commitPixels = useCallback(
    (tileId: string, pixels: Uint8ClampedArray, prevPixels: Uint8ClampedArray) =>
      dispatch({ type: 'COMMIT_PIXELS', tileId, pixels, prevPixels }),
    []
  );

  const setTool = useCallback((tool: ToolType) => dispatch({ type: 'SET_TOOL', tool }), []);
  const setColor = useCallback((color: string) => dispatch({ type: 'SET_COLOR', color }), []);
  const setZoom = useCallback((zoom: number) => dispatch({ type: 'SET_ZOOM', zoom }), []);
  const setBrushSize = useCallback((size: number) => dispatch({ type: 'SET_BRUSH_SIZE', size }), []);
  const setPreviewSquishY = useCallback((value: number) => dispatch({ type: 'SET_PREVIEW_SQUISH_Y', value }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);

  return {
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
    setPreviewSquishY,
    undo,
  };
}
