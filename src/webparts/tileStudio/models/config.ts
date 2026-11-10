import { DesignSettings, FieldMapping, IconName, LayoutId, ResponsiveSettings, SavedPreset, SharedPresetSource, SourceSettings, ThemeTokens, Tile, TileAppearance, TileStudioConfig, CompositionSettings, CompositionTemplate } from './types';
import { COMPOSITION_TEMPLATES } from './composition';
import { normalizeColor, safeImage, safeLink, validFieldName } from '../services/safety';

export const MAX_TILES = 100;
export const MAX_PRESETS = 20;
export const MAX_IMPORT_BYTES = 1024 * 1024;
export const ICONS: IconName[] = ['tools', 'apps', 'project', 'activity', 'book', 'people', 'shield', 'ticket', 'mail', 'printer', 'cloud', 'laptop', 'arrow', 'sparkles', 'calendar', 'link', 'globe', 'chart', 'check', 'info'];
export const LAYOUTS: { id: LayoutId; name: string; description: string }[] = [
  { id: 'action', name: 'Action cards', description: 'A clear starting point for services and tasks.' },
  { id: 'compact', name: 'Compact tiles', description: 'Everyday shortcuts with a smaller footprint.' },
  { id: 'list', name: 'Resource list', description: 'Easy-to-scan rows for links and documentation.' },
  { id: 'status', name: 'Status banners', description: 'Explicit service states with useful context.' },
  { id: 'featured', name: 'Featured cards', description: 'Give important content a little more presence.' },
  { id: 'image', name: 'Image cards', description: 'Visual entry points for topics and resources.' },
  { id: 'icon', name: 'Icon grid', description: 'A tidy directory of destinations.' },
  { id: 'split', name: 'Split cards', description: 'An image alongside a title and description.' },
  { id: 'kpi', name: 'KPI cards', description: 'A value, its label, and the context behind it.' },
  { id: 'minimal', name: 'Minimal links', description: 'A simple, quiet list of destinations.' }
];

export const DEFAULT_THEME: ThemeTokens = { accent: '#007f78', surface: '#ffffff', text: '#20313a', muted: '#56656d', border: '#dce4e7', subtle: '#f3f7f7', isDark: false };
export const DEFAULT_DESIGN: DesignSettings = {
  layout: 'action', columns: 3, gap: 16, padding: 20, radius: 14, borderWidth: 1, minHeight: 0,
  shadow: 'soft', hover: 'lift', accentColor: '', backgroundColor: '', textColor: '', mutedColor: '', borderColor: '', iconBackground: '', iconColor: '',
  iconShape: 'rounded', iconPosition: 'top', iconSize: 24, titleSize: 19, descriptionSize: 14, titleWeight: '600',
  align: 'left', showDescription: true, showArrow: true, equalHeight: false, density: 'comfortable', imageAspect: 'landscape',
  compositionTemplate: 'classic', composition: { ...COMPOSITION_TEMPLATES.classic }, primaryStyle: 'text', secondaryStyle: 'outline', statusStyle: 'dot', badgeStyle: 'plain', categoryCase: 'upper', titleLineHeight: 130, descriptionLineHeight: 160, categorySize: 11, metaSize: 11, footerGap: 12, buttonRadius: 9, cardInteraction: 'auto'
};
export const DEFAULT_RESPONSIVE: ResponsiveSettings = { tabletColumns: 2, mobileColumns: 1, tabletBreakpoint: 900, mobileBreakpoint: 520, hideImagesOnMobile: false, compactOnMobile: true, reduceMotion: false, stackActionsOnMobile: true, hideMetaOnMobile: false, hideCategoryOnMobile: false, hideSecondaryOnMobile: false };
export const DEFAULT_MAPPING: FieldMapping = { title: 'Title', description: '', url: '', icon: '', imageUrl: '', imageAlt: '', eyebrow: '', badge: '', status: '', metric: '', meta: '', category: '', visible: '', sortOrder: '', buttonLabel: '', secondaryLabel: '', secondaryUrl: '', categoryIcon: '', visibilityCondition: '', compositionTemplate: '' };

