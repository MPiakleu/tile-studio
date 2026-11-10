import * as React from 'react';
import { SourceSettings } from '../../models/types';
import { Field, Range } from '../EditorControls';
import { TileIcon } from '../TileIcon';
import { FIELD_LABELS } from './constants';
import { messageFromError } from './helpers';
import type { EditorController } from './useEditorController';
import styles from '../StudioEditor.module.scss';

interface Props { editor: EditorController; }
export const ConnectedSourceSection: React.FC<Props> = ({ editor }) => {
  const { config, id, dataProvider, currentSiteUrl, siteInput, updateSiteInput, setConnectionError, loadingLists, loadLists, lists, source, connectionError, loadingFields, fieldsError, setFieldRetry, fields, configRef, checking, checkConnection, connectionResult } = editor;
  return (
        <div className={styles.connectedPanel}>
            <div className={styles.infoBox}><TileIcon name="cloud" size={20} /><span>Tiles are read from SharePoint as the signed-in employee. List permissions remain the access boundary. Manual tiles are retained when you switch sources.</span></div>
            <div className={styles.formGrid}>
              <Field label="SharePoint site URL" id={id('source-site')} wide hint="Use a site in the same SharePoint tenant. Load lists to apply a different site."><div className={styles.inputAction}><input id={id('source-site')} value={siteInput} maxLength={2048} onChange={(event) => { updateSiteInput(event.target.value); }} placeholder={currentSiteUrl} /><button type="button" className={styles.secondaryButton} disabled={!dataProvider || loadingLists} onClick={() => { loadLists().catch((error: unknown) => setConnectionError(messageFromError(error))); }}>{loadingLists ? 'Loading…' : 'Load lists'}</button></div></Field>
              <Field label="Source list" id={id('source-list')} hint="Load the site’s lists, then choose the list to display."><select id={id('source-list')} value={config.source.listId} disabled={!dataProvider || loadingLists} onChange={(event) => source({ listId: event.target.value, siteUrl: config.source.siteUrl || currentSiteUrl })}><option value="">Choose a list</option>{config.source.listId && !lists.some((list) => list.id === config.source.listId) && <option value={config.source.listId}>Configured list ({config.source.listId})</option>}{lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}</select></Field>
              <Field label="Category filter" id={id('source-category')} hint="Exact category match. Leave blank to show all categories."><input id={id('source-category')} value={config.source.categoryFilter} maxLength={100} onChange={(event) => source({ categoryFilter: event.target.value })} /></Field>
              <Field label="Sort by" id={id('source-sort')}><select id={id('source-sort')} value={config.source.sortBy} onChange={(event) => source({ sortBy: event.target.value as SourceSettings['sortBy'] })}><option value="sortOrder">Sort order field</option><option value="title">Title</option><option value="modified">Last modified</option></select></Field>
              <Field label="Sort direction" id={id('source-direction')}><select id={id('source-direction')} value={config.source.sortAscending ? 'ascending' : 'descending'} onChange={(event) => source({ sortAscending: event.target.value === 'ascending' })}><option value="ascending">Ascending</option><option value="descending">Descending</option></select></Field>
              <Range label="Maximum items" id={id('source-max')} min={1} max={100} value={config.source.maxItems} suffix="" onChange={(maxItems) => source({ maxItems })} />
              <Range label="Refresh interval" id={id('source-refresh')} min={0} max={60} value={config.source.refreshMinutes} suffix=" min" hint="0 disables scheduled refresh." onChange={(refreshMinutes) => source({ refreshMinutes })} />
            </div>
            {!dataProvider && <p className={styles.hint}>Live list connections are available when this web part runs in SharePoint.</p>}
            {connectionError && <p className={styles.errorBox} role="alert">{connectionError}</p>}
            {config.source.listId && <details className={styles.detailsGroup} open><summary>Map list fields</summary><p className={styles.hint}>Choose internal list fields for each tile property. Only the title is required. Unmapped optional fields remain empty.</p>
              {loadingFields ? <p role="status">Loading list fields…</p> : fieldsError ? <div className={styles.errorBox} role="alert">{fieldsError} <button type="button" className={styles.textButton} onClick={() => setFieldRetry((count) => count + 1)}>Retry fields</button></div> : <div className={styles.formGrid}>{FIELD_LABELS.map(({ key, label }) => <Field key={key} label={label} id={id(`mapping-${key}`)}><select id={id(`mapping-${key}`)} value={config.source.mapping[key]} disabled={!dataProvider || loadingFields} onChange={(event) => source({ mapping: { ...configRef.current.source.mapping, [key]: event.target.value } })}>{key !== 'title' && <option value="">Not mapped</option>}{key === 'title' && !config.source.mapping[key] && <option value="">Choose title field</option>}{config.source.mapping[key] && !fields.some((field) => field.internalName === config.source.mapping[key]) && <option value={config.source.mapping[key]}>{config.source.mapping[key]} (configured)</option>}{fields.map((field) => <option key={field.internalName} value={field.internalName}>{field.title} · {field.internalName}</option>)}</select></Field>)}</div>}
            </details>}
            <div className={styles.inlineActions}><button type="button" className={styles.secondaryButton} disabled={!dataProvider || !config.source.listId || checking} onClick={() => { checkConnection().catch((error: unknown) => setConnectionError(messageFromError(error))); }}>{checking ? 'Checking…' : 'Check connection'}</button>{connectionResult && <span className={styles.hint} role="status">{connectionResult}</span>}</div>
        </div>
  );
};
