import { useState } from 'react';
import type { TileType, HexConfig, AtlasLayout } from '../types';
import { exportAtlas } from '../lib/exportAtlas';

interface Props {
  tileTypes: TileType[];
  hexConfig: HexConfig;
  layout: AtlasLayout;
}

export function ExportButton({ tileTypes, hexConfig, layout }: Props) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (layout.atlasWidth === 0) return;
    setExporting(true);
    try {
      await exportAtlas(tileTypes, hexConfig, layout);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      className="btn btn--primary btn--full"
      onClick={handleExport}
      disabled={exporting || layout.atlasWidth === 0}
    >
      {exporting ? 'Exporting…' : 'Export PNG + JSON'}
    </button>
  );
}