function preset(id: string, name: string, design: Partial<DesignSettings>): SavedPreset {
  return { id, name, design: { ...DEFAULT_DESIGN, ...design, composition: { ...(design.composition || DEFAULT_DESIGN.composition) } }, responsive: { ...DEFAULT_RESPONSIVE } };
}
export const BUILT_IN_PRESETS: SavedPreset[] = [
  preset('studio-default', 'Studio essentials', {}),
  preset('it-action', 'Technology hub', { accentColor: '#007f78', radius: 16, padding: 26, gap: 20 }),
  preset('compact-topics', 'Compact topics', { layout: 'compact', columns: 4, minHeight: 100, padding: 18, iconPosition: 'left', titleSize: 16, shadow: 'none' }),
  preset('resource-library', 'Resource library', { layout: 'list', columns: 1, minHeight: 72, padding: 18, iconPosition: 'left', titleSize: 17, shadow: 'none', gap: 10 }),
  preset('service-status', 'Service status', { layout: 'status', columns: 1, minHeight: 76, padding: 20, iconPosition: 'left', shadow: 'none', hover: 'outline' }),
  preset('editorial', 'Editorial', { layout: 'featured', columns: 2, minHeight: 160, titleSize: 28, radius: 4, padding: 32, shadow: 'none', accentColor: '#1f5265' }),
  preset('visual-library', 'Visual library', { layout: 'image', columns: 3, minHeight: 0, radius: 16, padding: 22 }),
  preset('quiet-links', 'Quiet links', { layout: 'minimal', columns: 2, minHeight: 58, padding: 14, iconPosition: 'hidden', titleSize: 16, shadow: 'none', radius: 4, hover: 'outline' }),
  preset('metric-snapshot', 'Metric snapshot', { layout: 'kpi', columns: 3, minHeight: 160, padding: 24, shadow: 'none', iconPosition: 'right' }),
  preset('help-articles', 'Help article cards', { layout: 'action', columns: 2, minHeight: 0, compositionTemplate: 'help', composition: { ...COMPOSITION_TEMPLATES.help }, iconPosition: 'hidden', titleSize: 18, titleWeight: '700', shadow: 'none', gap: 18 }),
  preset('service-requests', 'Service request cards', { layout: 'action', columns: 2, minHeight: 0, compositionTemplate: 'service', composition: { ...COMPOSITION_TEMPLATES.service }, iconPosition: 'hidden', titleSize: 18, titleWeight: '700', badgeStyle: 'pill', shadow: 'none' }),
  preset('two-actions', 'Two-button cards', { layout: 'action', columns: 2, minHeight: 0, compositionTemplate: 'buttons', composition: { ...COMPOSITION_TEMPLATES.buttons }, primaryStyle: 'solid', secondaryStyle: 'outline', shadow: 'none' }),
  preset('health-indicators', 'Horizontal health', { layout: 'status', columns: 2, minHeight: 110, compositionTemplate: 'health', composition: { ...COMPOSITION_TEMPLATES.health }, statusStyle: 'info', iconPosition: 'left', padding: 18, shadow: 'none' }),
  preset('news-resources', 'Editorial news', { layout: 'featured', columns: 2, minHeight: 0, compositionTemplate: 'news', composition: { ...COMPOSITION_TEMPLATES.news }, iconPosition: 'top', titleSize: 19, shadow: 'none' }),
  preset('resource-nav', 'Resource navigation', { layout: 'compact', columns: 2, minHeight: 135, compositionTemplate: 'resource', composition: { ...COMPOSITION_TEMPLATES.resource }, iconPosition: 'left', shadow: 'none' }),
  preset('midnight', 'Midnight', { backgroundColor: '#1b2b35', textColor: '#f6fafb', mutedColor: '#c4d1d7', borderColor: '#3a505d', accentColor: '#7ce3d2', iconBackground: '#2b4650', iconColor: '#7ce3d2', shadow: 'none' })
];

let sequence = 0;
export function newId(prefix: string = 'tile'): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTile(): Tile {
  return { id: newId(), title: 'New tile', description: '', url: '', openInNewTab: false, icon: 'link', imageUrl: '', imageAlt: '', eyebrow: '', badge: '', status: 'none', metric: '', meta: '', category: '', visible: true, accentColor: '', backgroundColor: '', textColor: '', buttonLabel: '', secondaryLabel: '', secondaryUrl: '', secondaryNewTab: false, categoryIcon: 'link', visibilityCondition: 'always', appearance: {} };
}

