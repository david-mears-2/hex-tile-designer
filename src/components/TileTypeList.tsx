import { useState } from 'react';
import type { TileType } from '../types';

interface Props {
  tileTypes: TileType[];
  activeTileId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function TileTypeList({ tileTypes, activeTileId, onSelect, onAdd, onRemove, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  function startEdit(tile: TileType) {
    setEditingId(tile.id);
    setEditingName(tile.name);
  }

  function isDuplicate(id: string, name: string) {
    return tileTypes.some(t => t.id !== id && t.name === name.trim());
  }

  function commitEdit(id: string) {
    const trimmed = editingName.trim();
    if (trimmed && !isDuplicate(id, trimmed)) onRename(id, trimmed);
    setEditingId(null);
  }

  return (
    <section className="panel panel--tiles">
      <h2 className="panel__title">Tiles</h2>
      <ul className="tile-list">
        {tileTypes.map(tile => (
          <li
            key={tile.id}
            className={`tile-list__item${tile.id === activeTileId ? ' tile-list__item--active' : ''}`}
            onClick={() => onSelect(tile.id)}
          >
            {editingId === tile.id ? (
              <input
                className={`tile-list__rename${isDuplicate(tile.id, editingName) ? ' tile-list__rename--error' : ''}`}
                value={editingName}
                autoFocus
                onChange={e => setEditingName(e.target.value)}
                onBlur={() => commitEdit(tile.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit(tile.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="tile-list__name" onDoubleClick={() => startEdit(tile)}>
                {tile.name}
              </span>
            )}
            <button
              className="tile-list__remove"
              onClick={e => { e.stopPropagation(); onRemove(tile.id); }}
              aria-label={`Remove ${tile.name}`}
              disabled={tileTypes.length <= 1}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button className="btn btn--secondary btn--full" onClick={onAdd}>+ Add tile</button>
    </section>
  );
}
