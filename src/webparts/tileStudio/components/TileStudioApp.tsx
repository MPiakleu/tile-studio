import * as React from 'react';
import { DEFAULT_THEME } from '../models/config';
import { LoadResult, ThemeTokens, TileDataProvider, TileStudioConfig } from '../models/types';
import { TileCollection } from './TileCollection';
import { TileIcon } from './TileIcon';
import styles from './TileStudioApp.module.scss';


export interface TileStudioAppProps {
  config: TileStudioConfig;
  onChange: (config: TileStudioConfig) => void;
  isEditMode: boolean;
  onOpenEditor: () => void;
  onCloseEditor: () => void;
  dataProvider?: TileDataProvider;
  currentSiteUrl: string;
  theme?: ThemeTokens;
  instanceId: string;
}

interface DataState { key: string; result?: LoadResult; error: string; loading: boolean; }

export function TileStudioApp(props: TileStudioAppProps): React.ReactElement {
  const { config, isEditMode, dataProvider, instanceId } = props;
  const theme = props.theme || DEFAULT_THEME;
  const [retry, setRetry] = React.useState(0);
  const [data, setData] = React.useState<DataState>({ key: '', error: '', loading: false });
  const sourceKey = JSON.stringify(config.source);
  React.useEffect(() => {
    if (config.source.mode !== 'sharepoint') return undefined;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async (): Promise<void> => {
      if (!active) return;
      setData({ key: sourceKey, error: '', loading: true });
      try {
        if (!dataProvider) throw new Error('Connect this web part to SharePoint to load list content. The standalone preview does not access your tenant.');
        const result = await dataProvider.loadTiles(config.source, retry > 0);
        if (active) setData({ key: sourceKey, result, error: '', loading: false });
      } catch (error) {
        if (active) setData({ key: sourceKey, error: error instanceof Error ? error.message : 'This content could not be loaded. Try again.', loading: false });
      }
      if (active && config.source.refreshMinutes > 0) timer = setTimeout(() => { load().catch(() => undefined); }, config.source.refreshMinutes * 60000);
    };
    timer = setTimeout(() => { load().catch(() => undefined); }, 120);
    return () => { active = false; if (timer !== undefined) clearTimeout(timer); };
  }, [sourceKey, retry, dataProvider]);

  const connected = config.source.mode === 'sharepoint';
  const currentData = data.key === sourceKey ? data : { key: sourceKey, loading: true, error: '' };
  const collectionTiles = connected ? currentData.result?.tiles || [] : config.tiles;
  const containerStyle = { '--ts-app-accent': theme.accent, '--ts-app-surface': theme.surface, '--ts-app-text': theme.text, '--ts-app-muted': theme.muted, '--ts-app-border': theme.border, '--ts-app-subtle': theme.subtle } as React.CSSProperties;
  return <div className={styles.app} style={containerStyle} data-tile-studio="true">
    {isEditMode && <div className={styles.toolbar}>
      <div className={styles.brand}><span className={styles.brandMark}><TileIcon name="apps" size={18} /></span><strong>Tile Studio</strong><span className={styles.version}>DESIGN YOUR SPACE</span></div>
      <button data-studio-open-editor="true" type="button" className={styles.designButton} onClick={props.onOpenEditor} >
        <TileIcon name="sparkles" size={17} />Edit in SharePoint properties
      </button>
    </div>}
    <div className={styles.previewFrame}>
      {connected && currentData.loading ? <div className={styles.message} role="status"><span className={styles.loadingDot} />Loading resources…</div> : connected && currentData.error ? <div className={styles.error} role="alert"><TileIcon name="info" size={24} /><div><strong>Resources are unavailable</strong><p>{currentData.error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div></div> : <>
        <TileCollection config={config} tiles={collectionTiles} theme={theme} preview={isEditMode} instanceId={instanceId} currentSiteUrl={props.currentSiteUrl} />
        {connected && currentData.result?.truncated && <p className={styles.limitNotice}>Showing the first {collectionTiles.length} resources. {isEditMode ? 'Refine the category filter or raise the item limit in Content.' : 'More resources are available in the source list.'}</p>}
      </>}
    </div>
  </div>;
}

export class TileStudioBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  public state = { failed: false };
  public static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  public render(): React.ReactNode {
    return this.state.failed ? <div role="alert" style={{ padding: 24, border: '1px solid #b5c1c8', borderRadius: 12 }}><h2>Tile Studio could not open</h2><p>Refresh the page to try again. If this continues, ask the page owner to check the web part configuration.</p></div> : this.props.children;
  }
}
