import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createDefaultConfig, DEFAULT_THEME, LAYOUTS } from '../src/webparts/tileStudio/models/config';
import { LayoutId, ThemeTokens, TileStudioConfig } from '../src/webparts/tileStudio/models/types';
import { layoutSelectionPatch } from '../src/webparts/tileStudio/models/layoutProfiles';
import { TileCollection } from '../src/webparts/tileStudio/components/TileCollection';
import { TileIcon } from '../src/webparts/tileStudio/components/TileIcon';
import { TileStudioApp, TileStudioBoundary } from '../src/webparts/tileStudio/components/TileStudioApp';
import './preview.scss';

const DARK_THEME: ThemeTokens = { accent: '#7ce3d2', surface: '#1b2b35', text: '#f6fafb', muted: '#c4d1d7', border: '#3a505d', subtle: '#253b46', isDark: true };

interface PreviewApi {
  getConfig: () => TileStudioConfig;
  setConfig: (config: TileStudioConfig) => void;
  setEditMode: (edit: boolean) => void;
  setEditorOpen: (open: boolean) => void;
  setTheme: (theme: ThemeTokens | 'light' | 'dark') => void;
  getTheme: () => ThemeTokens;
  setView: (view: 'studio' | 'gallery') => void;
  setWidth: (width: number | 'full') => void;
  reset: () => void;
}

declare global { interface Window { __tileStudioPreview: PreviewApi; } }

function makeDemoConfig(): TileStudioConfig {
  const config = createDefaultConfig();
  const accents = ['#007f78', '#355b93', '#8f5f22', '#5e4b8b', '#3f7464', '#8b474b'];
  const categories = ['SUPPORT', 'REQUESTS', 'IDEAS & PROJECTS', 'SERVICE UPDATES', 'EVERYDAY ESSENTIALS', 'WORK SECURELY'];
  const actions = ['Find a solution', 'Browse services', 'Start a conversation', 'View updates', 'Explore resources', 'Get guidance'];
  config.design = { ...config.design, gap: 20, padding: 25, minHeight: 215, radius: 14 };
  config.tiles = config.tiles.map((tile, index) => ({ ...tile, url: `https://example.com/it/${index + 1}`, openInNewTab: true, accentColor: accents[index], eyebrow: categories[index], buttonLabel: actions[index] }));
  return config;
}


function galleryConfig(layout: LayoutId): TileStudioConfig {
  const config = makeDemoConfig();
  config.showHeading = false;
  config.design = { ...config.design, layout, ...layoutSelectionPatch(layout) };
  config.responsive = { ...config.responsive, tabletColumns: layout === 'list' || layout === 'status' ? 1 : 2 };
  const count = layout === 'icon' ? 4 : layout === 'featured' || layout === 'split' || layout === 'status' || layout === 'list' ? 2 : 3;
  config.tiles = config.tiles.slice(0, count).map((tile) => ({ ...tile, eyebrow: '', buttonLabel: '', openInNewTab: false }));
  if (layout === 'status') {
    config.tiles = config.tiles.map((tile, index) => ({ ...tile, title: index ? 'Scheduled maintenance' : 'Service availability', description: index ? 'A place for verified maintenance information.' : 'Connect your approved source for current service updates.', icon: index ? 'calendar' : 'activity', status: 'unknown', meta: 'Example content · no live status feed' }));
  }
  if (layout === 'kpi') {
    const titles = ['Requests this week', 'Self-service completion', 'Employee satisfaction'];
    config.tiles = config.tiles.map((tile, index) => ({ ...tile, title: titles[index], metric: '—', description: '', eyebrow: 'EXAMPLE METRIC', meta: 'No live data connected', icon: 'chart' }));
  }
  if (layout === 'featured') config.tiles = config.tiles.map((tile, index) => ({ ...tile, eyebrow: index ? 'MAKE IT HAPPEN' : 'START HERE', buttonLabel: index ? 'Explore services' : 'Find your answer' }));
  return config;
}

