export type LayoutId = 'action' | 'compact' | 'list' | 'status' | 'featured' | 'image' | 'icon' | 'split' | 'kpi' | 'minimal';
export type IconName = 'tools' | 'apps' | 'project' | 'activity' | 'book' | 'people' | 'shield' | 'ticket' | 'mail' | 'printer' | 'cloud' | 'laptop' | 'arrow' | 'sparkles' | 'calendar' | 'link' | 'globe' | 'chart' | 'check' | 'info';
export type TileStatus = 'none' | 'operational' | 'degraded' | 'outage' | 'maintenance' | 'unknown';
export type CompositionTemplate = 'classic' | 'help' | 'service' | 'buttons' | 'health' | 'news' | 'resource';
export type FooterElement = 'none' | 'badge' | 'status' | 'meta' | 'primary' | 'secondary' | 'arrow';
export type ActionStyle = 'text' | 'solid' | 'outline' | 'soft';
export type CardInteraction = 'auto' | 'card' | 'actions';
export type ImagePolicy = 'tenant' | 'any-https';
export type HeaderMode = 'stacked' | 'category-inline' | 'icon-inline' | 'icon-top' | 'none';
export type VisibilityCondition = 'always' | 'has-link' | 'has-description' | 'has-badge' | 'has-status';

/** Three independently positioned footer slots; appearance never grants access. */
export interface CompositionSettings {
  headerMode: HeaderMode;
  iconInCategory: boolean;
  showCategory: boolean;
  showEyebrow: boolean;
  showBadgeInHeader: boolean;
  showStatusInBody: boolean;
  footerLeft: FooterElement;
  footerCenter: FooterElement;
  footerRight: FooterElement;
  footerAnchor: 'bottom' | 'flow';
  footerAlign: 'spread' | 'start';
}

/** A bounded subset of design settings an individual card can override. */
export interface TileAppearance {
  compositionTemplate?: CompositionTemplate;
  composition?: Partial<CompositionSettings>;
  iconPosition?: 'top' | 'left' | 'right' | 'hidden';
  iconShape?: 'rounded' | 'circle' | 'none';
  iconSize?: number;
  radius?: number;
  padding?: number;
  minHeight?: number;
  titleSize?: number;
  titleWeight?: '500' | '600' | '700' | '800';
  align?: 'left' | 'center';
  primaryStyle?: ActionStyle;
  secondaryStyle?: ActionStyle;
  statusStyle?: 'dot' | 'pill' | 'info';
  badgeStyle?: 'plain' | 'pill' | 'outline';
}

export interface SharedPresetSource {
  enabled: boolean;
  siteUrl: string;
  listId: string;
}


export interface Tile {
  id: string;
  title: string;
  description: string;
  url: string;
  openInNewTab: boolean;
  icon: IconName;
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  badge: string;
  status: TileStatus;
  metric: string;
  meta: string;
  category: string;
  visible: boolean;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  buttonLabel: string;
  secondaryLabel: string;
  secondaryUrl: string;
  secondaryNewTab: boolean;
  categoryIcon: IconName;
  visibilityCondition: VisibilityCondition;
  appearance: TileAppearance;
}

export interface DesignSettings {
  layout: LayoutId;
  columns: number;
  gap: number;
  padding: number;
  radius: number;
  borderWidth: number;
  minHeight: number;
  shadow: 'none' | 'soft' | 'medium';
  hover: 'none' | 'lift' | 'shadow' | 'outline';
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  iconBackground: string;
  iconColor: string;
  iconShape: 'rounded' | 'circle' | 'none';
  iconPosition: 'top' | 'left' | 'right' | 'hidden';
  iconSize: number;
  titleSize: number;
  descriptionSize: number;
  titleWeight: '500' | '600' | '700' | '800';
  align: 'left' | 'center';
  showDescription: boolean;
  showArrow: boolean;
  equalHeight: boolean;
  density: 'comfortable' | 'compact';
  imageAspect: 'landscape' | 'square' | 'wide';
  compositionTemplate: CompositionTemplate;
  composition: CompositionSettings;
  primaryStyle: ActionStyle;
  secondaryStyle: ActionStyle;
  statusStyle: 'dot' | 'pill' | 'info';
  badgeStyle: 'plain' | 'pill' | 'outline';
  categoryCase: 'upper' | 'normal';
  titleLineHeight: number;
  descriptionLineHeight: number;
  categorySize: number;
  metaSize: number;
  footerGap: number;
  buttonRadius: number;
  cardInteraction: CardInteraction;
}

export interface ResponsiveSettings {
  tabletColumns: number;
  mobileColumns: number;
  tabletBreakpoint: number;
  mobileBreakpoint: number;
  hideImagesOnMobile: boolean;
  compactOnMobile: boolean;
  reduceMotion: boolean;
  stackActionsOnMobile: boolean;
  hideMetaOnMobile: boolean;
  hideCategoryOnMobile: boolean;
  hideSecondaryOnMobile: boolean;
}

export interface FieldMapping {
  title: string; description: string; url: string; icon: string;
  imageUrl: string; imageAlt: string; eyebrow: string; badge: string;
  status: string; metric: string; meta: string; category: string;
  visible: string; sortOrder: string;
  buttonLabel: string; secondaryLabel: string; secondaryUrl: string;
  categoryIcon: string; visibilityCondition: string;
  compositionTemplate: string;
}

export interface SourceSettings {
  mode: 'manual' | 'sharepoint';
  siteUrl: string;
  listId: string;
  mapping: FieldMapping;
  maxItems: number;
  categoryFilter: string;
  sortBy: 'sortOrder' | 'title' | 'modified';
  sortAscending: boolean;
  refreshMinutes: number;
}

export interface SavedPreset {
  id: string;
  name: string;
  design: DesignSettings;
  responsive: ResponsiveSettings;
}

export interface TileStudioConfig {
  schemaVersion: 2;
  title: string;
  subtitle: string;
  showHeading: boolean;
  tiles: Tile[];
  design: DesignSettings;
  responsive: ResponsiveSettings;
  source: SourceSettings;
  savedPresets: SavedPreset[];
  sharedPresetSource: SharedPresetSource;
  /** New web parts use tenant-hosted images; existing configurations retain their former policy. */
  imagePolicy: ImagePolicy;
  trustedImageHosts: string;
}

export interface ThemeTokens {
  accent: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  subtle: string;
  isDark: boolean;
}

export interface ListOption { id: string; title: string; }
export interface FieldOption { internalName: string; title: string; type: string; }
export interface LoadResult { tiles: Tile[]; truncated: boolean; loadedAt: number; }
export interface TileDataProvider {
  getLists(siteUrl: string): Promise<ListOption[]>;
  getFields(siteUrl: string, listId: string): Promise<FieldOption[]>;
  loadTiles(source: SourceSettings, force?: boolean): Promise<LoadResult>;
  getSharedPresets?(source: SharedPresetSource): Promise<SavedPreset[]>;
}