export function createDefaultConfig(): TileStudioConfig {
  const items: { title: string; description: string; icon: IconName }[] = [
    { title: 'Fix a problem', description: 'Find clear answers and get back to your day.', icon: 'tools' },
    { title: 'Request a service', description: 'Applications, access, and the tools you need.', icon: 'apps' },
    { title: 'Start a project', description: 'Bring your next technology idea to life.', icon: 'project' },
    { title: 'Service health', description: 'Find service updates and planned maintenance.', icon: 'activity' },
    { title: 'Employee resources', description: 'Useful guides, tools, and everyday shortcuts.', icon: 'book' },
    { title: 'Security center', description: 'Practical guidance for working securely.', icon: 'shield' }
  ];
  return { schemaVersion: 2, title: 'How can we help?', subtitle: 'Your everyday technology, a little simpler.', showHeading: true,
    tiles: items.map((item, index) => ({ ...createTile(), ...item, id: `starter-${index + 1}` })),
    design: { ...DEFAULT_DESIGN, composition: { ...DEFAULT_DESIGN.composition } }, responsive: { ...DEFAULT_RESPONSIVE },
    source: { mode: 'manual', siteUrl: '', listId: '', mapping: { ...DEFAULT_MAPPING }, maxItems: 50, categoryFilter: '', sortBy: 'sortOrder', sortAscending: true, refreshMinutes: 5 },
    savedPresets: [], sharedPresetSource: { enabled: false, siteUrl: '', listId: '' }, imagePolicy: 'tenant', trustedImageHosts: '' };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, fallback: string, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : fallback;
}
function bool(value: unknown, fallback: boolean): boolean { return typeof value === 'boolean' ? value : fallback; }
function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}
function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.indexOf(value as T) !== -1 ? value as T : fallback;
}
function identifier(value: unknown, fallback: string): string { return typeof value === 'string' && /^[a-z0-9_-]{1,100}$/i.test(value) ? value : fallback; }

export function normalizeComposition(value: unknown, fallback: CompositionSettings = COMPOSITION_TEMPLATES.classic): CompositionSettings {
  const v = record(value);
  const position = ['none', 'badge', 'status', 'meta', 'primary', 'secondary', 'arrow'] as const;
  return {
    headerMode: choice(v.headerMode, ['stacked', 'category-inline', 'icon-inline', 'icon-top', 'none'], fallback.headerMode),
    iconInCategory: bool(v.iconInCategory, fallback.iconInCategory),
    showCategory: bool(v.showCategory, fallback.showCategory),
    showEyebrow: bool(v.showEyebrow, fallback.showEyebrow),
    showBadgeInHeader: bool(v.showBadgeInHeader, fallback.showBadgeInHeader),
    showStatusInBody: bool(v.showStatusInBody, fallback.showStatusInBody),
    footerLeft: choice(v.footerLeft, position, fallback.footerLeft),
    footerCenter: choice(v.footerCenter, position, fallback.footerCenter),
    footerRight: choice(v.footerRight, position, fallback.footerRight),
    footerAnchor: choice(v.footerAnchor, ['bottom', 'flow'], fallback.footerAnchor),
    footerAlign: choice(v.footerAlign, ['spread', 'start'], fallback.footerAlign)
  };
}

