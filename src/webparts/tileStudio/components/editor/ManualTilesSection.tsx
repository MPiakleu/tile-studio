import * as React from 'react';
import type { EditorController } from './useEditorController';
import { TileNavigator } from './TileNavigator';
import { TileDetailsForm } from './TileDetailsForm';
import styles from '../StudioEditor.module.scss';

interface Props { editor: EditorController; }
/** Two-column manual authoring workspace; children own their individual workflows. */
export const ManualTilesSection: React.FC<Props> = ({ editor }) => (
  <div className={styles.contentGrid}>
    <TileNavigator editor={editor} />
    <TileDetailsForm editor={editor} />
  </div>
);
