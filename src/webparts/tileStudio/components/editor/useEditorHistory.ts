import * as React from 'react';
import { TileStudioConfig } from '../../models/types';

export interface EditorHistory {
  undoConfig: TileStudioConfig | undefined;
  undoDescription: string;
  checkpoint: (description: string) => void;
  undoLast: () => void;
}

export const useEditorHistory = (
  configRef: React.MutableRefObject<TileStudioConfig>,
  change: (patch: Partial<TileStudioConfig>) => void,
  setNotice: React.Dispatch<React.SetStateAction<string>>
): EditorHistory => {
  const [undoConfig, setUndoConfig] = React.useState<TileStudioConfig>();
  const [undoDescription, setUndoDescription] = React.useState('');
  const checkpoint = (description: string): void => {
    setUndoConfig(configRef.current);
    setUndoDescription(description);
  };
  const undoLast = (): void => {
    if (!undoConfig) return;
    const previous = undoConfig;
    setUndoConfig(undefined);
    change(previous);
    setNotice(`${undoDescription} undone. Save or publish the SharePoint page when ready.`);
  };
  return { undoConfig, undoDescription, checkpoint, undoLast };
};
