import { FieldMapping, FieldOption, ListOption, LoadResult, SharedPresetSource, SavedPreset, SourceSettings, Tile, TileDataProvider } from '../models/types';
import { normalizeDesign, normalizeResponsive, normalizeSource, normalizeTile } from '../models/config';
import { escapeOData, safeLink, validateListId, validateSiteUrl, validFieldName } from './safety';

// eslint-disable-next-line @rushstack/no-new-null -- The native browser Headers.get API returns string | null.
export interface DataResponse { ok: boolean; status: number; headers?: { get(name: string): string | null }; json(): Promise<unknown>; }
export type DataRequest = (url: string, signal?: AbortSignal) => Promise<DataResponse>;
type Row = Record<string, unknown>;
function object(value: unknown): Row { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function scalar(value: unknown): string { return typeof value === 'string' || typeof value === 'number' ? String(value) : ''; }

export class ListDataError extends Error {
  public readonly status: number;
  public constructor(message: string, status: number = 0) { super(message); this.name = 'ListDataError'; this.status = status; }
}

export function buildItemsUrl(sourceInput: SourceSettings, currentSiteUrl: string): string {
  const source = normalizeSource(sourceInput);
  const site = validateSiteUrl(source.siteUrl, currentSiteUrl);
  const listId = validateListId(source.listId);
  if (source.categoryFilter && !source.mapping.category) throw new Error('Map a category column before using a category filter.');
  const fields = ['Id', ...Object.keys(source.mapping).map(key => source.mapping[key as keyof FieldMapping]).filter(Boolean)];
  if (fields.some(field => !validFieldName(field))) throw new Error('A mapped column has an invalid internal name.');
  const selected = Array.from(new Set(fields));
  const orderField = source.sortBy === 'modified' ? 'Modified' : source.sortBy === 'title' ? source.mapping.title : source.mapping.sortOrder;
  if (orderField && selected.indexOf(orderField) === -1) selected.push(orderField);
  const params = new URLSearchParams();
  params.set('$select', selected.join(','));
  params.set('$top', String(Math.min(source.maxItems + 1, 101)));
  params.set('$orderby', orderField ? `${orderField} ${source.sortAscending ? 'asc' : 'desc'},Id asc` : 'Id asc');
  if (source.categoryFilter && source.mapping.category) params.set('$filter', `${source.mapping.category} eq '${escapeOData(source.categoryFilter)}'`);
  return `${site}/_api/web/lists(guid'${listId}')/items?${params.toString()}`;
}

export function validateNextLink(value: string, firstUrl: string): string {
  const first = new URL(firstUrl);
  const cleaned = safeLink(value);
  if (!cleaned) throw new ListDataError('SharePoint returned an invalid next-page link.');
  const next = new URL(cleaned, first);
  // Pagination must stay on exactly the same REST collection, not just the same hostname.
  if (next.origin !== first.origin || next.pathname !== first.pathname || next.username || next.password || next.hash) throw new ListDataError('SharePoint returned a next-page link outside the selected list.');
  return next.href;
}

export function mapListItem(value: unknown, mapping: FieldMapping): Tile {
  const row = object(value);
  const get = (key: keyof FieldMapping): unknown => mapping[key] ? row[mapping[key]] : undefined;
  const hyperlink = object(get('url'));
  const image = object(get('imageUrl'));
  const visibility = get('visible');
  const secondary = object(get('secondaryUrl'));
  const visible = !(visibility === false || visibility === 0 || (typeof visibility === 'string' && /^(false|no|0)$/i.test(visibility.trim())));
  const rawStatus = scalar(get('status')).trim().toLowerCase();
  return normalizeTile({
    id: `list-${scalar(row.Id || row.ID)}`,
    title: scalar(get('title')), description: scalar(get('description')), url: scalar(hyperlink.Url || get('url')),
    imageUrl: scalar(image.Url || get('imageUrl')), imageAlt: scalar(get('imageAlt')) || scalar(image.Description),
    icon: scalar(get('icon')).toLowerCase(), eyebrow: scalar(get('eyebrow')), badge: scalar(get('badge')),
    status: rawStatus && ['operational', 'degraded', 'outage', 'maintenance', 'unknown', 'none'].indexOf(rawStatus) === -1 ? 'unknown' : rawStatus,
    metric: scalar(get('metric')), meta: scalar(get('meta')), category: scalar(get('category')), visible,
    buttonLabel: scalar(get('buttonLabel')), secondaryLabel: scalar(get('secondaryLabel')),
    secondaryUrl: scalar(secondary.Url || get('secondaryUrl')), categoryIcon: scalar(get('categoryIcon')).toLowerCase(),
    visibilityCondition: scalar(get('visibilityCondition')).toLowerCase(),
    appearance: scalar(get('compositionTemplate')) ? { compositionTemplate: scalar(get('compositionTemplate')).toLowerCase() } : {}
  });
}

/** Per-instance memory only. SharePoint authorizes each GET as the current employee. */
export class ListDataClient implements TileDataProvider {
  private readonly cache = new Map<string, { value: LoadResult; expires: number }>();
  private readonly pending = new Map<string, Promise<LoadResult>>();
  private readonly generations = new Map<string, number>();

  public constructor(private readonly currentSiteUrl: string, private readonly request: DataRequest) {}

  private readonly controllers = new Set<AbortController>();
  private disposed = false;

  public dispose(): void {
    this.disposed = true;
    this.controllers.forEach(controller => controller.abort());
    this.controllers.clear(); this.pending.clear(); this.cache.clear(); this.generations.clear();
  }

  private async get(url: string): Promise<Row> {
    for (let attempt = 0; attempt <= 2; attempt += 1) {
      if (this.disposed) throw new ListDataError('The SharePoint connection was closed.');
      const controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
      if (controller) this.controllers.add(controller);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const fetchAndRead = async (): Promise<Row> => {
          const response = await this.request(url, controller?.signal);
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              this.cache.clear();
              throw new ListDataError('You do not have access to the selected SharePoint list, or your session has expired.', response.status);
            }
            if (response.status === 404) throw new ListDataError('The selected SharePoint site or list could not be found.', 404);
            if (response.status === 429 || response.status === 503) {
              // SharePoint can supply seconds or an RFC date; cap the wait to
              // avoid keeping a property pane unresponsive for too long.
              const retryAfter = response.headers?.get('Retry-After');
              let wait = Number(retryAfter);
              if (retryAfter && !Number.isFinite(wait)) wait = (Date.parse(retryAfter) - Date.now()) / 1000;
              // Do not retry earlier than a server-specified longer cooldown.
              // Defer to a manual retry instead of holding a pane for minutes.
              if (retryAfter && Number.isFinite(wait) && wait > 8) {
                throw new ListDataError(`SharePoint requested a ${Math.ceil(wait)}-second cooldown. Please retry after that interval.`, response.status);
              }
              const backoff = Number.isFinite(wait) && wait >= 0 && retryAfter
                ? Math.min(8000, wait * 1000) : Math.min(8000, 600 * Math.pow(2, attempt));
              const error = new ListDataError('SharePoint is temporarily busy. Please try again shortly.', response.status) as ListDataError & { retryDelay?: number };
              error.retryDelay = backoff;
              throw error;
            }
            if (response.status === 400 || response.status === 500) throw new ListDataError('SharePoint could not run this query. Check the column mappings and indexed filters with the list owner.', response.status);
            throw new ListDataError('The SharePoint list could not be loaded. Try again or contact the list owner.', response.status);
          }
          const body = object(await response.json());
          if (this.disposed) throw new ListDataError('The SharePoint connection was closed.');
          return body;
        };
        return await Promise.race([
          fetchAndRead(),
          new Promise<never>((_resolve, reject) => { timer = setTimeout(() => {
            controller?.abort();
            reject(new ListDataError('SharePoint took too long to respond. Try again.'));
          }, 20000); })
        ]);
      } catch (error) {
        const failure = error as ListDataError & { retryDelay?: number };
        if (this.disposed || (failure.status !== 429 && failure.status !== 503) || failure.retryDelay === undefined || attempt === 2) throw error;
        const delay = Math.max(0, failure.retryDelay + Math.floor(Math.random() * 150));
        await new Promise<void>((resolve, reject) => {
          if (this.disposed || controller?.signal.aborted) {
            reject(new ListDataError('The SharePoint connection was closed.'));
            return;
          }
          // Schedule first so the abort callback closes over a const timer.
          // This satisfies both no-use-before-define and prefer-const.
          const handle = setTimeout(resolve, delay);
          const aborted = (): void => {
            clearTimeout(handle);
            reject(new ListDataError('The SharePoint connection was closed.'));
          };
          controller?.signal.addEventListener('abort', aborted, { once: true });
          // Covers disposal between the initial check and listener setup.
          if (this.disposed || controller?.signal.aborted) aborted();
        });
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        if (controller) this.controllers.delete(controller);
      }
    }
    throw new ListDataError('SharePoint is temporarily unavailable. Try again later.');
  }

  private rows(page: Row): unknown[] {
    if (Array.isArray(page.value)) return page.value;
    const legacy = object(page.d);
    if (Array.isArray(legacy.results)) return legacy.results;
    throw new ListDataError('SharePoint returned an unexpected response. Try again or ask the page owner to check the list.');
  }

  private next(page: Row): string {
    return scalar(page['@odata.nextLink'] || page['odata.nextLink'] || object(page.d).__next);
  }

  public async getLists(siteUrl: string): Promise<ListOption[]> {
    const site = validateSiteUrl(siteUrl, this.currentSiteUrl);
    const first = `${site}/_api/web/lists?$select=Id,Title&$filter=Hidden%20eq%20false%20and%20BaseType%20eq%200&$orderby=Title&$top=200`;
    const output: ListOption[] = [];
    let next = first;
    const seen = new Set<string>();
    while (next && output.length < 500) {
      if (seen.size >= 20) throw new ListDataError('SharePoint returned too many pages. Refine the list selection.');
      if (seen.has(next)) throw new ListDataError('SharePoint returned a repeated page. Retry the list selection.');
      seen.add(next);
      const page = await this.get(next);
      this.rows(page).forEach(row => { const item = object(row); output.push({ id: scalar(item.Id), title: scalar(item.Title) }); });
      const link = this.next(page);
      next = link ? validateNextLink(link, first) : '';
    }
    return output.slice(0, 500);
  }

  public async getFields(siteUrl: string, listId: string): Promise<FieldOption[]> {
    const site = validateSiteUrl(siteUrl, this.currentSiteUrl);
    const first = `${site}/_api/web/lists(guid'${validateListId(listId)}')/fields?$select=InternalName,Title,TypeAsString,Hidden&$filter=Hidden%20eq%20false&$top=200`;
    const output: FieldOption[] = [];
    let next = first;
    const seen = new Set<string>();
    while (next && output.length < 500) {
      if (seen.size >= 20) throw new ListDataError('SharePoint returned too many pages. Refine the column selection.');
      if (seen.has(next)) throw new ListDataError('SharePoint returned a repeated page. Retry the column selection.');
      seen.add(next);
      const page = await this.get(next);
      this.rows(page).forEach(row => {
        const field = object(row);
        if (['Text', 'Note', 'Choice', 'URL', 'Number', 'Currency', 'Boolean', 'DateTime', 'Computed'].indexOf(scalar(field.TypeAsString)) !== -1) {
          output.push({ internalName: scalar(field.InternalName), title: scalar(field.Title), type: scalar(field.TypeAsString) });
        }
      });
      const link = this.next(page);
      next = link ? validateNextLink(link, first) : '';
    }
    return output.slice(0, 500);
  }

  /** Read-only organization-wide preset list. SharePoint enforces the viewer's permissions. */
  public async getSharedPresets(source: SharedPresetSource): Promise<SavedPreset[]> {
    if (!source.enabled) return [];
    const site = validateSiteUrl(source.siteUrl, this.currentSiteUrl);
    const list = validateListId(source.listId);
    // 'PresetJson' is a plain/multiline text column containing design and responsive JSON.
    const first = `${site}/_api/web/lists(guid'${list}')/items?$select=Id,Title,PresetJson&$top=50&$orderby=Title%20asc`;
    const page = await this.get(first);
    return this.rows(page).slice(0, 50).reduce<SavedPreset[]>((result, row) => {
      const item = object(row);
      const raw = scalar(item.PresetJson);
      if (!raw || raw.length > 20000) return result;
      try {
        const parsed: unknown = JSON.parse(raw);
        const objectPreset = object(parsed);
        if (!objectPreset.design || !objectPreset.responsive) return result;
        result.push({ id: `org-${scalar(item.Id)}`, name: scalar(item.Title).slice(0, 80) || 'Shared design',
          design: normalizeDesign(objectPreset.design), responsive: normalizeResponsive(objectPreset.responsive) });
      } catch { /* Malformed administrator entry is ignored. */ }
      return result;
    }, []);
  }

  public async loadTiles(input: SourceSettings, force: boolean = false): Promise<LoadResult> {
    if (this.disposed) throw new ListDataError('The SharePoint connection was closed.');
    const source = normalizeSource(input);
    const first = buildItemsUrl(source, this.currentSiteUrl);
    const key = JSON.stringify(source);
    const cached = this.cache.get(key);
    if (!force && cached && cached.expires > Date.now()) return { ...cached.value, tiles: cached.value.tiles.map(tile => ({ ...tile })) };
    const inflight = this.pending.get(key);
    // Even an explicit force refresh joins an identical in-flight read.
    if (inflight) return inflight;
    const generation = (this.generations.get(key) || 0) + 1;
    this.generations.set(key, generation);
    const operation = this.readItems(first, source).then(result => {
      if (this.disposed) throw new ListDataError('The SharePoint connection was closed.');
      if (this.generations.get(key) === generation) {
        if (this.cache.size >= 8) this.cache.clear();
        this.cache.set(key, { value: result, expires: Date.now() + (source.refreshMinutes > 0 ? source.refreshMinutes * 60000 : 0) });
      }
      return { ...result, tiles: result.tiles.map(tile => ({ ...tile })) };
    }).catch((error: unknown) => {
      if (this.generations.get(key) === generation) this.cache.delete(key);
      throw error;
    }).finally(() => { if (this.generations.get(key) === generation) this.pending.delete(key); });
    this.pending.set(key, operation);
    return operation;
  }

  private async readItems(first: string, source: SourceSettings): Promise<LoadResult> {
    const tiles: Tile[] = [];
    let next = first;
    let fetched = 0;
    const pages = new Set<string>();
    const ids = new Set<string>();
    while (next && tiles.length <= source.maxItems && fetched < 1000) {
      if (pages.size >= 20) throw new ListDataError('SharePoint returned too many pages. Refine the category filter or reduce hidden items.');
      if (pages.has(next)) throw new ListDataError('SharePoint returned a repeated page. Retry the list.');
      pages.add(next);
      const page = await this.get(next);
      if (this.disposed) throw new ListDataError('The SharePoint connection was closed.');
      const rows = this.rows(page);
      fetched += rows.length;
      rows.forEach(row => {
        const tile = mapListItem(row, source.mapping);
        if (tile.visible && !ids.has(tile.id)) { ids.add(tile.id); tiles.push(tile); }
      });
      const link = this.next(page);
      next = link ? validateNextLink(link, first) : '';
    }
    return { tiles: tiles.slice(0, source.maxItems), truncated: tiles.length > source.maxItems || !!next, loadedAt: Date.now() };
  }
}
