import * as React from 'react';
import { TileStudioConfig } from '../../models/types';
import { Field, Toggle } from '../EditorControls';
import type { EditorController } from './useEditorController';
import { ManualTilesSection } from './ManualTilesSection';
import { ConnectedSourceSection } from './ConnectedSourceSection';
import styles from '../StudioEditor.module.scss';

interface Props { editor: EditorController; }
export const ContentSection: React.FC<Props> = ({ editor }) => {
  const { config, id, change, source } = editor;
  return (
<div id={id('panel-content')} role="tabpanel" aria-labelledby={id('tab-content')}>
          <div className={styles.sectionHeader}><div><h3>Make it useful</h3><p>Curate your tiles here or connect a SharePoint list.</p></div><span className={styles.countPill}>{config.source.mode === 'manual' ? `${config.tiles.filter((tile) => tile.visible).length} visible` : 'Connected content'}</span></div>
          <div className={styles.headingFields}>
            <Field label="Section title" id={id('title')}><input id={id('title')} value={config.title} maxLength={120} onChange={(event) => change({ title: event.target.value })} placeholder="How can we help?" /></Field>
            <Field label="Section subtitle" id={id('subtitle')}><input id={id('subtitle')} value={config.subtitle} maxLength={300} onChange={(event) => change({ subtitle: event.target.value })} placeholder="A helpful introduction" /></Field>
            <Toggle label="Show section heading" id={id('show-heading')} value={config.showHeading} onChange={(showHeading) => change({ showHeading })} />
          </div>
          <details className={styles.detailsGroup}><summary>Image privacy and approved hosts</summary><p className={styles.hint}>Tenant-only mode prevents employees&apos; browsers from contacting unapproved external image servers. Existing web parts retain their previous HTTPS behavior unless changed.</p><div className={styles.formGrid}><Field label="Image hosting policy" id={id('image-policy')}><select id={id('image-policy')} value={config.imagePolicy} onChange={(event) => change({ imagePolicy: event.target.value as TileStudioConfig['imagePolicy'] })}><option value="tenant">Tenant host and approved hosts only</option><option value="any-https">Any HTTPS image host (legacy behavior)</option></select></Field>{config.imagePolicy === 'tenant' && <Field label="Additional approved hostnames" id={id('trusted-image-hosts')} hint="Exact hostnames, separated by commas. Example: images.contoso.com. No wildcard patterns."><input id={id('trusted-image-hosts')} value={config.trustedImageHosts} maxLength={1000} onChange={(event) => change({ trustedImageHosts: event.target.value })} placeholder="images.example.com" /></Field>}</div></details>
                    <fieldset className={styles.sourceChoice}><legend>Content source</legend>{(['manual', 'sharepoint'] as const).map((mode) => <label key={mode} className={config.source.mode === mode ? styles.selectedSource : ''}><input type="radio" name={id('source')} checked={config.source.mode === mode} onChange={() => source({ mode })} /><span>{mode === 'manual' ? 'Manual tiles' : 'SharePoint list'}</span><small>{mode === 'manual' ? 'Manage content in this web part' : 'Read content with employee permissions'}</small></label>)}</fieldset>
          {config.source.mode === 'manual' ? <ManualTilesSection editor={editor} /> : <ConnectedSourceSection editor={editor} />}
        </div>
  );
};
