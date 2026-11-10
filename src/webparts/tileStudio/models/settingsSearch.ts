/** Field-level navigation in the constrained native SharePoint property pane. */
export type SettingsTab = 'content' | 'layout' | 'style' | 'responsive' | 'presets';
export interface SettingLocation { id: string; label: string; tab: SettingsTab; terms?: string; mode?: 'manual' | 'sharepoint'; }
const records: SettingLocation[] = [
  ...[['title', 'Section title'], ['subtitle', 'Section subtitle'], ['show-heading', 'Show heading'], ['tile-title', 'Tile title'], ['tile-description', 'Tile description'], ['tile-url', 'Tile destination URL'], ['tile-image', 'Image URL'], ['tile-visible', 'Tile visibility'], ['tile-background', 'Tile background color'], ['tile-accent', 'Tile accent color'], ['tile-text', 'Tile text color'], ['tile-secondary-url', 'Secondary action destination'], ['tile-status', 'Tile status'], ['tile-composition', 'Tile composition']].map(([id,label]) => ({ id, label, tab: 'content' as const, mode: 'manual' as const })),
  ...[['source-site','SharePoint site URL'], ['source-list','Source list'], ['source-sort','Sort order'], ['source-category','Category filter'], ['source-refresh','Refresh interval'], ['source-max','Maximum items']].map(([id,label]) => ({ id,label,tab:'content' as const,mode: 'sharepoint' as const })),
  ...[['image-policy','External image privacy policy'], ['trusted-image-hosts','Approved image hostnames']].map(([id,label]) => ({ id,label,tab:'content' as const })),
  ...[['composition-template','Composition template'], ['card-interaction','Card navigation behavior'], ['columns','Desktop columns'], ['equal-height','Equal height cards'], ['min-height','Minimum height'], ['footer-anchor','Footer position']].map(([id,label]) => ({id,label,tab:'layout' as const})),
  ...[['accent','Accent color'], ['background','Background color'], ['text','Text color'], ['muted','Supporting text color'], ['border-color','Border color'], ['button-radius','Button radius'], ['padding','Card padding'], ['gap','Card gap'], ['hover','Hover feedback'], ['shadow','Card shadow'], ['description-size','Description size']].map(([id,label]) => ({id,label,tab:'style' as const})),
  ...[['tablet-columns','Tablet columns'], ['mobile-columns','Mobile columns'], ['tablet-breakpoint','Tablet breakpoint'], ['mobile-breakpoint','Mobile breakpoint'], ['mobile-compact','Compact on mobile'], ['reduce-motion','Reduced motion'], ['mobile-action-stack','Stack actions on mobile']].map(([id,label]) => ({id,label,tab:'responsive' as const})),
  ...[['preset-name','Save a design'], ['shared-enabled','Shared preset library'], ['import-file','Import configuration file'], ['import-json','Import JSON']].map(([id,label]) => ({id,label,tab:'presets' as const}))
];
export const SETTINGS: readonly SettingLocation[] = records;
export function searchSettings(input: string): SettingLocation[] {
  const words = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return SETTINGS.filter(item => words.every(word => `${item.label} ${item.id.replace(/-/g,' ')} ${item.terms || ''} ${item.tab}`.toLowerCase().includes(word))).slice(0, 12);
}