/** Only explicitly supported style overrides are allowed from imported/list data. */
export function normalizeTileAppearance(value: unknown): TileAppearance {
  const v = record(value), out: TileAppearance = {};
  const template = choice(v.compositionTemplate, Object.keys(COMPOSITION_TEMPLATES) as CompositionTemplate[], 'classic');
  if (typeof v.compositionTemplate === 'string' && v.compositionTemplate === template) out.compositionTemplate = template;
  if (v.composition && Object.keys(record(v.composition)).length) {
    const baseline = COMPOSITION_TEMPLATES[out.compositionTemplate || 'classic'];
    const full = normalizeComposition(v.composition, baseline);
    const raw = record(v.composition);
    const partial: Partial<CompositionSettings> = {};
    // Invalid per-tile values must be ignored, not replaced with defaults.
    // Replacing them with classic defaults overrides unrelated section settings.
    Object.keys(raw).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(full, key) && raw[key] === (full as unknown as Record<string, unknown>)[key]) {
        (partial as Record<string, unknown>)[key] = raw[key];
      }
    });
    if (Object.keys(partial).length) out.composition = partial;
  }
  if (typeof v.iconPosition === 'string' && (['top', 'left', 'right', 'hidden'] as readonly string[]).includes(v.iconPosition)) out.iconPosition = v.iconPosition as NonNullable<TileAppearance['iconPosition']>;
  if (typeof v.iconShape === 'string' && (['rounded', 'circle', 'none'] as readonly string[]).includes(v.iconShape)) out.iconShape = v.iconShape as NonNullable<TileAppearance['iconShape']>;
  if (typeof v.iconSize === 'number') out.iconSize = number(v.iconSize, 24, 16, 64);
  if (typeof v.radius === 'number') out.radius = number(v.radius, 14, 0, 48);
  if (typeof v.padding === 'number') out.padding = number(v.padding, 24, 0, 80);
  if (typeof v.minHeight === 'number') out.minHeight = number(v.minHeight, 190, 0, 600);
  if (typeof v.titleSize === 'number') out.titleSize = number(v.titleSize, 19, 12, 48);
  if (typeof v.titleWeight === 'string' && (['500', '600', '700', '800'] as readonly string[]).includes(v.titleWeight)) out.titleWeight = v.titleWeight as NonNullable<TileAppearance['titleWeight']>;
  if (typeof v.align === 'string' && (['left', 'center'] as readonly string[]).includes(v.align)) out.align = v.align as NonNullable<TileAppearance['align']>;
  if (typeof v.primaryStyle === 'string' && (['text', 'solid', 'outline', 'soft'] as readonly string[]).includes(v.primaryStyle)) out.primaryStyle = v.primaryStyle as NonNullable<TileAppearance['primaryStyle']>;
  if (typeof v.secondaryStyle === 'string' && (['text', 'solid', 'outline', 'soft'] as readonly string[]).includes(v.secondaryStyle)) out.secondaryStyle = v.secondaryStyle as NonNullable<TileAppearance['secondaryStyle']>;
  if (typeof v.statusStyle === 'string' && (['dot', 'pill', 'info'] as readonly string[]).includes(v.statusStyle)) out.statusStyle = v.statusStyle as NonNullable<TileAppearance['statusStyle']>;
  if (typeof v.badgeStyle === 'string' && (['plain', 'pill', 'outline'] as readonly string[]).includes(v.badgeStyle)) out.badgeStyle = v.badgeStyle as NonNullable<TileAppearance['badgeStyle']>;
  return out;
}

export function normalizeSharedPresetSource(value: unknown): SharedPresetSource {
  const v = record(value);
  return { enabled: bool(v.enabled, false), siteUrl: text(v.siteUrl, '', 2048).trim(), listId: text(v.listId, '', 64).trim() };
}

export function normalizeDesign(value: unknown): DesignSettings {
  const v = record(value), d = DEFAULT_DESIGN;
  return {
    layout: choice(v.layout, LAYOUTS.map(item => item.id), d.layout), columns: number(v.columns, d.columns, 1, 6), gap: number(v.gap, d.gap, 0, 64), padding: number(v.padding, d.padding, 0, 80),
    radius: number(v.radius, d.radius, 0, 48), borderWidth: number(v.borderWidth, d.borderWidth, 0, 4), minHeight: number(v.minHeight, d.minHeight, 0, 600),
    shadow: choice(v.shadow, ['none', 'soft', 'medium'], d.shadow), hover: choice(v.hover, ['none', 'lift', 'shadow', 'outline'], d.hover),
    accentColor: normalizeColor(v.accentColor), backgroundColor: normalizeColor(v.backgroundColor), textColor: normalizeColor(v.textColor), mutedColor: normalizeColor(v.mutedColor), borderColor: normalizeColor(v.borderColor), iconBackground: normalizeColor(v.iconBackground), iconColor: normalizeColor(v.iconColor),
    iconShape: choice(v.iconShape, ['rounded', 'circle', 'none'], d.iconShape), iconPosition: choice(v.iconPosition, ['top', 'left', 'right', 'hidden'], d.iconPosition), iconSize: number(v.iconSize, d.iconSize, 16, 64),
    titleSize: number(v.titleSize, d.titleSize, 12, 48), descriptionSize: number(v.descriptionSize, d.descriptionSize, 12, 24), titleWeight: choice(v.titleWeight, ['500', '600', '700', '800'], d.titleWeight), align: choice(v.align, ['left', 'center'], d.align),
    showDescription: bool(v.showDescription, d.showDescription), showArrow: bool(v.showArrow, d.showArrow), equalHeight: bool(v.equalHeight, d.equalHeight), density: choice(v.density, ['comfortable', 'compact'], d.density), imageAspect: choice(v.imageAspect, ['landscape', 'square', 'wide'], d.imageAspect),
    compositionTemplate: choice(v.compositionTemplate, Object.keys(COMPOSITION_TEMPLATES) as CompositionTemplate[], d.compositionTemplate),
    composition: normalizeComposition(v.composition, COMPOSITION_TEMPLATES[choice(v.compositionTemplate, Object.keys(COMPOSITION_TEMPLATES) as CompositionTemplate[], d.compositionTemplate)]),
    primaryStyle: choice(v.primaryStyle, ['text', 'solid', 'outline', 'soft'], d.primaryStyle), secondaryStyle: choice(v.secondaryStyle, ['text', 'solid', 'outline', 'soft'], d.secondaryStyle),
    statusStyle: choice(v.statusStyle, ['dot', 'pill', 'info'], d.statusStyle), badgeStyle: choice(v.badgeStyle, ['plain', 'pill', 'outline'], d.badgeStyle),
    categoryCase: choice(v.categoryCase, ['upper', 'normal'], d.categoryCase),
    titleLineHeight: number(v.titleLineHeight, d.titleLineHeight, 100, 200), descriptionLineHeight: number(v.descriptionLineHeight, d.descriptionLineHeight, 115, 220),
    categorySize: number(v.categorySize, d.categorySize, 10, 20), metaSize: number(v.metaSize, d.metaSize, 10, 18),
    footerGap: number(v.footerGap, d.footerGap, 0, 36), buttonRadius: number(v.buttonRadius, d.buttonRadius, 0, 40),
    cardInteraction: choice(v.cardInteraction, ['auto', 'card', 'actions'], d.cardInteraction)
  };
}

