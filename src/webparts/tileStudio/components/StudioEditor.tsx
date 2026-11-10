import * as React from 'react';
import { useEditorController } from './editor/useEditorController';
import type { StudioEditorProps } from './editor/types';
export { EditorTab, StudioEditorProps, StudioEditorUiState } from './editor/types';
import { TABS } from './editor/constants';
import { ContentSection } from './editor/ContentSection';
import { LayoutSection } from './editor/LayoutSection';
import { StyleSection } from './editor/StyleSection';
import { ResponsiveSection } from './editor/ResponsiveSection';
import { PresetsSection } from './editor/PresetsSection';
import { TileIcon } from './TileIcon';
import styles from './StudioEditor.module.scss';

/** SharePoint property-pane host; section editors mount only when selected. */
const StudioEditorContent: React.FC<StudioEditorProps> = (props) => {
  const editor = useEditorController(props);
  const { onClose } = props;
  const { tab, setTab, search, setSearch, foundSettings, setFocusSetting, keyTabs, id, rootStyle, undoConfig, undoDescription, undoLast, notice } = editor;
  return (
    <section className={styles.editor} style={rootStyle} aria-label="Tile Studio designer" data-testid="studio-editor">
      <header className={styles.header}>
        <div className={styles.heading}><span className={styles.brandMark} aria-hidden="true"><span /><span /><span /><span /></span><div><h2>Tile Studio</h2><p>Your content. Your design.</p></div><span className={styles.livePill}><span />Live preview</span></div>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>Done editing <span aria-hidden="true">✓</span></button>
      </header>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Designer sections">
          {TABS.map((item, index) => <button key={item.id} id={id(`tab-${item.id}`)} type="button" role="tab" aria-selected={tab === item.id} aria-controls={id(`panel-${item.id}`)} tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? styles.activeTab : ''} onClick={() => { setTab(item.id); setSearch(''); }} onKeyDown={(event) => keyTabs(event, index)}>{item.label}</button>)}
        </div>
        <div className={styles.searchBox}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg><label className={styles.srOnly} htmlFor={id('find')}>Find a setting</label><input id={id('find')} type="search" value={search} placeholder="Find a setting" onChange={(event) => setSearch(event.target.value)} /></div>
      </div>
      {search.trim() && <div className={styles.searchResults} aria-live="polite">{foundSettings.length ? <><span>Jump to setting</span>{foundSettings.map((item) => <button type="button" key={`${item.tab}:${item.id}`} onClick={() => { setTab(item.tab); setFocusSetting(item); setSearch(''); }}>{item.label} <small>{item.tab}</small><span aria-hidden="true">→</span></button>)}</> : <span>No matching setting in the current content mode. Try “accent,” “columns,” “link,” or “import.”</span>}</div>}
      <div className={styles.body}>
        {TABS.filter((item) => item.id !== tab).map((item) => <div key={item.id} id={id(`panel-${item.id}`)} role="tabpanel" aria-labelledby={id(`tab-${item.id}`)} hidden />)}
        {tab === 'content' && <ContentSection editor={editor} />}
        {tab === 'layout' && <LayoutSection editor={editor} />}
        {tab === 'style' && <StyleSection editor={editor} />}
        {tab === 'responsive' && <ResponsiveSection editor={editor} />}
        {tab === 'presets' && <PresetsSection editor={editor} />}
      </div>
      <footer className={styles.footer}><span className={styles.footerNote}><TileIcon name="info" size={16} />Save or publish the SharePoint page to keep your changes.</span>{undoConfig && <button type="button" className={styles.secondaryButton} onClick={undoLast}>Undo {undoDescription.toLowerCase()}</button>}<span role="status" aria-live="polite" className={styles.notice}>{notice || 'Preview updates as you edit.'}</span></footer>
    </section>
  );
};

/** Keep an unexpected editor render error visible and recoverable instead of
 * leaving an empty SharePoint property-pane field. The SPFx host owns mounting. */
class EditorErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  public state = { failed: false };

  public static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  public render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;
    return <div className={styles.editorFailure} role="alert">
      <strong>Tile Studio settings could not be displayed.</strong>
      <p>The editor encountered an unexpected error. Retry the settings panel. If it happens again, reopen the web part properties and contact your SharePoint administrator.</p>
      <button type="button" onClick={() => this.setState({ failed: false })}>Retry settings</button>
    </div>;
  }
}

export const StudioEditor: React.FC<StudioEditorProps> = (props) => (
  <EditorErrorBoundary><StudioEditorContent {...props} /></EditorErrorBoundary>
);
