import * as React from 'react';
import { SavedPreset, TileDataProvider, TileStudioConfig } from '../../models/types';
import { applyPreset, createTile, exportConfig, parseImport } from '../../models/config';
import { MAX_IMPORT_BYTES } from './constants';
import { messageFromError } from './helpers';

interface Dependencies {
  config: TileStudioConfig;
  configRef: React.MutableRefObject<TileStudioConfig>;
  change: (patch: Partial<TileStudioConfig>) => void;
  dataProvider?: TileDataProvider;
  alive: React.MutableRefObject<boolean>;
  checkpoint: (description: string) => void;
  setSelectedId: React.Dispatch<React.SetStateAction<string>>;
  setNotice: React.Dispatch<React.SetStateAction<string>>;
}

export interface PresetsEditorState {
  presetName: string;
  setPresetName: React.Dispatch<React.SetStateAction<string>>;
  importText: string;
  setImportText: React.Dispatch<React.SetStateAction<string>>;
  editImportText: (text: string) => void;
  pendingImport: TileStudioConfig | undefined;
  setPendingImport: React.Dispatch<React.SetStateAction<TileStudioConfig | undefined>>;
  importError: string;
  setImportError: React.Dispatch<React.SetStateAction<string>>;
  sharedPresets: SavedPreset[];
  loadingShared: boolean;
  sharedError: string;
  setSharedError: React.Dispatch<React.SetStateAction<string>>;
  choosePreset: (preset: SavedPreset) => void;
  savePreset: () => void;
  downloadConfig: () => void;
  importConfig: (text: string) => void;
  readImportFile: (file?: File) => Promise<void>;
  confirmImport: () => void;
  loadSharedPresets: () => Promise<void>;
  updateSharedPresetSource: (patch: Partial<TileStudioConfig['sharedPresetSource']>) => void;
  downloadSharedPreset: () => void;
}

export const usePresetsEditor = ({ config, configRef, change, dataProvider, alive, checkpoint, setSelectedId, setNotice }: Dependencies): PresetsEditorState => {
  const [presetName, setPresetName] = React.useState('');
  const [importText, setImportText] = React.useState('');
  const [pendingImport, setPendingImport] = React.useState<TileStudioConfig>();
  const [importError, setImportError] = React.useState('');
  const [sharedPresets, setSharedPresets] = React.useState<SavedPreset[]>([]);
  const [loadingShared, setLoadingShared] = React.useState(false);
  const [sharedError, setSharedError] = React.useState('');
  const sharedRequest = React.useRef(0);
  const importReadRequest = React.useRef(0);
  React.useEffect(() => {
    sharedRequest.current += 1;
    setSharedPresets([]); setSharedError(''); setLoadingShared(false);
  }, [config.sharedPresetSource.enabled, config.sharedPresetSource.siteUrl, config.sharedPresetSource.listId]);

  const loadSharedPresets = async (): Promise<void> => {
    if (!dataProvider?.getSharedPresets) return;
    const sequence = ++sharedRequest.current;
    const source = { ...configRef.current.sharedPresetSource };
    setLoadingShared(true); setSharedError(''); setSharedPresets([]);
    try {
      const presets = await dataProvider.getSharedPresets(source);
      if (alive.current && sequence === sharedRequest.current) setSharedPresets(presets);
    } catch (error) { if (alive.current && sequence === sharedRequest.current) setSharedError(messageFromError(error)); }
    finally { if (alive.current && sequence === sharedRequest.current) setLoadingShared(false); }
  };

  const choosePreset = (preset: SavedPreset): void => {
    change(applyPreset(configRef.current, preset)); setNotice(`${preset.name} applied. Your content is preserved.`);
  };
  const savePreset = (): void => {
    const name = presetName.trim();
    if (!name || configRef.current.savedPresets.length >= 20) return;
    if (configRef.current.savedPresets.some((preset) => preset.name.toLowerCase() === name.toLowerCase())) { setNotice('A saved preset already has this name. Choose another name.'); return; }
    change({ savedPresets: [...configRef.current.savedPresets, { id: createTile().id, name, design: { ...configRef.current.design, composition: { ...configRef.current.design.composition } }, responsive: { ...configRef.current.responsive } }] });
    setPresetName(''); setNotice(`Saved ${name} in this web part.`);
  };
  const downloadConfig = (): void => {
    const blob = new Blob([exportConfig(configRef.current)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'tile-studio-configuration.json';
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Configuration exported.');
  };
  const importConfig = (text: string): void => {
    setPendingImport(undefined);
    setImportError('');
    try {
      if (new Blob([text]).size > MAX_IMPORT_BYTES) throw new Error('Choose a configuration smaller than 1 MiB.');
      const imported = parseImport(text);
      setPendingImport(imported); setImportError(''); setNotice('Configuration validated. Review the summary and confirm replacement.');
    } catch (error) { setImportError(messageFromError(error)); }
  };
  const readImportFile = async (file?: File): Promise<void> => {
    if (!file) return;
    const sequence = ++importReadRequest.current;
    setPendingImport(undefined);
    if (file.size > MAX_IMPORT_BYTES) { setImportError('Choose a configuration smaller than 1 MiB.'); return; }
    try { const text = await file.text(); if (alive.current && sequence === importReadRequest.current) { setImportText(text); setPendingImport(undefined); setImportError(''); } }
    catch (error) { if (alive.current && sequence === importReadRequest.current) setImportError(messageFromError(error)); }
  };
  const editImportText = (text: string): void => {
    importReadRequest.current += 1;
    setImportText(text);
    setPendingImport(undefined);
    setImportError('');
  };
  const confirmImport = (): void => {
    if (!pendingImport) return;
    checkpoint('Configuration replacement');
    change(pendingImport);
    setSelectedId(pendingImport.tiles[0]?.id || '');
    setImportText(''); setPendingImport(undefined); setImportError('');
    setNotice('Configuration replaced. You can undo this change before publishing.');
  };

  const updateSharedPresetSource = (patch: Partial<TileStudioConfig['sharedPresetSource']>): void => {
    change({ sharedPresetSource: { ...configRef.current.sharedPresetSource, ...patch } });
  };
  const downloadSharedPreset = (): void => {
    const data = JSON.stringify({ design: configRef.current.design, responsive: configRef.current.responsive }, undefined, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'tile-studio-shared-preset.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  React.useEffect(() => () => { sharedRequest.current += 1; importReadRequest.current += 1; }, []);
  return {
    presetName, setPresetName, importText, setImportText, editImportText, pendingImport, setPendingImport,
    importError, setImportError, sharedPresets, loadingShared, sharedError, setSharedError,
    choosePreset, savePreset, downloadConfig, importConfig, readImportFile, confirmImport,
    loadSharedPresets, updateSharedPresetSource, downloadSharedPreset
  };
};