export function normalizeResponsive(value: unknown): ResponsiveSettings {
  const v = record(value), d = DEFAULT_RESPONSIVE;
  const mobileBreakpoint = number(v.mobileBreakpoint, d.mobileBreakpoint, 320, 700);
  return { tabletColumns: number(v.tabletColumns, d.tabletColumns, 1, 4), mobileColumns: number(v.mobileColumns, d.mobileColumns, 1, 2), mobileBreakpoint,
    tabletBreakpoint: Math.max(mobileBreakpoint + 100, number(v.tabletBreakpoint, d.tabletBreakpoint, 600, 1400)), hideImagesOnMobile: bool(v.hideImagesOnMobile, d.hideImagesOnMobile), compactOnMobile: bool(v.compactOnMobile, d.compactOnMobile), reduceMotion: bool(v.reduceMotion, d.reduceMotion),
    stackActionsOnMobile: bool(v.stackActionsOnMobile, d.stackActionsOnMobile), hideMetaOnMobile: bool(v.hideMetaOnMobile, d.hideMetaOnMobile),
    hideCategoryOnMobile: bool(v.hideCategoryOnMobile, d.hideCategoryOnMobile), hideSecondaryOnMobile: bool(v.hideSecondaryOnMobile, d.hideSecondaryOnMobile) };
}

export function normalizeTile(value: unknown): Tile {
  const v = record(value), t = createTile();
  return { id: identifier(v.id, t.id), title: text(v.title, '', 180), description: text(v.description, '', 1600),
    url: safeLink(text(v.url, '', 2048)) || '', imageUrl: safeImage(text(v.imageUrl, '', 2048)) || '', imageAlt: text(v.imageAlt, '', 300),
    openInNewTab: bool(v.openInNewTab, false), icon: choice(v.icon, ICONS, 'link'), eyebrow: text(v.eyebrow, '', 100), badge: text(v.badge, '', 80),
    status: choice(v.status, ['none', 'operational', 'degraded', 'outage', 'maintenance', 'unknown'], 'none'), metric: text(v.metric, '', 60), meta: text(v.meta, '', 250), category: text(v.category, '', 120), visible: bool(v.visible, true),
    accentColor: normalizeColor(v.accentColor), backgroundColor: normalizeColor(v.backgroundColor), textColor: normalizeColor(v.textColor), buttonLabel: text(v.buttonLabel, '', 80), secondaryLabel: text(v.secondaryLabel, '', 80), secondaryUrl: safeLink(text(v.secondaryUrl, '', 2048)) || '',
    secondaryNewTab: bool(v.secondaryNewTab, false), categoryIcon: choice(v.categoryIcon, ICONS, 'link'),
    visibilityCondition: choice(v.visibilityCondition, ['always', 'has-link', 'has-description', 'has-badge', 'has-status'], 'always'),
    appearance: normalizeTileAppearance(v.appearance) };
}

