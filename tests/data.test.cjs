'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createDefaultConfig,
  ListDataClient,
  ListDataError,
  buildItemsUrl,
  validateNextLink,
  mapListItem,
} = require('../.test-build/core.cjs');

const site = 'https://tenant.sharepoint.com/sites/Technology';
const listId = '8d6c5f53-273d-49e0-906e-848c7325471c';
function source(overrides = {}) {
  const value = createDefaultConfig().source;
  return {
    ...value,
    mode: 'sharepoint',
    siteUrl: site,
    listId,
    mapping: {
      ...value.mapping,
      description: 'Summary',
      url: 'Destination',
      imageUrl: 'Image',
      visible: 'IsVisible',
      status: 'ServiceStatus',
      category: 'Category',
      sortOrder: 'SortOrder',
    },
    ...overrides,
  };
}
function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolveValue, rejectValue) => { resolve = resolveValue; reject = rejectValue; });
  return { promise, resolve, reject };
}

test('list query sends a bounded projection and escaped category filter', () => {
  const url = new URL(buildItemsUrl(source({ maxItems: 10, categoryFilter: "Director's guides", sortAscending: false }), site));
  assert.equal(url.origin, 'https://tenant.sharepoint.com');
  assert.equal(url.searchParams.get('$top'), '11');
  assert.equal(url.searchParams.get('$filter'), "Category eq 'Director''s guides'");
  assert.equal(url.searchParams.get('$orderby'), 'SortOrder desc,Id asc');
  const fields = url.searchParams.get('$select').split(',');
  assert.ok(fields.includes('Id') && fields.includes('Title'));
  assert.equal(new Set(fields).size, fields.length);
  assert.equal(fields.includes('*'), false);
});

