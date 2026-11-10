import { TileDataProvider, TileStudioConfig, ThemeTokens } from '../../models/types';

export type EditorTab = 'content' | 'layout' | 'style' | 'responsive' | 'presets';

/** Ephemeral UI state: kept across SPFx property-pane host replacements. */
export interface StudioEditorUiState {
  tab: EditorTab;
  selectedId: string;
  search: string;
}

export interface StudioEditorProps {
  initialUiState?: StudioEditorUiState;
  onUiStateChange?: (uiState: StudioEditorUiState) => void;
  config: TileStudioConfig;
  onChange: (config: TileStudioConfig) => void;
  onClose: () => void;
  dataProvider?: TileDataProvider;
  currentSiteUrl: string;
  theme?: ThemeTokens;
  instanceId: string;
}