function LayoutGallery({ theme, onChoose }: { theme: ThemeTokens; onChoose: (layout: LayoutId) => void }): React.ReactElement {
  const galleries = React.useMemo(() => LAYOUTS.map(layout => ({ ...layout, config: galleryConfig(layout.id) })), []);
  return <div className="ts-preview-gallery">
    <div className="ts-preview-gallery-intro"><span className="ts-preview-eyebrow">THE LAYOUT COLLECTION</span><h1>One canvas. Ten ways to make it yours.</h1><p>Each layout uses the same tiles and visual controls. Choose a starting point, then adjust it in the designer.</p></div>
    {galleries.map((layout, index) => <section key={layout.id} className="ts-preview-gallery-section" aria-labelledby={`gallery-label-${layout.id}`}>
      <header><div><span className="ts-preview-gallery-index">{String(index + 1).padStart(2, '0')}</span><h2 id={`gallery-label-${layout.id}`}>{layout.name}</h2><p>{layout.description}</p></div><button type="button" className="ts-preview-secondary" onClick={() => onChoose(layout.id)}>Use this layout <TileIcon name="arrow" size={16} /></button></header>
      <TileCollection config={layout.config} tiles={layout.config.tiles} theme={theme} preview instanceId={`gallery-${layout.id}`} />
    </section>)}
  </div>;
}

