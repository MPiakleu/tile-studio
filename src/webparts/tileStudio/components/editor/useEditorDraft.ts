import * as React from 'react';
import { CompositionSettings, DesignSettings, ResponsiveSettings, TileStudioConfig } from '../../models/types';

export interface EditorDraft {
  configRef: React.MutableRefObject<TileStudioConfig>;
  change: (patch: Partial<TileStudioConfig>) => void;
  design: (patch: Partial<DesignSettings>) => void;
  composition: (patch: Partial<CompositionSettings>) => void;
  responsive: (patch: Partial<ResponsiveSettings>) => void;
}

/** All editor mutations go through one last-write-through draft. */
export const useEditorDraft = (config: TileStudioConfig, onChange: (updated: TileStudioConfig) => void): EditorDraft => {
  const configRef = React.useRef(config);
  const externalConfigRef = React.useRef(config);
  // Local state updates may rerender the property pane before SPFx supplies new props.
  // Preserve the most recent user edit until an actual external configuration arrives.
  if (externalConfigRef.current !== config) {
    externalConfigRef.current = config;
    configRef.current = config;
  }
  const change = (patch: Partial<TileStudioConfig>): void => {
    // SharePoint may batch event handlers before a React property-pane render.
    // Always apply the next edit to the latest draft, not stale props.
    const updated = { ...configRef.current, ...patch };
    configRef.current = updated;
    onChange(updated);
  };
  const design = (patch: Partial<DesignSettings>): void => change({ design: { ...configRef.current.design, ...patch } });
  const composition = (patch: Partial<CompositionSettings>): void => design({ composition: { ...configRef.current.design.composition, ...patch } });
  const responsive = (patch: Partial<ResponsiveSettings>): void => change({ responsive: { ...configRef.current.responsive, ...patch } });
  return { configRef, change, design, composition, responsive };
};
