import { FieldMapping, FooterElement } from '../../models/types';
import { EditorTab } from './types';

export const TABS: { id: EditorTab; label: string; terms: string }[] = [
  { id: 'content', label: 'Content', terms: 'title subtitle tiles add edit links URL icons image text description badge status metric category visible order sharepoint list field source' },
  { id: 'layout', label: 'Layout', terms: 'template cards grid banner featured list image split kpi minimal columns equal height' },
  { id: 'style', label: 'Style', terms: 'color brand theme background accent border radius rounding shadow hover motion typography font text padding gap icon shape placement size density image aspect action buttons border pill' },
  { id: 'responsive', label: 'Responsive', terms: 'mobile tablet phone breakpoint width compact images reduce motion responsive columns metadata secondary actions' },
  { id: 'presets', label: 'Presets', terms: 'design preset save import export json reusable config configuration organization shared list' }
];
export const FIELD_LABELS: { key: keyof FieldMapping; label: string }[] = [
  { key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }, { key: 'url', label: 'Link' },
  { key: 'icon', label: 'Icon name' }, { key: 'imageUrl', label: 'Image' }, { key: 'imageAlt', label: 'Image alternative text' },
  { key: 'eyebrow', label: 'Eyebrow' }, { key: 'badge', label: 'Badge' }, { key: 'status', label: 'Status' },
  { key: 'metric', label: 'Metric' }, { key: 'meta', label: 'Supporting detail' }, { key: 'category', label: 'Category' },
  { key: 'visible', label: 'Visible' }, { key: 'sortOrder', label: 'Sort order' },
  { key: 'buttonLabel', label: 'Primary action label' }, { key: 'secondaryLabel', label: 'Secondary action label' },
  { key: 'secondaryUrl', label: 'Secondary action link' }, { key: 'categoryIcon', label: 'Category icon' },
  { key: 'visibilityCondition', label: 'Visibility rule' }, { key: 'compositionTemplate', label: 'Composition template' }
];
export const COLORS = ['#0F766E', '#2563EB', '#7C3AED', '#B45309', '#BE123C', '#334155'];
export const FOOTER_OPTIONS: { value: FooterElement; label: string }[] = [
  { value: 'none', label: 'Empty' }, { value: 'badge', label: 'Badge' }, { value: 'status', label: 'Service status' },
  { value: 'meta', label: 'Metadata / reading time' }, { value: 'primary', label: 'Primary action' },
  { value: 'secondary', label: 'Secondary action' }, { value: 'arrow', label: 'Linked arrow' }
];
export const MAX_IMPORT_BYTES = 1024 * 1024;
