import * as React from 'react';
import { FieldOption, ListOption, SourceSettings, TileDataProvider, TileStudioConfig } from '../../models/types';
import { messageFromError } from './helpers';

interface Dependencies {
  config: TileStudioConfig;
  configRef: React.MutableRefObject<TileStudioConfig>;
  change: (patch: Partial<TileStudioConfig>) => void;
  dataProvider?: TileDataProvider;
  currentSiteUrl: string;
  alive: React.MutableRefObject<boolean>;
}

export interface SourceEditorState {
  siteInput: string;
  updateSiteInput: (text: string) => void;
  lists: ListOption[];
  fields: FieldOption[];
  loadingLists: boolean;
  loadingFields: boolean;
  checking: boolean;
  connectionError: string;
  setConnectionError: React.Dispatch<React.SetStateAction<string>>;
  fieldsError: string;
  connectionResult: string;
  setFieldRetry: React.Dispatch<React.SetStateAction<number>>;
  source: (patch: Partial<SourceSettings>) => void;
  loadLists: () => Promise<void>;
  checkConnection: () => Promise<void>;
}

export const useSourceEditor = ({ config, configRef, change, dataProvider, currentSiteUrl, alive }: Dependencies): SourceEditorState => {
  const [siteInput, setSiteInput] = React.useState(config.source.siteUrl || currentSiteUrl);
  const [lists, setLists] = React.useState<ListOption[]>([]);
  const [fields, setFields] = React.useState<FieldOption[]>([]);
  const [loadingLists, setLoadingLists] = React.useState(false);
  const [loadingFields, setLoadingFields] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState('');
  const [fieldsError, setFieldsError] = React.useState('');
  const [connectionResult, setConnectionResult] = React.useState('');
  const [fieldRetry, setFieldRetry] = React.useState(0);
  const request = React.useRef(0);
  const checkRequest = React.useRef(0);
  React.useEffect(() => {
    return () => { request.current += 1; checkRequest.current += 1; };
  }, []);
  React.useEffect(() => { setSiteInput(config.source.siteUrl || currentSiteUrl); }, [config.source.siteUrl, currentSiteUrl]);
  const source = (patch: Partial<SourceSettings>): void => {
    setConnectionResult(''); setChecking(false); checkRequest.current += 1;
    change({ source: { ...configRef.current.source, ...patch } });
  };
  React.useEffect(() => {
    let cancelled = false;
    setFields([]); setFieldsError('');
    if (!dataProvider || config.source.mode !== 'sharepoint' || !config.source.listId) { setLoadingFields(false); return; }
    setLoadingFields(true);
    dataProvider.getFields(config.source.siteUrl || currentSiteUrl, config.source.listId).then((result) => {
      if (!cancelled) { setFields(result); setLoadingFields(false); }
    }).catch((error: unknown) => { if (!cancelled) { setFieldsError(messageFromError(error)); setLoadingFields(false); } });
    return () => { cancelled = true; };
  }, [config.source.mode, config.source.siteUrl, config.source.listId, currentSiteUrl, dataProvider, fieldRetry]);

  const loadLists = async (): Promise<void> => {
    if (!dataProvider) return;
    const sequence = ++request.current;
    setLoadingLists(true); setConnectionError(''); setConnectionResult('');
    try {
      const nextSite = siteInput.trim() || currentSiteUrl;
      const result = await dataProvider.getLists(nextSite);
      if (!alive.current || sequence !== request.current) return;
      setLists(result);
      if (nextSite !== (configRef.current.source.siteUrl || currentSiteUrl)) source({ siteUrl: nextSite, listId: '' });
      if (result.length === 0) setConnectionResult('No supported lists were found at this site.');
    } catch (error) { if (alive.current && sequence === request.current) setConnectionError(messageFromError(error)); }
    finally { if (alive.current && sequence === request.current) setLoadingLists(false); }
  };

  const checkConnection = async (): Promise<void> => {
    if (!dataProvider) return;
    const sequence = ++checkRequest.current;
    setChecking(true); setConnectionError(''); setConnectionResult('');
    try {
      const result = await dataProvider.loadTiles(configRef.current.source, true);
      if (!alive.current || sequence !== checkRequest.current) return;
      setConnectionResult(`${result.tiles.length} visible tile${result.tiles.length === 1 ? '' : 's'} loaded.${result.truncated ? ' The item limit was reached; additional rows may exist.' : ''}`);
    } catch (error) { if (alive.current && sequence === checkRequest.current) setConnectionError(messageFromError(error)); }
    finally { if (alive.current && sequence === checkRequest.current) setChecking(false); }
  };


  // An in-progress load must never overwrite a freshly edited URL.
  const updateSiteInput = (text: string): void => {
    setSiteInput(text);
    request.current += 1;
    setLoadingLists(false);
    setLists([]);
    setConnectionError('');
    setConnectionResult('');
    setChecking(false);
    checkRequest.current += 1;
  };
  return {
    siteInput, updateSiteInput, lists, fields, loadingLists, loadingFields,
    checking, connectionError, setConnectionError, fieldsError, connectionResult,
    setFieldRetry, source, loadLists, checkConnection
  };
};
