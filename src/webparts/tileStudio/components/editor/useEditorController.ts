import * as React from 'react';
import { DEFAULT_THEME } from '../../models/config';
import { checkTileContrast, ContrastIssue } from '../../models/colorContrast';
import { TileStudioConfig, ThemeTokens, TileDataProvider, Tile } from '../../models/types';
import { searchSettings, SettingLocation } from '../../models/settingsSearch';
import { EditorTab, StudioEditorProps } from './types';
import { TABS } from './constants';
import { textOnAccent } from './helpers';
import { useEditorDraft, EditorDraft } from './useEditorDraft';
import { useEditorHistory, EditorHistory } from './useEditorHistory';
import { createTileActions, TileActions } from './createTileActions';
import { useSourceEditor, SourceEditorState } from './useSourceEditor';
import { usePresetsEditor, PresetsEditorState } from './usePresetsEditor';

/** Stable, strongly typed contract consumed by the native editor sections. */
export interface EditorController extends EditorDraft, EditorHistory, TileActions, SourceEditorState, PresetsEditorState {
  config: TileStudioConfig;
  theme: ThemeTokens;
  dataProvider?: TileDataProvider;
  currentSiteUrl: string;
  instanceId: string;
  id: (name: string) => string;
  tab: EditorTab;
  setTab: React.Dispatch<React.SetStateAction<EditorTab>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedId: string;
  setSelectedId: React.Dispatch<React.SetStateAction<string>>;
  dragId: string | undefined;
  setDragId: React.Dispatch<React.SetStateAction<string | undefined>>;
  dragOverId: string | undefined;
  setDragOverId: React.Dispatch<React.SetStateAction<string | undefined>>;
  deleteId: string | undefined;
  setDeleteId: React.Dispatch<React.SetStateAction<string | undefined>>;
  notice: string;
  setNotice: React.Dispatch<React.SetStateAction<string>>;
  focusSetting: SettingLocation | undefined;
  setFocusSetting: React.Dispatch<React.SetStateAction<SettingLocation | undefined>>;
  foundSettings: SettingLocation[];
  selected: Tile | undefined;
  focusAfterUpdate: (name: string) => void;
  keyTabs: (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => void;
  sectionContrast: ContrastIssue[];
  tileContrast: ContrastIssue[];
  rootStyle: React.CSSProperties;
}

export const useEditorController = ({ config, onChange, dataProvider, currentSiteUrl, theme = DEFAULT_THEME, instanceId, initialUiState, onUiStateChange }: StudioEditorProps): EditorController => {
  const [tab, setTab] = React.useState<EditorTab>(initialUiState?.tab || 'content');
  const [search, setSearch] = React.useState(initialUiState?.search || '');
  const [selectedId, setSelectedId] = React.useState(initialUiState?.selectedId || (config.tiles[0] ? config.tiles[0].id : ''));
  const [dragId, setDragId] = React.useState<string | undefined>();
  const [dragOverId, setDragOverId] = React.useState<string | undefined>();
  const [deleteId, setDeleteId] = React.useState<string | undefined>();
  const [notice, setNotice] = React.useState('');
  const [focusSetting, setFocusSetting] = React.useState<SettingLocation>();
  const alive = React.useRef(true);
  const { configRef, change, design, composition, responsive } = useEditorDraft(config, onChange);
  const { undoConfig, undoDescription, checkpoint, undoLast } = useEditorHistory(configRef, change, setNotice);
  const sourceEditor = useSourceEditor({ config, configRef, change, dataProvider, currentSiteUrl, alive });
  const presetsEditor = usePresetsEditor({ config, configRef, change, dataProvider, alive, checkpoint, setSelectedId, setNotice });
  const prefix = `${instanceId}-studio`;
  const id = (name: string): string => `${prefix}-${name}`;
  const foundSettings = searchSettings(search).filter(item => !item.mode || item.mode === config.source.mode);

  const selected = config.tiles.find((tile) => tile.id === selectedId);
  const focusAfterUpdate = (name: string): void => { window.requestAnimationFrame(() => { if (alive.current) document.getElementById(id(name))?.focus(); }); };
  const tileActions = createTileActions({ configRef, selectedId, deleteId, change, setSelectedId, setDeleteId, setNotice, focusAfterUpdate });
  const { source, siteInput, updateSiteInput, lists, fields, loadingLists, loadingFields, checking, connectionError, setConnectionError, fieldsError, connectionResult, setFieldRetry, loadLists, checkConnection } = sourceEditor;
  const { presetName, setPresetName, importText, setImportText, editImportText, pendingImport, setPendingImport, importError, setImportError, sharedPresets, loadingShared, sharedError, setSharedError, choosePreset, savePreset, downloadConfig, importConfig, readImportFile, confirmImport, loadSharedPresets, updateSharedPresetSource, downloadSharedPreset } = presetsEditor;
  const { editTile, editAppearance, editTileComposition, moveTile, addTile, duplicateTile, removeTile } = tileActions;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!focusSetting || focusSetting.tab !== tab) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`${instanceId}-studio-${focusSetting.id}`);
      if (!target) { setFocusSetting(undefined); return; }
      // Opening collapsed groups is essential to true field-level navigation.
      let parent = target.closest('details');
      while (parent) { parent.open = true; parent = parent.parentElement?.closest('details') || null; }
      target.scrollIntoView?.({ block: 'nearest' });
      target.focus();
      setFocusSetting(undefined);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusSetting, tab, instanceId]);
  React.useEffect(() => { onUiStateChange?.({ tab, selectedId, search }); }, [tab, selectedId, search, onUiStateChange]);
  React.useEffect(() => {
    if (!config.tiles.some((tile) => tile.id === selectedId)) setSelectedId(config.tiles[0] ? config.tiles[0].id : '');
  }, [config.tiles, selectedId]);
  const keyTabs = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault(); setTab(TABS[next].id); document.getElementById(id(`tab-${TABS[next].id}`))?.focus();
  };

  const sectionContrast = checkTileContrast({
    text: config.design.textColor || theme.text,
    muted: config.design.mutedColor || theme.muted,
    accent: config.design.accentColor || theme.accent,
    background: config.design.backgroundColor || theme.surface,
    canvas: theme.surface
  });
  const tileContrast = selected ? checkTileContrast({
    text: selected.textColor || config.design.textColor || theme.text,
    muted: selected.textColor || config.design.mutedColor || theme.muted,
    accent: selected.accentColor || config.design.accentColor || theme.accent,
    background: selected.backgroundColor || config.design.backgroundColor || theme.surface,
    canvas: theme.surface
  }) : [];
  const rootStyle = {
    '--studio-accent': theme.accent, '--studio-surface': theme.surface, '--studio-text': theme.text,
    '--studio-muted': theme.muted, '--studio-border': theme.border, '--studio-subtle': theme.subtle,
    '--studio-on-accent': textOnAccent(theme.accent),
    '--studio-danger': theme.isDark ? '#ffaca7' : '#b42318',
    '--studio-danger-hover': theme.isDark ? '#552525' : '#fef3f2'
  } as React.CSSProperties;

  return {
    config, theme, dataProvider, currentSiteUrl, instanceId, id,
    tab, setTab, search, setSearch, selectedId, setSelectedId,
    dragId, setDragId, dragOverId, setDragOverId, deleteId, setDeleteId,
    notice, setNotice, presetName, setPresetName, importText, setImportText, editImportText,
    pendingImport, setPendingImport, undoConfig, undoDescription, importError, setImportError,
    focusSetting, setFocusSetting, foundSettings, siteInput, updateSiteInput,
    lists, fields, loadingLists, loadingFields,
    checking, connectionError, setConnectionError, fieldsError,
    connectionResult, setFieldRetry, sharedPresets, loadingShared, sharedError, setSharedError,
    configRef, selected, focusAfterUpdate, checkpoint, undoLast, change,
    design, composition, responsive, source, editTile, editAppearance, editTileComposition,
    loadSharedPresets, loadLists, checkConnection, moveTile, addTile, duplicateTile, removeTile,
    choosePreset, savePreset, downloadConfig, importConfig, readImportFile, confirmImport,
    updateSharedPresetSource, downloadSharedPreset,
    keyTabs, sectionContrast, tileContrast, rootStyle
  };
};
