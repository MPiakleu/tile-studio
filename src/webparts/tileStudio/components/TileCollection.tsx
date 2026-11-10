import * as React from 'react';
import { isTileEligible, resolveCardInteraction, shouldRenderLegacyCard } from '../models/composition';
import { ComposedTile } from './ComposedTile';
import { DEFAULT_THEME } from '../models/config';
import { Tile, TileStatus, TileStudioConfig, ThemeTokens } from '../models/types';
import { safeLink, safeTileImage } from '../services/safety';
import { TileIcon } from './TileIcon';
import styles from './TileCollection.module.scss';

export interface TileCollectionProps {
  config: TileStudioConfig;
  tiles: Tile[];
  theme?: ThemeTokens;
  preview?: boolean;
  instanceId?: string;
  currentSiteUrl?: string;
}

type CssVariables = React.CSSProperties & { [key: string]: string | number | undefined };
let collectionSequence = 0;

const statusLabels: Record<TileStatus, string> = {
  none: 'Status not supplied',
  operational: 'Operational',
  degraded: 'Service disruption',
  outage: 'Outage reported',
  maintenance: 'Maintenance',
  unknown: 'Status unknown'
};

function validColor(value: string, fallback: string): string {
  return /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? value : fallback;
}

function useContainerWidth(): [React.RefObject<HTMLElement>, number] {
  const ref = React.useRef<HTMLElement>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = (): void => { setWidth(Math.round(element.getBoundingClientRect().width)); };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) setWidth(Math.round(entries[0].contentRect.width));
      });
      observer.observe(element);
      return () => { observer.disconnect(); };
    }
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); };
  }, []);
  return [ref, width];
}

function Status({ status, id }: { status: TileStatus; id?: string }): React.ReactElement {
  return <span id={id} className={styles.status} data-status={status}><span className={styles.statusDot} aria-hidden="true" />{statusLabels[status] || statusLabels.unknown}</span>;
}

function TileVisual({ tile, imageAspect, currentSiteUrl, config }: { tile: Tile; imageAspect: string; currentSiteUrl: string; config: TileStudioConfig }): React.ReactElement {
  const src = safeTileImage(tile.imageUrl, currentSiteUrl, config.imagePolicy, config.trustedImageHosts);
  const [failedSrc, setFailedSrc] = React.useState('');
  const imageAvailable = !!src && failedSrc !== src;
  return <div className={styles.visual} data-aspect={imageAspect} data-placeholder={!imageAvailable || undefined} data-decorative={!tile.imageAlt.trim() || undefined}>
    {imageAvailable ? <img src={src} alt={tile.imageAlt || ''} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => { setFailedSrc(src || ''); }} /> : <div className={styles.visualPlaceholder} aria-hidden="true"><span className={styles.visualOrb} /><TileIcon name={tile.icon} size={48} /></div>}
    {!imageAvailable && tile.imageAlt && <span className={styles.srOnly}>{tile.imageAlt}</span>}
  </div>;
}

interface TileCardProps {
  tile: Tile;
  config: TileStudioConfig;
  preview: boolean;
  instanceId: string;
  index: number;
  currentSiteUrl: string;
}