test('pagination is confined to the exact original REST collection', () => {
  const first = buildItemsUrl(source(), site);
  const valid = new URL(first);
  valid.searchParams.set('$skiptoken', 'Paged=TRUE&p_ID=12');
  assert.equal(validateNextLink(valid.href, first), valid.href);
  for (const next of [
    'https://evil.example/_api/web/lists',
    first.replace('/items?', '/fields?'),
    first.replace(listId, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    first + '#unexpected',
    '//evil.example/list',
  ]) {
    assert.throws(() => validateNextLink(next, first), ListDataError);
  }
});

test('mapping supports SharePoint hyperlink values and does not assume service health', () => {
  const mapping = source().mapping;
  const tile = mapListItem({ Id: 12, Title: 'Printer setup', Destination: { Url: '/sites/Technology/Printer.aspx', Description: 'Guide' }, Image: { Url: '/SiteAssets/printer.png', Description: 'An office printer' }, ServiceStatus: 'unexpected state' }, mapping);
  assert.equal(tile.id, 'list-12');
  assert.equal(tile.url, '/sites/Technology/Printer.aspx');
  assert.equal(tile.imageAlt, 'An office printer');
  assert.equal(tile.status, 'unknown');
  assert.equal(mapListItem({ Id: 1, Title: 'No status' }, mapping).status, 'none');
});

test('mapping rejects unsafe URLs and handles all supported hidden values', () => {
  const mapping = source().mapping;
  for (const hidden of [false, 0, 'false', 'FALSE', 'No', ' 0 ']) {
    assert.equal(mapListItem({ Id: 1, Title: 'Hidden', IsVisible: hidden }, mapping).visible, false);
  }
  const tile = mapListItem({ Id: 1, Title: '<script>text stays text</script>', Destination: 'javascript:alert(1)', Image: 'data:image/svg+xml,<svg/>' }, mapping);
  assert.equal(tile.url, '');
  assert.equal(tile.imageUrl, '');
  assert.equal(tile.title, '<script>text stays text</script>');
});

test('connected results paginate past hidden rows and report truncation accurately', async () => {
  const config = source({ maxItems: 2 });
  const first = buildItemsUrl(config, site);
  const next = `${first}&$skiptoken=next`;
  const requested = [];
  const client = new ListDataClient(site, async (url) => {
    requested.push(url);
    return url === first
      ? response({ value: [{ Id: 1, Title: 'Hidden', IsVisible: false }, { Id: 2, Title: 'Visible A' }], '@odata.nextLink': next })
      : response({ value: [{ Id: 3, Title: 'Visible B' }, { Id: 4, Title: 'Visible C' }] });
  });
  const result = await client.loadTiles(config);
  assert.deepEqual(result.tiles.map(tile => tile.title), ['Visible A', 'Visible B']);
  assert.equal(result.truncated, true);
  assert.deepEqual(requested, [first, next]);
  assert.ok(result.loadedAt > 0);
});

test('duplicate items across pages do not create duplicate cards', async () => {
  const config = source({ maxItems: 10 });
  const first = buildItemsUrl(config, site);
  let calls = 0;
  const client = new ListDataClient(site, async () => ++calls === 1
    ? response({ value: [{ Id: 1, Title: 'A' }], 'odata.nextLink': `${first}&$skiptoken=2` })
    : response({ value: [{ Id: 1, Title: 'A' }, { Id: 2, Title: 'B' }] }));
  const result = await client.loadTiles(config);
  assert.deepEqual(result.tiles.map(tile => tile.id), ['list-1', 'list-2']);
  assert.equal(result.truncated, false);
});

test('cached results are isolated from caller mutation and force refresh reads again', async () => {
  let calls = 0;
  const client = new ListDataClient(site, async () => response({ value: [{ Id: 1, Title: `Version ${++calls}` }] }));
  const config = source();
  const a = await client.loadTiles(config);
  a.tiles[0].title = 'Caller changed this';
  const b = await client.loadTiles(config);
  assert.equal(b.tiles[0].title, 'Version 1');
  assert.equal(calls, 1);
  const c = await client.loadTiles(config, true);
  assert.equal(c.tiles[0].title, 'Version 2');
  assert.equal(calls, 2);
});

test('401 and 403 clear cached content and cannot silently return it', async () => {
  for (const status of [401, 403]) {
    let calls = 0;
    const client = new ListDataClient(site, async () => {
      calls += 1;
      return calls === 1 ? response({ value: [{ Id: 1, Title: 'Previously allowed' }] }) : response({}, status);
    });
    const config = source();
    await client.loadTiles(config);
    await assert.rejects(() => client.loadTiles(config, true), error => error instanceof ListDataError && error.status === status);
    await assert.rejects(() => client.loadTiles(config), error => error instanceof ListDataError && error.status === status);
    assert.equal(calls, 3, 'Access denial must evict the old cached response');
  }
});

test('simultaneous forced refreshes coalesce and do not overwrite the newest cache', async () => {
  const first = deferred();
  let calls = 0;
  const client = new ListDataClient(site, () => { calls++; return first.promise; });
  const config = source();
  const older = client.loadTiles(config);
  const newer = client.loadTiles(config, true);
  first.resolve(response({ value: [{ Id: 1, Title: 'Shared result' }] }));
  assert.equal((await older).tiles[0].title, 'Shared result');
  assert.equal((await newer).tiles[0].title, 'Shared result');
  assert.equal((await client.loadTiles(config)).tiles[0].title, 'Shared result');
  assert.equal(calls, 1, 'force must join an identical in-flight read');
});

test('explicit force refresh after a completed request bypasses cached results', async () => {
  let count = 0;
  const client = new ListDataClient(site, async () => response({ value: [{ Id: 1, Title: `Result ${++count}` }] }));
  const config = source();
  assert.equal((await client.loadTiles(config)).tiles[0].title, 'Result 1');
  assert.equal((await client.loadTiles(config, true)).tiles[0].title, 'Result 2');
  assert.equal((await client.loadTiles(config)).tiles[0].title, 'Result 2');
  assert.equal(count, 2);
});

test('disposing a provider aborts pending transport and discards its cache', async () => {
  let signal;
  const responseWait = deferred();
  const client = new ListDataClient(site, async (_url, token) => { signal = token; return responseWait.promise; });
  const loading = client.loadTiles(source());
  client.dispose();
  assert.equal(signal.aborted, true);
  responseWait.resolve(response({ value: [{ Id: 1, Title: 'Stale' }] }));
  await assert.rejects(loading, /closed/i);
  await assert.rejects(() => client.loadTiles(source()), /closed/i);
});

test('throttled responses are retried with bounded backoff', async () => {
  let attempts = 0;
  const client = new ListDataClient(site, async () => {
    attempts += 1;
    if (attempts < 3) return { ...response({}, 429), headers: { get: () => '0' } };
    return response({ value: [{ Id: 4, Title: 'Recovered' }] });
  });
  const data = await client.loadTiles(source());
  assert.equal(data.tiles[0].title, 'Recovered');
  assert.equal(attempts, 3);
});

test('simultaneous loads share one request and malformed responses fail explicitly', async () => {
  const pending = deferred();
  let calls = 0;
  const client = new ListDataClient(site, () => { calls += 1; return pending.promise; });
  const config = source();
  const a = client.loadTiles(config);
  const b = client.loadTiles(config);
  pending.resolve(response({ unexpected: 'not a list response' }));
  await assert.rejects(() => a, /unexpected response/i);
  await assert.rejects(() => b, /unexpected response/i);
  assert.equal(calls, 1);
});

test('timeout covers a response whose JSON body never finishes', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const client = new ListDataClient(site, async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) }));
    const pending = client.loadTiles(source());
    const rejected = assert.rejects(pending, /took too long/i);
    await Promise.resolve();
    context.mock.timers.tick(20001);
    await rejected;
  } finally {
    context.mock.timers.reset();
  }
});

