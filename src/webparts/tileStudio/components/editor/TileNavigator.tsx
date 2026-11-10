import * as React from 'react';
import { TileIcon } from '../TileIcon';
import type { EditorController } from './useEditorController';
import styles from '../StudioEditor.module.scss';

interface Props { editor: EditorController; }
/** Tile selection and accessible ordering controls. */
export const TileNavigator: React.FC<Props> = ({ editor }) => {
  const { config, selectedId, setSelectedId, setDeleteId, dragId, setDragId, dragOverId, setDragOverId, id, moveTile, addTile } = editor;
  return (
            <div className={styles.tileSidebar}>
              <div className={styles.sidebarHeader}><h4>Your tiles <span>{config.tiles.length}</span></h4><button id={id('add-tile')} type="button" className={styles.textButton} onClick={addTile} disabled={config.tiles.length >= 100}>+ Add tile</button></div>
              <p className={styles.hint}>Drag the grip to reorder, or use the arrow buttons.</p>
              <ol className={styles.tileList} aria-label="Tile order">
                {config.tiles.map((tile, index) => <li key={tile.id} className={`${styles.tileRow} ${tile.id === selectedId ? styles.selectedTile : ''} ${dragOverId === tile.id && dragId !== tile.id ? styles.dropTarget : ''}`} onDragOver={(event) => { if (dragId) { event.preventDefault(); setDragOverId(tile.id); event.dataTransfer.dropEffect = 'move'; } }} onDrop={(event) => { event.preventDefault(); if (dragId) moveTile(dragId, index); setDragId(undefined); setDragOverId(undefined); }}>
                  <span className={styles.dragHandle} draggable title="Drag to reorder" aria-hidden="true" onDragStart={(event) => { setDragId(tile.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tile.id); }} onDragEnd={() => { setDragId(undefined); setDragOverId(undefined); }}>⠿</span>
                  <button type="button" className={styles.tileSelect} aria-pressed={tile.id === selectedId} onClick={() => { setSelectedId(tile.id); setDeleteId(undefined); }}><span className={styles.smallIcon}><TileIcon name={tile.icon} size={18} /></span><span>{tile.title || 'Untitled tile'}{!tile.visible && <small>Hidden</small>}</span></button>
                  <span className={styles.reorderButtons}><button type="button" className={styles.iconButton} aria-label={`Move ${tile.title || 'untitled tile'} up`} disabled={index === 0} onClick={() => moveTile(tile.id, index - 1)}>↑</button><button type="button" className={styles.iconButton} aria-label={`Move ${tile.title || 'untitled tile'} down`} disabled={index === config.tiles.length - 1} onClick={() => moveTile(tile.id, index + 1)}>↓</button></span>
                </li>)}
              </ol>
              {config.tiles.length === 0 && <div className={styles.emptyState}><TileIcon name="apps" size={28} /><p>Add your first tile to start designing.</p><button type="button" className={styles.primaryButton} onClick={addTile}>Add a tile</button></div>}
              {config.tiles.length >= 100 && <p className={styles.hint}>This web part supports up to 100 manual tiles.</p>}
            </div>
  );
};