export function Preview(): React.ReactElement {
  const [config, setConfig] = React.useState<TileStudioConfig>(makeDemoConfig);
  const [isEditMode, setEditMode] = React.useState(true);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<ThemeTokens>(DEFAULT_THEME);
  const [view, setView] = React.useState<'studio' | 'gallery'>('studio');
  const [canvasWidth, setCanvasWidth] = React.useState('full');
  const configRef = React.useRef(config);
  const themeRef = React.useRef(theme);
  configRef.current = config;
  themeRef.current = theme;

  React.useEffect(() => {
    window.__tileStudioPreview = {
      getConfig: () => configRef.current,
      setConfig,
      setEditMode,
      setEditorOpen: (open) => { setEditMode(true); setEditorOpen(open); setView('studio'); },
      setTheme: (next) => setTheme(next === 'dark' ? DARK_THEME : next === 'light' ? DEFAULT_THEME : next),
      getTheme: () => themeRef.current,
      setView,
      setWidth: (width) => setCanvasWidth(String(width)),
      reset: () => { setConfig(makeDemoConfig()); setEditMode(true); setEditorOpen(false); setTheme(DEFAULT_THEME); setView('studio'); setCanvasWidth('full'); }
    };
  }, []);

  const chooseLayout = (layout: LayoutId): void => {
    setConfig({ ...config, design: { ...config.design, ...layoutSelectionPatch(layout) } });
    setEditMode(true);
    setEditorOpen(true);
    setView('studio');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const tabKey = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) === -1) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'studio' : event.key === 'End' ? 'gallery' : view === 'studio' ? 'gallery' : 'studio';
    setView(next);
    document.getElementById(`preview-tab-${next}`)?.focus();
  };
  const previewStyle = { '--preview-surface': theme.surface, '--preview-text': theme.text, '--preview-muted': theme.muted, '--preview-border': theme.border, '--preview-subtle': theme.subtle, '--preview-accent': theme.accent } as React.CSSProperties;

  return <div className="ts-preview" style={previewStyle} data-dark={theme.isDark || undefined}>
    <a className="ts-preview-skip" href="#preview-main">Skip to preview</a>
    <header className="ts-preview-topbar">
      <a className="ts-preview-product" href="#preview-main" aria-label="Tile Studio preview"><span className="ts-preview-mark"><TileIcon name="apps" size={22} /></span><span><strong>Tile Studio</strong><small>FOR SHAREPOINT</small></span></a>
      <nav className="ts-preview-tabs" role="tablist" aria-label="Preview views">
        <button type="button" id="preview-tab-studio" role="tab" tabIndex={view === 'studio' ? 0 : -1} aria-selected={view === 'studio'} aria-controls="preview-main" onKeyDown={tabKey} onClick={() => setView('studio')}>Studio</button>
        <button type="button" id="preview-tab-gallery" role="tab" tabIndex={view === 'gallery' ? 0 : -1} aria-selected={view === 'gallery'} aria-controls="preview-main" onKeyDown={tabKey} onClick={() => setView('gallery')}>Layout gallery <span>10</span></button>
      </nav>
      <div className="ts-preview-top-actions"><span className="ts-preview-version">v1.0.0</span><button className="ts-preview-theme" type="button" aria-label={theme.isDark ? 'Use light theme' : 'Use dark theme'} aria-pressed={theme.isDark} onClick={() => setTheme(theme.isDark ? DEFAULT_THEME : DARK_THEME)}><TileIcon name="sparkles" size={16} />{theme.isDark ? 'Light theme' : 'Dark theme'}</button></div>
    </header>
    <div className="ts-preview-notice"><span className="ts-preview-notice-dot" aria-hidden="true" />Interactive preview <span className="ts-preview-notice-divider">/</span><span>Sample content. Changes stay in this browser tab.</span></div>
    <main id="preview-main" className="ts-preview-main" role="tabpanel" aria-labelledby={view === 'studio' ? 'preview-tab-studio' : 'preview-tab-gallery'} tabIndex={-1}>
      {view === 'studio' ? <>
        <section className="ts-preview-hero" aria-labelledby="preview-hero-title">
          <div className="ts-preview-hero-copy"><div className="ts-preview-site-name"><span>R</span>RIDGEPOST <i /> TECHNOLOGY HUB</div><h1 id="preview-hero-title">A better workday starts here.</h1><p>Find support, request what you need, and keep work moving.</p></div>
          <div className="ts-preview-hero-art" aria-hidden="true"><div className="ts-preview-art-card"><TileIcon name="tools" size={28} /><span /><span /></div><div className="ts-preview-art-card"><TileIcon name="apps" size={28} /><span /><span /></div><div className="ts-preview-art-card"><TileIcon name="sparkles" size={28} /><span /><span /></div></div>
        </section>
        <div className="ts-preview-canvas-bar"><div><span className="ts-preview-section-label">YOUR PAGE</span><span className="ts-preview-section-hint">{isEditMode ? 'Open the designer to make it yours' : 'Employee view'}</span></div><div className="ts-preview-canvas-controls"><label htmlFor="preview-width">Canvas width</label><select id="preview-width" value={canvasWidth} onChange={event => setCanvasWidth(event.target.value)}><option value="full">Fit page</option><option value="1200">1200 px</option><option value="768">768 px</option><option value="390">390 px</option><option value="280">280 px</option></select><button type="button" className="ts-preview-mode" aria-pressed={isEditMode} onClick={() => { setEditMode(!isEditMode); setEditorOpen(false); }}>{isEditMode ? 'Editing page' : 'Edit page'}<span className="ts-preview-switch" aria-hidden="true"><span /></span></button></div></div>
        <div className="ts-preview-canvas" style={canvasWidth === 'full' ? undefined : { maxWidth: Number(canvasWidth) }}>
          <TileStudioBoundary><TileStudioApp config={config} onChange={setConfig} isEditMode={isEditMode} editorOpen={editorOpen} onOpenEditor={() => setEditorOpen(true)} onCloseEditor={() => setEditorOpen(false)} currentSiteUrl="https://example.sharepoint.com/sites/Technology" theme={theme} instanceId="studio-preview" /></TileStudioBoundary>
        </div>
      </> : <LayoutGallery theme={theme} onChoose={chooseLayout} />}
    </main>
    <footer className="ts-preview-footer"><span><strong>Tile Studio</strong> <span>Designed for the way your team works.</span></span><span>Preview only · No tenant connection</span></footer>
  </div>;
}

const root = document.getElementById('root');
if (root) ReactDOM.render(<Preview />, root);