function TileCard({ tile, config, preview, instanceId, index, currentSiteUrl }: TileCardProps): React.ReactElement {
  const { design } = config;
  const layout = design.layout;
  const href = safeLink(tile.url);
  const titleId = `${instanceId}-tile-${index}-title`;
  const newTabId = `${instanceId}-tile-${index}-newtab`;
  const descriptionId = `${instanceId}-tile-${index}-description`;
  const statusId = `${instanceId}-tile-${index}-status`;
  const showVisual = layout === 'image' || layout === 'split';
  const showStatus = layout === 'status' || tile.status !== 'none';
  const hasDescription = design.showDescription && !!tile.description;
  const hasFooter = !!tile.meta || (!!tile.buttonLabel && !!href) || (design.showArrow && !!href) || (showStatus && layout !== 'status');
  const describedBy = [hasDescription ? descriptionId : '', showStatus ? statusId : '', tile.openInNewTab && href ? newTabId : ''].filter(Boolean).join(' ') || undefined;
  // Per-tile background takes precedence; section background is the default.
  // Set the explicit background on the DOM node as well as the CSS variable so
  // layout-specific CSS (especially Minimal) cannot silently mask a chosen
  // color. No explicit choice preserves the theme and Minimal transparency.
  const explicitBackground = validColor(tile.backgroundColor, validColor(design.backgroundColor, ''));
  const tileStyles: CssVariables = {
    ...(explicitBackground ? { backgroundColor: explicitBackground } : {}),
    '--ts-tile-accent': validColor(tile.accentColor, 'var(--ts-accent)'),
    '--ts-tile-background': validColor(tile.backgroundColor, 'var(--ts-surface)'),
    '--ts-tile-text': validColor(tile.textColor, 'var(--ts-text)'),
    '--ts-tile-muted': tile.textColor ? validColor(tile.textColor, 'var(--ts-muted)') : 'var(--ts-muted)'
  };
  const content = <>
    {showVisual && <TileVisual tile={tile} imageAspect={design.imageAspect} currentSiteUrl={currentSiteUrl} config={config} />}
    <div className={styles.cardInner}>
      {design.iconPosition !== 'hidden' && !showVisual && <span className={styles.iconSlot} data-shape={design.iconShape}><TileIcon name={tile.icon} size={design.iconSize} /></span>}
      <div className={styles.copy}>
        {(tile.eyebrow || tile.badge) && <div className={styles.overline}>{tile.eyebrow && <span className={styles.eyebrow}>{tile.eyebrow}</span>}{tile.badge && <span className={styles.badge}>{tile.badge}</span>}</div>}
        {layout === 'kpi' && <div className={styles.metric}>{tile.metric || <span aria-label="No value supplied">—</span>}</div>}
        <h3 id={titleId} className={styles.tileTitle}>{tile.title || 'Untitled tile'}</h3>
        {hasDescription && <p id={descriptionId} className={styles.description}>{tile.description}</p>}
        {layout === 'status' && <div className={styles.statusLine}><Status id={statusId} status={tile.status} /></div>}
      </div>
      {hasFooter && <div className={styles.footer}>
        <div className={styles.footerCopy}>
          {showStatus && layout !== 'status' && <Status id={statusId} status={tile.status} />}
          {tile.meta && <span className={styles.meta}>{tile.meta}</span>}
          {tile.buttonLabel && href && <span className={styles.actionLabel}>{tile.buttonLabel}</span>}
        </div>
        {design.showArrow && href && <span className={styles.arrow}><TileIcon name="arrow" size={20} /></span>}
      </div>}
      {href && tile.openInNewTab && <span id={newTabId} className={styles.srOnly}>Opens in a new tab</span>}
    </div>
  </>;
  const shared = {
    className: styles.card,
    style: tileStyles,
    'data-linked': !!href || undefined,
    'data-status': layout === 'status' ? tile.status : undefined,
    'data-has-background': !!(tile.backgroundColor || design.backgroundColor) || undefined,
    'data-icon-position': design.iconPosition,
    'data-has-visual': showVisual || undefined
  };
  return <li className={styles.item}>
    {href && !preview ? <a {...shared} href={href} target={tile.openInNewTab ? '_blank' : undefined} rel={tile.openInNewTab ? 'noopener noreferrer' : undefined} aria-labelledby={titleId} aria-describedby={describedBy}>{content}</a> : <div {...shared}>{content}</div>}
  </li>;
}

