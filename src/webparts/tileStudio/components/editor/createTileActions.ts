import { CompositionSettings, Tile, TileAppearance, TileStudioConfig } from '../../models/types';
import { createTile } from '../../models/config';
import * as React from 'react';

interface Dependencies {
  configRef: React.MutableRefObject<TileStudioConfig>;
  selectedId: string;
  deleteId?: string;
  change: (patch: Partial<TileStudioConfig>) => void;
  setSelectedId: React.Dispatch<React.SetStateAction<string>>;
  setDeleteId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setNotice: React.Dispatch<React.SetStateAction<string>>;
  focusAfterUpdate: (id: string) => void;
}

export interface TileActions {
  editTile: (patch: Partial<Tile>) => void;
  editAppearance: (patch: Partial<TileAppearance>) => void;
  editTileComposition: (patch: Partial<CompositionSettings>) => void;
  moveTile: (tileId: string, to: number) => void;
  addTile: () => void;
  duplicateTile: () => void;
  removeTile: () => void;
}

/** Stateless tile commands; SharePoint's editor session owns selection and lifecycle. */
export const createTileActions = ({ configRef, selectedId, deleteId, change, setSelectedId, setDeleteId, setNotice, focusAfterUpdate }: Dependencies): TileActions => {
  const editTile = (patch: Partial<Tile>): void => change({ tiles: configRef.current.tiles.map((tile) => tile.id === selectedId ? { ...tile, ...patch } : tile) });
  const editAppearance = (patch: Partial<TileAppearance>): void => {
    const currentSelected = configRef.current.tiles.find(tile => tile.id === selectedId);
    if (!currentSelected) return;
    editTile({ appearance: { ...currentSelected.appearance, ...patch } });
  };
  const editTileComposition = (patch: Partial<CompositionSettings>): void => {
    const currentSelected = configRef.current.tiles.find(tile => tile.id === selectedId);
    if (!currentSelected) return;
    const composition = { ...(currentSelected.appearance.composition || {}) };
    (Object.keys(patch) as (keyof CompositionSettings)[]).forEach(key => {
      if (patch[key] === undefined) delete composition[key];
      else (composition as Record<string, unknown>)[key] = patch[key];
    });
    editAppearance({ composition });
  };
  const moveTile = (tileId: string, to: number): void => {
    const from = configRef.current.tiles.findIndex((tile) => tile.id === tileId);
    if (from < 0 || to < 0 || to >= configRef.current.tiles.length || from === to) return;
    const tiles = [...configRef.current.tiles];
    const [moved] = tiles.splice(from, 1); tiles.splice(to, 0, moved);
    change({ tiles }); setNotice(`${moved.title || 'Tile'} moved to position ${to + 1}.`);
  };
  const addTile = (): void => {
    if (configRef.current.tiles.length >= 100) return;
    const tile = createTile(); change({ tiles: [...configRef.current.tiles, tile] }); setSelectedId(tile.id); setDeleteId(undefined); setNotice('New tile added.'); focusAfterUpdate('tile-title');
  };
  const duplicateTile = (): void => {
    const original = configRef.current.tiles.find(tile => tile.id === selectedId);
    if (!original || configRef.current.tiles.length >= 100) return;
    const copy = { ...original, id: createTile().id, title: `${original.title || 'Tile'} copy`.slice(0, 120) };
    const tiles = [...configRef.current.tiles]; tiles.splice(tiles.findIndex((tile) => tile.id === original.id) + 1, 0, copy);
    change({ tiles }); setSelectedId(copy.id); setNotice('Tile duplicated.'); focusAfterUpdate('tile-title');
  };
  const removeTile = (): void => {
    const index = configRef.current.tiles.findIndex((tile) => tile.id === deleteId);
    const tiles = configRef.current.tiles.filter((tile) => tile.id !== deleteId);
    change({ tiles }); setSelectedId(tiles[Math.max(0, index - 1)] ? tiles[Math.max(0, index - 1)].id : ''); setDeleteId(undefined); setNotice('Tile removed.'); focusAfterUpdate(tiles.length ? 'tile-title' : 'add-tile');
  };
  return { editTile, editAppearance, editTileComposition, moveTile, addTile, duplicateTile, removeTile };
};
