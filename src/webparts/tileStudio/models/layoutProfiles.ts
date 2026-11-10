import { DEFAULT_DESIGN } from './config';
import { DesignSettings, LayoutId } from './types';

/**
 * Structural defaults for the ten actual layout choices. These are distinct
 * from composition templates (which control where content and actions live).
 * The gallery and the SharePoint property-pane selector MUST use the same
 * profiles, or the thumbnails promise a design the web part cannot reproduce.
 */
export const LAYOUT_PROFILES: Record<LayoutId, Partial<DesignSettings>> = {
  action: { columns: 3, minHeight: 0 },
  compact: { columns: 4, minHeight: 80, padding: 14, iconPosition: 'left', titleSize: 16, shadow: 'none' },
  list: { columns: 1, minHeight: 60, padding: 16, iconPosition: 'left', titleSize: 17, gap: 10, shadow: 'none' },
  status: { columns: 1, minHeight: 76, padding: 18, iconPosition: 'left', shadow: 'none' },
  featured: { columns: 2, minHeight: 150, titleSize: 27, radius: 6, padding: 30, shadow: 'none' },
  image: { columns: 3, minHeight: 0, padding: 22 },
  icon: { columns: 4, minHeight: 90, titleSize: 16, iconShape: 'circle', align: 'center', showDescription: false, showArrow: false },
  split: { columns: 2, minHeight: 0, padding: 22, titleSize: 19 },
  kpi: { columns: 3, minHeight: 105, iconPosition: 'right', shadow: 'none' },
  minimal: { columns: 1, minHeight: 0, padding: 12, titleSize: 16, iconPosition: 'hidden', showDescription: false, shadow: 'none', radius: 0, hover: 'outline' }
};

/**
 * Choosing a layout changes STRUCTURAL presentation settings as a group.
 * User content, colors, typography choices outside this group, navigation,
 * composition templates, and all per-tile overrides remain untouched.
 * The editor explains this explicitly so no change is silent.
 */
export function layoutSelectionPatch(layout: LayoutId): Partial<DesignSettings> {
  return {
    layout,
    columns: DEFAULT_DESIGN.columns,
    minHeight: DEFAULT_DESIGN.minHeight,
    padding: DEFAULT_DESIGN.padding,
    gap: DEFAULT_DESIGN.gap,
    iconPosition: DEFAULT_DESIGN.iconPosition,
    iconShape: DEFAULT_DESIGN.iconShape,
    titleSize: DEFAULT_DESIGN.titleSize,
    radius: DEFAULT_DESIGN.radius,
    shadow: DEFAULT_DESIGN.shadow,
    hover: DEFAULT_DESIGN.hover,
    align: DEFAULT_DESIGN.align,
    showDescription: DEFAULT_DESIGN.showDescription,
    showArrow: DEFAULT_DESIGN.showArrow,
    ...LAYOUT_PROFILES[layout]
  };
}
