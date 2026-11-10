import { CompositionSettings, CompositionTemplate, DesignSettings, Tile, TileAppearance } from './types';

/** Built-in compositions are data, not separate code paths. All regions remain editable. */
export const COMPOSITION_TEMPLATES: Record<CompositionTemplate, CompositionSettings> = {
  classic: { headerMode: 'stacked', iconInCategory: false, showCategory: true, showEyebrow: true, showBadgeInHeader: true, showStatusInBody: true, footerLeft: 'primary', footerCenter: 'none', footerRight: 'arrow', footerAnchor: 'bottom', footerAlign: 'spread' },
  help: { headerMode: 'category-inline', iconInCategory: true, showCategory: true, showEyebrow: false, showBadgeInHeader: false, showStatusInBody: false, footerLeft: 'primary', footerCenter: 'arrow', footerRight: 'meta', footerAnchor: 'bottom', footerAlign: 'spread' },
  service: { headerMode: 'category-inline', iconInCategory: true, showCategory: true, showEyebrow: false, showBadgeInHeader: false, showStatusInBody: false, footerLeft: 'badge', footerCenter: 'primary', footerRight: 'arrow', footerAnchor: 'bottom', footerAlign: 'spread' },
  buttons: { headerMode: 'icon-top', iconInCategory: false, showCategory: false, showEyebrow: false, showBadgeInHeader: false, showStatusInBody: false, footerLeft: 'primary', footerCenter: 'secondary', footerRight: 'none', footerAnchor: 'bottom', footerAlign: 'start' },
  health: { headerMode: 'icon-inline', iconInCategory: false, showCategory: false, showEyebrow: false, showBadgeInHeader: false, showStatusInBody: false, footerLeft: 'none', footerCenter: 'none', footerRight: 'status', footerAnchor: 'flow', footerAlign: 'spread' },
  news: { headerMode: 'icon-top', iconInCategory: false, showCategory: true, showEyebrow: false, showBadgeInHeader: false, showStatusInBody: false, footerLeft: 'primary', footerCenter: 'none', footerRight: 'arrow', footerAnchor: 'bottom', footerAlign: 'spread' },
  resource: { headerMode: 'icon-inline', iconInCategory: false, showCategory: false, showEyebrow: false, showBadgeInHeader: false, showStatusInBody: false, footerLeft: 'primary', footerCenter: 'arrow', footerRight: 'none', footerAnchor: 'flow', footerAlign: 'start' }
};

export const COMPOSITION_NAMES: { id: CompositionTemplate; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Original Tile Studio layout and legacy behavior' },
  { id: 'help', name: 'Help articles', description: 'Inline category, solution link, arrow and reading time' },
  { id: 'service', name: 'Service requests', description: 'Category, approval badge, action label and arrow' },
  { id: 'buttons', name: 'Action buttons', description: 'Filled, outlined or text links, including two actions' },
  { id: 'health', name: 'Service health', description: 'Horizontal content and right-aligned status pill' },
  { id: 'news', name: 'Editorial resources', description: 'Icon, uppercase category and bottom-aligned link' },
  { id: 'resource', name: 'Resource navigation', description: 'Left-hand icon with grouped copy and action' }
];

export function resolveTileAppearance(design: DesignSettings, tile: Tile): DesignSettings {
  const overrides: TileAppearance = tile.appearance || {};
  const template = overrides.compositionTemplate || design.compositionTemplate;
  // A per-tile composition template replaces the global composition baseline;
  // a per-tile partial composition then customizes its slots.
  const baseline = overrides.compositionTemplate && overrides.compositionTemplate !== design.compositionTemplate
    ? COMPOSITION_TEMPLATES[template] : design.composition;
  return { ...design, ...overrides, compositionTemplate: template,
    composition: { ...baseline, ...(overrides.composition || {}) } };
}

export function isTileEligible(tile: Tile): boolean {
  if (!tile.visible) return false;
  switch (tile.visibilityCondition) {
    case 'has-link': return Boolean(tile.url || tile.secondaryUrl);
    case 'has-description': return Boolean(tile.description.trim());
    case 'has-badge': return Boolean(tile.badge.trim());
    case 'has-status': return tile.status !== 'none' && tile.status !== 'unknown';
    default: return true;
  }
}

/** Navigation is a content decision, never a side effect of visual styling.
 * Two independent destinations cannot share a full-card anchor. */
export function resolveCardInteraction(design: DesignSettings, tile: Tile): 'card' | 'actions' {
  if (!tile.url) return 'actions';
  if (tile.secondaryUrl) return 'actions';
  if (design.cardInteraction === 'card' || design.cardInteraction === 'actions') return design.cardInteraction;
  return (tile.appearance?.compositionTemplate || design.compositionTemplate) === 'classic' ? 'card' : 'actions';
}

/** The v1 classic card is intentionally a single full-card link. Route to the
 * composed renderer as soon as an advanced appearance setting is used; otherwise
 * native controls such as button style/radius appear to do nothing. */
export function shouldRenderLegacyCard(design: DesignSettings, tile: Tile): boolean {
  const appearance = tile.appearance || {};
  return design.compositionTemplate === 'classic' &&
    Object.keys(COMPOSITION_TEMPLATES.classic).every(key =>
      design.composition[key as keyof CompositionSettings] === COMPOSITION_TEMPLATES.classic[key as keyof CompositionSettings]) &&
    Object.keys(appearance).length === 0 && !tile.secondaryUrl && !tile.category &&
    design.primaryStyle === 'text' && design.secondaryStyle === 'outline' &&
    design.badgeStyle === 'plain' && design.statusStyle === 'dot' &&
    design.categoryCase === 'upper' && design.titleLineHeight === 130 &&
    design.descriptionLineHeight === 160 && design.categorySize === 11 &&
    design.metaSize === 11 && design.footerGap === 12 && design.buttonRadius === 9;
}