export function normalizeSource(value: unknown): SourceSettings {
  const v = record(value), raw = record(v.mapping), mapping = { ...DEFAULT_MAPPING };
  (Object.keys(mapping) as (keyof FieldMapping)[]).forEach(key => {
    const candidate = text(raw[key], mapping[key], 128);
    mapping[key] = validFieldName(candidate) ? candidate : (key === 'title' ? 'Title' : '');
  });
  return { mode: choice(v.mode, ['manual', 'sharepoint'], 'manual'), siteUrl: text(v.siteUrl, '', 2048).trim(), listId: text(v.listId, '', 64).trim(), mapping,
    maxItems: number(v.maxItems, 50, 1, MAX_TILES), categoryFilter: text(v.categoryFilter, '', 120), sortBy: choice(v.sortBy, ['sortOrder', 'title', 'modified'], 'sortOrder'), sortAscending: bool(v.sortAscending, true), refreshMinutes: number(v.refreshMinutes, 5, 0, 60) };
}

export function normalizeConfig(value: unknown): TileStudioConfig {
  const v = record(value);
  if (v.schemaVersion !== undefined && v.schemaVersion !== 1 && v.schemaVersion !== 2) throw new Error('Unsupported Tile Studio configuration version. Update the web part before opening this design.');
  const defaults = createDefaultConfig();
  const seen = new Set<string>();
  const tiles = (Array.isArray(v.tiles) ? v.tiles : defaults.tiles).slice(0, MAX_TILES).map(item => {
    const tile = normalizeTile(item);
    if (seen.has(tile.id)) tile.id = newId();
    seen.add(tile.id);
    return tile;
  });
  const presetIds = new Set<string>();
  const savedPresets = (Array.isArray(v.savedPresets) ? v.savedPresets : []).slice(0, MAX_PRESETS).map(item => {
    const p = record(item);
    let id = identifier(p.id, newId('preset'));
    if (presetIds.has(id)) id = newId('preset');
    presetIds.add(id);
    return { id, name: text(p.name, 'Saved design', 80), design: normalizeDesign(p.design), responsive: normalizeResponsive(p.responsive) };
  });
  return { schemaVersion: 2, title: text(v.title, defaults.title, 180), subtitle: text(v.subtitle, defaults.subtitle, 500), showHeading: bool(v.showHeading, true), tiles,
    design: normalizeDesign(v.design), responsive: normalizeResponsive(v.responsive), source: normalizeSource(v.source), savedPresets, sharedPresetSource: normalizeSharedPresetSource(v.sharedPresetSource),
    imagePolicy: choice(v.imagePolicy, ['tenant', 'any-https'], 'any-https'),
    trustedImageHosts: text(v.trustedImageHosts, '', 1000).toLowerCase() };
}

export function exportConfig(config: TileStudioConfig): string {
  return JSON.stringify({ kind: 'tile-studio-config', schemaVersion: 2, config: normalizeConfig(config) }, undefined, 2);
}

export function parseImport(value: string): TileStudioConfig {
  if (new TextEncoder().encode(value).length > MAX_IMPORT_BYTES) throw new Error('Import is too large. The maximum size is 1 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error('This file is not valid JSON. Choose an exported Tile Studio configuration.'); }
  const envelope = record(parsed);
  if ((envelope.schemaVersion !== 1 && envelope.schemaVersion !== 2) || (envelope.kind !== undefined && envelope.kind !== 'tile-studio-config')) throw new Error('Unsupported configuration format or schema version.');
  const config = record(envelope.kind ? envelope.config : envelope);
  if ((config.schemaVersion !== 1 && config.schemaVersion !== 2) || !Array.isArray(config.tiles) || !config.design || !config.source) throw new Error('This file does not contain a complete Tile Studio configuration.');
  if (config.tiles.length > MAX_TILES || (Array.isArray(config.savedPresets) && config.savedPresets.length > MAX_PRESETS)) throw new Error('Import exceeds the limit of 100 tiles or 20 saved presets.');
  return normalizeConfig(config);
}

export function applyPreset(config: TileStudioConfig, presetToApply: SavedPreset): TileStudioConfig {
  return normalizeConfig({ ...config, design: presetToApply.design, responsive: presetToApply.responsive });
}