/** Shared presentation for all layouts. Container width drives columns inside SharePoint sections. */
export function TileCollection({ config, tiles, theme = DEFAULT_THEME, preview = false, instanceId, currentSiteUrl = '' }: TileCollectionProps): React.ReactElement {
  const [generatedId] = React.useState(() => `tile-collection-${++collectionSequence}`);
  const id = instanceId || generatedId;
  const [rootRef, width] = useContainerWidth();
  const { design, responsive } = config;
  const viewport = width > 0 && width <= responsive.mobileBreakpoint ? 'mobile' : width > 0 && width <= responsive.tabletBreakpoint ? 'tablet' : 'desktop';
  const requestedColumns = viewport === 'mobile' ? responsive.mobileColumns : viewport === 'tablet' ? responsive.tabletColumns : design.columns;
  // A 320px SharePoint column never becomes two unusable 145px cards.
  const fitColumns = width > 0 ? Math.max(1, Math.floor((width + design.gap) / (210 + design.gap))) : requestedColumns;
  const columns = Math.min(requestedColumns, fitColumns);
  const visibleTiles = tiles.filter(isTileEligible);
  const compact = design.density === 'compact' || (viewport === 'mobile' && responsive.compactOnMobile);
  const colorStyles: CssVariables = {
    '--ts-accent': validColor(design.accentColor, theme.accent),
    '--ts-surface': validColor(design.backgroundColor, theme.surface),
    '--ts-text': validColor(design.textColor, theme.text),
    '--ts-muted': validColor(design.mutedColor, theme.muted),
    '--ts-border': validColor(design.borderColor, theme.border),
    '--ts-subtle': theme.subtle,
    '--ts-icon-background': validColor(design.iconBackground, theme.subtle),
    '--ts-icon-color': validColor(design.iconColor, 'var(--ts-tile-accent)'),
    '--ts-columns': Math.max(1, columns),
    '--ts-gap': `${design.gap}px`,
    '--ts-padding': `${compact ? Math.round(design.padding * 0.75) : design.padding}px`,
    '--ts-radius': `${design.radius}px`,
    '--ts-border-width': `${design.borderWidth}px`,
    '--ts-min-height': `${design.minHeight}px`,
    '--ts-title-size': `${design.titleSize}px`,
    '--ts-description-size': `${design.descriptionSize}px`,
    '--ts-title-weight': design.titleWeight,
    '--ts-icon-size': `${design.iconSize}px`,
    '--ts-title-line-height': String(design.titleLineHeight / 100),
    '--ts-description-line-height': String(design.descriptionLineHeight / 100),
    '--ts-category-size': `${design.categorySize}px`, '--ts-meta-size': `${design.metaSize}px`,
    '--ts-footer-gap': `${design.footerGap}px`, '--ts-button-radius': `${design.buttonRadius}px`
  };
  const headingId = `${id}-heading`;
  return <section ref={rootRef} className={styles.collection} style={colorStyles} aria-labelledby={config.showHeading && config.title ? headingId : undefined} aria-label={!config.showHeading || !config.title ? 'Tile collection' : undefined} data-layout={design.layout} data-viewport={viewport} data-hover={design.hover} data-shadow={design.shadow} data-align={design.align} data-equal-height={design.equalHeight} data-reduce-motion={responsive.reduceMotion || undefined} data-hide-mobile-images={responsive.hideImagesOnMobile || undefined} data-dark={theme.isDark || undefined} data-preview={preview || undefined} data-has-background={!!design.backgroundColor || undefined}
    data-mobile-stack-actions={responsive.stackActionsOnMobile || undefined} data-mobile-hide-meta={responsive.hideMetaOnMobile || undefined}
    data-mobile-hide-category={responsive.hideCategoryOnMobile || undefined} data-mobile-hide-secondary={responsive.hideSecondaryOnMobile || undefined}>
    {config.showHeading && (config.title || config.subtitle) && <header className={styles.heading}>
      {config.title && <h2 id={headingId}>{config.title}</h2>}
      {config.subtitle && <p>{config.subtitle}</p>}
    </header>}
    {visibleTiles.length ? <ul className={styles.grid}>{visibleTiles.map((tile, index) => resolveCardInteraction(config.design, tile) === 'card' && shouldRenderLegacyCard(config.design, tile)
      ? <TileCard key={tile.id} tile={tile} config={config} preview={preview} instanceId={id} index={index} currentSiteUrl={currentSiteUrl} />
      : <ComposedTile key={tile.id} tile={tile} config={config} preview={preview} instanceId={id} index={index} themeAccent={theme.accent} currentSiteUrl={currentSiteUrl} />)}</ul> : <div className={styles.empty}><TileIcon name="apps" size={28} /><p>No tiles to display.</p></div>}
  </section>;
}
