import * as React from 'react';
import { BUILT_IN_PRESETS, LAYOUTS } from '../../models/config';
import { MAX_IMPORT_BYTES } from './constants';
import { Field, Toggle } from '../EditorControls';
import { messageFromError } from './helpers';
import type { EditorController } from './useEditorController';
import styles from '../StudioEditor.module.scss';

interface Props { editor: EditorController; }

export const PresetsSection: React.FC<Props> = ({ editor }) => {
  const { config, theme, id, choosePreset, presetName, setPresetName, savePreset, checkpoint, change, setNotice, focusAfterUpdate, currentSiteUrl, updateSharedPresetSource, downloadSharedPreset, loadingShared, dataProvider, loadSharedPresets, setSharedError, sharedError, sharedPresets, downloadConfig, readImportFile, setImportError, importError, importText, editImportText, pendingImport, confirmImport, setPendingImport, importConfig } = editor;
  return (
<div id={id('panel-presets')} role="tabpanel" aria-labelledby={id('tab-presets')}>
          <div className={styles.sectionHeader}><div><h3>A great place to start</h3><p>Apply a ready-made design or reuse your own. Presets keep your content intact.</p></div></div>
          <div className={styles.presetGrid}>{BUILT_IN_PRESETS.map((preset) => <button key={preset.id} type="button" className={styles.presetCard} onClick={() => choosePreset(preset)}><span className={styles.presetPreview} style={{ background: preset.design.backgroundColor || theme.subtle }} aria-hidden="true"><i style={{ background: preset.design.accentColor || theme.accent, borderRadius: preset.design.iconShape === 'circle' ? '50%' : 6 }} /><span><b style={{ background: preset.design.textColor || theme.text }} /><em style={{ background: preset.design.mutedColor || theme.muted }} /></span></span><strong>{preset.name}</strong><span>{LAYOUTS.find((layout) => layout.id === preset.design.layout)?.name || 'Custom layout'} <span aria-hidden="true">→</span></span></button>)}</div>
          <div className={styles.sectionDivider} />
          <div className={styles.formGrid}>
            <div className={styles.settingsGroup}><h4>Your saved designs</h4><p className={styles.hint}>Saved with this web part. Export configuration to carry designs to another instance.</p><Field label="Preset name" id={id('preset-name')}><div className={styles.inputAction}><input id={id('preset-name')} value={presetName} maxLength={80} placeholder="IT action cards" onChange={(event) => setPresetName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); savePreset(); } }} /><button type="button" className={styles.secondaryButton} disabled={!presetName.trim() || config.savedPresets.length >= 20} onClick={savePreset}>Save design</button></div></Field>
              <ul className={styles.savedPresets}>{config.savedPresets.map((preset) => <li key={preset.id}><span>{preset.name}</span><button type="button" className={styles.textButton} onClick={() => choosePreset(preset)}>Apply<span className={styles.srOnly}> {preset.name}</span></button><button type="button" className={styles.iconButton} aria-label={`Delete saved preset ${preset.name}`} onClick={() => { checkpoint('Preset deletion'); change({ savedPresets: config.savedPresets.filter((item) => item.id !== preset.id) }); setNotice(`${preset.name} removed from saved designs.`); focusAfterUpdate('preset-name'); }}>×</button></li>)}</ul>
              {config.savedPresets.length === 0 && <p className={styles.hint}>Your saved designs will appear here.</p>}{config.savedPresets.length >= 20 && <p className={styles.hint}>20 designs saved. Remove one to save another.</p>}
            </div>
            <div className={styles.settingsGroup}><h4>Organization preset library</h4><p className={styles.hint}>Optional read-only SharePoint list shared across pages. Provide a GUID, with Title and PresetJson (multiline text) columns. Manage publishing and permissions in SharePoint.</p>
              <Toggle label="Use shared preset library" id={id('shared-enabled')} value={config.sharedPresetSource.enabled} onChange={(enabled) => updateSharedPresetSource({ enabled })} />
              {config.sharedPresetSource.enabled && <div className={styles.formGrid}>
                <Field label="SharePoint site URL" id={id('shared-site')}><input id={id('shared-site')} value={config.sharedPresetSource.siteUrl} placeholder={currentSiteUrl} onChange={(event) => updateSharedPresetSource({ siteUrl: event.target.value })} /></Field>
                <Field label="SharePoint list GUID" id={id('shared-list')}><input id={id('shared-list')} value={config.sharedPresetSource.listId} onChange={(event) => updateSharedPresetSource({ listId: event.target.value })} /></Field>
                <button type="button" className={styles.secondaryButton} disabled={loadingShared || !dataProvider?.getSharedPresets || !config.sharedPresetSource.listId} onClick={() => { loadSharedPresets().catch((error: unknown) => setSharedError(messageFromError(error))); }}>{loadingShared ? 'Loading…' : 'Load shared designs'}</button>
                {sharedError && <p className={styles.errorBox} role="alert">{sharedError}</p>}
                <div className={styles.savedPresets}>{sharedPresets.map(p => <div key={p.id}><span>{p.name}</span><button type="button" className={styles.textButton} onClick={() => choosePreset(p)}>Apply</button></div>)}</div>
              </div>}
              <p className={styles.hint}>Export the current design as JSON, then paste it into the PresetJson column of an approved shared list item.</p>
              <button type="button" className={styles.secondaryButton} onClick={downloadSharedPreset}>Export design for shared library</button>
            </div>
            <div className={styles.settingsGroup}><h4>Move your configuration</h4><p className={styles.hint}>Export all content, design, saved presets, and list settings as JSON. Import replaces this web part’s configuration.</p><button type="button" className={styles.secondaryButton} onClick={downloadConfig}>Export configuration <span aria-hidden="true">↓</span></button>
              <div className={styles.importSection}><Field label="Choose a configuration file" id={id('import-file')}><input id={id('import-file')} type="file" accept=".json,application/json" onChange={(event) => { readImportFile(event.target.files ? event.target.files[0] : undefined).catch((error: unknown) => setImportError(messageFromError(error))); event.target.value = ''; }} /></Field><Field label="Or paste configuration JSON" id={id('import-json')}><textarea id={id('import-json')} value={importText} maxLength={MAX_IMPORT_BYTES} rows={4} spellCheck={false} placeholder="Paste Tile Studio configuration…" onChange={(event) => { editImportText(event.target.value); }} /></Field>{importError && <p className={styles.errorBox} role="alert">{importError}</p>}{pendingImport ? <div className={styles.importReview} role="group" aria-label="Review configuration replacement"><strong>Review before replacing</strong><p>Current: {config.tiles.length} manual tiles · {config.savedPresets.length} saved designs · {config.source.mode === 'sharepoint' ? 'SharePoint source' : 'Manual source'}</p><p>Imported: {pendingImport.tiles.length} manual tiles · {pendingImport.savedPresets.length} saved designs · {pendingImport.source.mode === 'sharepoint' ? 'SharePoint source' : 'Manual source'}</p><p>Replacing also changes all colors, card settings, responsive settings, and approved image hosts. This page is not saved until you publish it.</p><div className={styles.inlineActions}><button type="button" className={styles.dangerButton} onClick={confirmImport}>Replace configuration</button><button type="button" className={styles.secondaryButton} onClick={() => setPendingImport(undefined)}>Cancel</button></div></div> : <button type="button" className={styles.secondaryButton} disabled={!importText.trim()} onClick={() => importConfig(importText)}>Review import</button>}</div>
            </div>
          </div>
        </div>
  );
};