test('repeated next-page links are stopped instead of looping', async () => {
  const config = source();
  const first = buildItemsUrl(config, site);
  let calls = 0;
  const client = new ListDataClient(site, async () => { calls += 1; return response({ value: [], '@odata.nextLink': first }); });
  await assert.rejects(() => client.loadTiles(config), /repeated page/i);
  assert.equal(calls, 1);
});

test('distinct empty next pages have a request-count limit', async () => {
  const config = source();
  const first = buildItemsUrl(config, site);
  let calls = 0;
  const client = new ListDataClient(site, async () => {
    calls += 1;
    return response({ value: [], '@odata.nextLink': `${first}&$skiptoken=page-${calls}` });
  });
  await assert.rejects(() => client.loadTiles(config), /too many pages/i);
  assert.equal(calls, 20);
});

test('field discovery is bounded even when the final page crosses the limit', async () => {
  let calls = 0;
  const client = new ListDataClient(site, async (url) => {
    const page = ++calls;
    const rows = Array.from({ length: 200 }, (_, index) => ({ InternalName: `Field${page * 200 + index}`, Title: `Field ${index}`, TypeAsString: 'Text' }));
    const next = new URL(url);
    next.searchParams.set('$skiptoken', String(page));
    return response({ value: rows, '@odata.nextLink': next.href });
  });
  const fields = await client.getFields(site, listId);
  assert.equal(fields.length, 500);
  assert.equal(calls, 3);
});

test('SharePoint legacy JSON and field-type filtering are supported', async () => {
  const client = new ListDataClient(site, async (url) => url.includes('/fields?')
    ? response({ d: { results: [
      { InternalName: 'Title', Title: 'Title', TypeAsString: 'Text' },
      { InternalName: 'Owners', Title: 'Owners', TypeAsString: 'UserMulti' },
    ] } })
    : response({ d: { results: [{ Id: 1, Title: 'Legacy item' }] } }));
  const data = await client.loadTiles(source());
  assert.equal(data.tiles[0].title, 'Legacy item');
  const fields = await client.getFields(site, listId);
  assert.deepEqual(fields.map(field => field.internalName), ['Title']);
});

test('a long server Retry-After is respected without an early automatic retry', async () => {
  let count = 0;
  const client = new ListDataClient(site, async () => {
    count += 1;
    return { ...response({}, 429), headers: { get: () => '120' } };
  });
  await assert.rejects(client.loadTiles(source()), /120-second cooldown/i);
  assert.equal(count,1, 'do not retry earlier than SharePoint asks');
});

test('disposing while waiting to retry cancels backoff immediately', async () => {
  let count = 0;
  const client = new ListDataClient(site, async () => {
    count += 1;
    return { ...response({}, 503), headers: { get: () => '7' } };
  });
  const loading = client.loadTiles(source());
  await new Promise(resolve => setTimeout(resolve, 20));
  client.dispose();
  await assert.rejects(Promise.race([
    loading,
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error('cancel did not stop backoff promptly')), 800))
  ]), /closed/i);
  assert.equal(count,1);
});
