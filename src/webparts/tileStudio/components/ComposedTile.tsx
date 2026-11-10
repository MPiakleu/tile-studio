import * as React from 'react';
import { resolveCardInteraction, resolveTileAppearance } from '../models/composition';
import { ActionStyle, FooterElement, IconName, Tile, TileStatus, TileStudioConfig } from '../models/types';
import { safeLink, safeTileImage } from '../services/safety';
import { TileIcon } from './TileIcon';
import { contrastRatio } from '../models/colorContrast';
import styles from './TileCollection.module.scss';

type Vars = React.CSSProperties & { [key: string]: string | number | undefined };
const labels: Record<TileStatus, string> = {
  none: 'Not connected', operational: 'Operational', degraded: 'Service disruption',
  outage: 'Outage reported', maintenance: 'Maintenance', unknown: 'Status unknown'
};
const color = (value: string, fallback: string): string => /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? value : fallback;
function onAccent(value: string, background: string): string {
  return contrastRatio('#101c22', value, background) >= contrastRatio('#ffffff', value, background)
    ? '#101c22' : '#ffffff';
}

/** No arbitrary HTML or CSS comes from tile content; actions are independent anchors. */
export function ComposedTile({ tile, config, preview, instanceId, index, currentSiteUrl, themeAccent = '#007f78' }: { tile: Tile; config: TileStudioConfig; preview: boolean; instanceId: string; index: number; currentSiteUrl: string; themeAccent?: string }): React.ReactElement {
  const d = resolveTileAppearance(config.design, tile);
  const composition = d.composition;
  const primary = safeLink(tile.url);
  const secondary = safeLink(tile.secondaryUrl);
  const showVisual = d.layout === 'image' || d.layout === 'split';
  const iconName: IconName = tile.categoryIcon === 'link' ? tile.icon : tile.categoryIcon;
  const hasHeaderLabel = Boolean((composition.showCategory && tile.category) || (composition.showEyebrow && tile.eyebrow));
  const movableIcon = (composition.headerMode === 'stacked' || composition.headerMode === 'icon-top') && (d.iconPosition === 'left' || d.iconPosition === 'right');
  const heading = `${instanceId}-composed-${index}`;
  const visual = safeTileImage(tile.imageUrl, currentSiteUrl, config.imagePolicy, config.trustedImageHosts);
  const fullCardLink = resolveCardInteraction(d, tile) === 'card' && !!primary && !preview;
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => { setImageFailed(false); }, [visual]);
  const inlineIcon = (category: boolean): React.ReactNode => d.iconPosition !== 'hidden'
    ? <span className={styles.composeIcon} data-shape={d.iconShape} data-category={category || undefined} aria-hidden="true"><TileIcon name={category ? iconName : tile.icon} size={category ? Math.max(16, Math.min(25, d.iconSize - 4)) : d.iconSize} /></span>
    : null;
  const status = (): React.ReactNode => <span className={styles.composeStatus} data-variant={d.statusStyle} data-status={tile.status}>
    {d.statusStyle === 'info' ? <TileIcon name="info" size={15} /> : <span className={styles.composeStatusDot} aria-hidden="true" />}
    {labels[tile.status] || labels.unknown}
  </span>;
  const badge = (): React.ReactNode => tile.badge ? <span className={styles.composeBadge} data-variant={d.badgeStyle}>{tile.badge}</span> : null;
  const label = (): React.ReactNode => hasHeaderLabel ? <span className={styles.composeCategory} data-case={d.categoryCase}>{[composition.showCategory ? tile.category : '', composition.showEyebrow ? tile.eyebrow : ''].filter(Boolean).join(' · ')}</span> : null;
  const action = (kind: 'primary' | 'secondary'): React.ReactNode => {
    const href = kind === 'primary' ? primary : secondary;
    const caption = kind === 'primary' ? tile.buttonLabel : tile.secondaryLabel;
    const style: ActionStyle = kind === 'primary' ? d.primaryStyle : d.secondaryStyle;
    if (!href) return null;
    // If a primary link exists but its label was left empty, keep a visible
    // accessible destination instead of producing an apparently dead tile.
    const labelText = caption.trim() || (kind === 'secondary' ? 'More details' : `Open ${tile.title || 'details'}`);
    const newTab = kind === 'primary' ? tile.openInNewTab : tile.secondaryNewTab;
    const common = { className: styles.composeAction, 'data-variant': style };
    const content = <>{labelText} {newTab && <span className={styles.srOnly}>(opens in a new tab)</span>}{style !== 'text' && <TileIcon name={newTab ? 'link' : 'arrow'} size={15} />}</>;
    if (fullCardLink) return <span {...common}>{content}</span>;
    return <a {...common} href={preview ? undefined : href} aria-disabled={preview || undefined} target={!preview && newTab ? '_blank' : undefined} rel={!preview && newTab ? 'noopener noreferrer' : undefined}>
      {content}
    </a>;
  };
  const element = (value: FooterElement): React.ReactNode => {
    switch (value) {
      case 'primary': return action('primary');
      case 'secondary': return action('secondary');
      case 'badge': return composition.showBadgeInHeader && composition.headerMode !== 'none' ? null : badge();
      case 'status': return composition.showStatusInBody ? null : status();
      case 'meta': return tile.meta ? <span className={styles.composeMeta}>{tile.meta}</span> : null;
      case 'arrow': return d.showArrow && primary && fullCardLink ? <span className={styles.composeArrow} aria-hidden="true"><TileIcon name="arrow" size={20} /></span> : d.showArrow && primary ? <a className={styles.composeArrow} href={preview ? undefined : primary} aria-label={`Open ${tile.title || 'tile'}`} aria-disabled={preview || undefined} target={!preview && tile.openInNewTab ? '_blank' : undefined} rel={!preview && tile.openInNewTab ? 'noopener noreferrer' : undefined}><TileIcon name="arrow" size={20} />{tile.openInNewTab && <span className={styles.srOnly}>(opens in a new tab)</span>}</a> : null;
      default: return null;
    }
  };
  const positions: { key: string; value: FooterElement }[] = [
    { key: 'left', value: composition.footerLeft }, { key: 'center', value: composition.footerCenter }, { key: 'right', value: composition.footerRight }
  ];
  const seenElements = new Set<FooterElement>();
  const slots = positions.filter(position => {
    if (position.value === 'none' || seenElements.has(position.value)) return false;
    seenElements.add(position.value); return true;
  }).map(position => ({ ...position, child: element(position.value) })).filter(position => position.child !== null);
  // Every configured URL should remain reachable even when its action slot is
  // absent, the arrow is disabled, or a preset was applied without a label.
  if (primary && !slots.some(slot => slot.value === 'primary' || slot.value === 'arrow')) {
    slots.push({ key: 'fallback-primary', value: 'primary', child: action('primary') });
  }
  if (secondary && !slots.some(slot => slot.value === 'secondary')) {
    slots.push({ key: 'fallback-secondary', value: 'secondary', child: action('secondary') });
  }
  const footer = slots.length ? <div className={styles.composeFooter} data-anchor={composition.footerAnchor} data-align={composition.footerAlign}>
    {slots.map(slot => <div key={slot.key} className={styles.composeFooterSlot} data-position={slot.key} data-type={slot.value}>{slot.child}</div>)}
  </div> : null;

  const header = composition.headerMode !== 'none' ? <div className={styles.composeHeader} data-mode={composition.headerMode}>
    {(composition.headerMode === 'icon-top' || composition.headerMode === 'stacked') && !movableIcon ? inlineIcon(false) : null}
    {composition.headerMode === 'category-inline' && composition.iconInCategory ? inlineIcon(true) : null}
    {composition.headerMode === 'category-inline' || composition.headerMode === 'icon-top' || composition.headerMode === 'stacked' ? label() : null}
    {composition.showBadgeInHeader ? badge() : null}
  </div> : null;
  const copy = <div className={styles.composeCopy}>
    {composition.headerMode === 'icon-inline' && hasHeaderLabel ? label() : null}
    {d.layout === 'kpi' && <div className={styles.metric}>{tile.metric || '—'}</div>}
    <h3 id={heading} className={styles.composeTitle}>{tile.title || 'Untitled tile'}</h3>
    {d.showDescription && tile.description && <p className={styles.composeDescription}>{tile.description}</p>}
    {composition.showStatusInBody && (d.layout === 'status' || tile.status !== 'none') ? status() : null}
    {composition.headerMode === 'icon-inline' && composition.footerAnchor === 'flow' && d.compositionTemplate !== 'health' && footer ? footer : null}
  </div>;
  const horizontal = composition.headerMode === 'icon-inline' || movableIcon || composition.headerMode === 'category-inline' && !composition.iconInCategory && d.iconPosition === 'left';
  // Mirror the legacy card's explicit background treatment. Inline background
  // wins over Minimal's transparent preset while unset colors still inherit
  // the theme; an individual tile override wins over the section default.
  const explicitBackground = color(tile.backgroundColor, color(config.design.backgroundColor, ''));
  const cardStyles: Vars = {
    ...(explicitBackground ? { backgroundColor: explicitBackground } : {}),
    '--ts-tile-accent': color(tile.accentColor, 'var(--ts-accent)'),
    '--ts-on-accent': onAccent(color(tile.accentColor, color(d.accentColor, themeAccent)), color(tile.backgroundColor, color(config.design.backgroundColor, '#ffffff'))),
    '--ts-tile-background': color(tile.backgroundColor, 'var(--ts-surface)'),
    '--ts-tile-text': color(tile.textColor, 'var(--ts-text)'),
    '--ts-tile-muted': tile.textColor ? color(tile.textColor, 'var(--ts-muted)') : 'var(--ts-muted)',
    '--ts-tile-pad': tile.appearance.padding === undefined ? 'var(--ts-padding)' : `${d.padding}px`, '--ts-tile-radius': `${d.radius}px`,
    '--ts-tile-min': `${d.minHeight}px`, '--ts-tile-heading-size': `${d.titleSize}px`,
    '--ts-tile-heading-weight': d.titleWeight, '--ts-tile-icon-size': `${d.iconSize}px`
  };
  const newTabId = `${heading}-new-tab`;
  const content = <>
      {fullCardLink && tile.openInNewTab && <span id={newTabId} className={styles.srOnly}>Opens in a new tab</span>}
      {showVisual && <div className={styles.visual} data-aspect={d.imageAspect} data-decorative={!tile.imageAlt.trim() || undefined}>{visual && !imageFailed ? <img src={visual} alt={tile.imageAlt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : <div className={styles.visualPlaceholder} aria-hidden="true"><TileIcon name={tile.icon} size={36} /></div>}</div>}
      <div className={styles.composeBody}>
        {header}
        {horizontal ? <div className={styles.composeInline}>
          {composition.headerMode === 'icon-inline' || movableIcon ? inlineIcon(false) : null}
          {copy}
          {composition.footerAnchor === 'flow' && composition.headerMode !== 'icon-inline' ? footer : null}
        </div> : copy}
        {composition.footerAnchor === 'bottom' || d.compositionTemplate === 'health' || composition.footerAnchor === 'flow' && composition.headerMode !== 'icon-inline' && !horizontal ? footer : null}
      </div>
  </>;
  const sharedProps = {
    className: `${styles.card} ${styles.composeCard}`,
    style: cardStyles,
    'data-composition': d.compositionTemplate,
    'data-horizontal': horizontal || undefined,
    'data-icon-placement': d.iconPosition,
    'data-has-primary-link': Boolean(primary) || undefined,
    'data-align-tile': d.align,
    'data-header-mode': composition.headerMode,
    'data-tile-status': tile.status,
    'data-linked': Boolean(primary || secondary) || undefined,
    'data-has-background': !!(tile.backgroundColor || config.design.backgroundColor) || undefined,
    'aria-labelledby': heading
  };
  return <li className={styles.item}>
    {fullCardLink
      ? <a {...sharedProps} href={primary} aria-describedby={tile.openInNewTab ? newTabId : undefined} target={tile.openInNewTab ? '_blank' : undefined} rel={tile.openInNewTab ? 'noopener noreferrer' : undefined}>{content}</a>
      : <article {...sharedProps}>{content}</article>}
  </li>;
}
