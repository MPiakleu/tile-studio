'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createDefaultConfig,
  createTile,
  normalizeConfig,
  parseImport,
  exportConfig,
  applyPreset,
  BUILT_IN_PRESETS,
  safeLink,
  safeImage,
  normalizeColor,
  validateSiteUrl,
  validateListId,
  validFieldName,
  escapeOData,
} = require('../.test-build/core.cjs');

test('links retain supported navigation targets', () => {
  for (const link of [
    'https://example.com/help?topic=printer#setup',
    'http://intranet.example.com/help',
    '/sites/Technology/SitePages/Help.aspx',
    'mailto:helpdesk@example.com',
    'tel:+12125550100',
  ]) {
    assert.ok(safeLink(link), `Expected a supported link: ${link}`);
  }
});

test('links block executable, local-file, data, and opaque URL protocols', () => {
  for (const link of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' \n\tjavascript:alert(1)',
    'java\tscript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///C:/Windows/System32',
    'blob:https://example.com/token',
    'ftp://example.com/file',
  ]) {
    assert.equal(safeLink(link), undefined, `Unsafe link accepted: ${JSON.stringify(link)}`);
  }
});

test('links block network-path and backslash authority confusion', () => {
  for (const link of ['//evil.example/path', '\\\\evil.example/path', '/\\evil.example/path']) {
    assert.equal(safeLink(link), undefined, `Ambiguous network path accepted: ${link}`);
  }
});

test('images allow secure or site-relative sources and reject active content', () => {
  assert.ok(safeImage('https://example.com/image.png'));
  assert.ok(safeImage('/SiteAssets/brand.png'));
  for (const source of [
    'http://example.com/image.png',
    'javascript:alert(1)',
    'data:image/svg+xml,<svg onload="alert(1)"/>',
    'blob:https://example.com/test',
    '//example.com/image.png',
    'file:///image.png',
  ]) {
    assert.equal(safeImage(source), undefined, `Unsafe image accepted: ${source}`);
  }
});

test('empty targets stay noninteractive', () => {
  assert.equal(safeLink(''), undefined);
  assert.equal(safeLink('   '), undefined);
  assert.equal(safeImage(''), undefined);
});

test('color normalization rejects CSS injection and preserves theme inheritance', () => {
  assert.equal(normalizeColor(''), '');
  assert.ok(normalizeColor('#123456'));
  for (const value of [
    'url(https://example.com/tracker)',
    'red; background-image:url(https://example.com)',
    'expression(alert(1))',
    'var(--unknown)',
    '#12345x',
  ]) {
    assert.equal(normalizeColor(value), '', `Unsafe color accepted: ${value}`);
  }
});

test('SharePoint site selection stays on the signed-in tenant origin', () => {
  const current = 'https://tenant.sharepoint.com/sites/Technology';
  assert.equal(validateSiteUrl('', current), current);
  assert.equal(validateSiteUrl('/sites/SharedContent/', current), 'https://tenant.sharepoint.com/sites/SharedContent');
  for (const site of [
    'https://evil.example/sites/Technology',
    'https://tenant.sharepoint.com.evil.example/sites/Technology',
    'http://tenant.sharepoint.com/sites/Technology',
    'https://user:password@tenant.sharepoint.com/sites/Technology',
    '/sites/Technology?operation=delete',
    '/sites/Technology#fragment',
    '/sites/Technology/_api/web',
  ]) {
    assert.throws(() => validateSiteUrl(site, current), `Invalid SharePoint site accepted: ${site}`);
  }
});

test('list ids and mapped field identifiers cannot inject REST expressions', () => {
  const id = '8d6c5f53-273d-49e0-906e-848c7325471c';
  assert.equal(validateListId(id), id);
  for (const value of ['', "list')/items", '../web', id + '?$select=*']) {
    assert.throws(() => validateListId(value));
  }
  assert.equal(validFieldName('Title'), true);
  assert.equal(validFieldName('Service_x0020_Name'), true);
  for (const value of ['', 'Title,Author', 'Author/Email', 'Title&$filter=true', '_'.repeat(129)]) {
    assert.equal(validFieldName(value), false, `Invalid field accepted: ${value}`);
  }
});

test('OData text values escape apostrophes without removing user content', () => {
  assert.equal(escapeOData("Director's resources"), "Director''s resources");
  assert.equal(escapeOData("x' or Title ne 'x"), "x'' or Title ne ''x");
  assert.equal(escapeOData('Operations & IT'), 'Operations & IT');
});

test('default configurations are isolated between web part instances', () => {
  const a = createDefaultConfig();
  const b = createDefaultConfig();
  const original = b.tiles[0].title;
  a.tiles[0].title = 'Changed only in the first web part';
  a.design.columns = 1;
  a.source.mapping.title = 'CustomTitle';
  assert.equal(b.tiles[0].title, original);
  assert.notEqual(b.design.columns, 1);
  assert.equal(b.source.mapping.title, 'Title');
});

test('new tile identifiers are unique and no health state is assumed', () => {
  const a = createTile();
  const b = createTile();
  assert.notEqual(a.id, b.id);
  assert.equal(a.status, 'none');
  assert.equal(a.url, '');
});

test('intentional empty content is preserved during normalization', () => {
  const input = createDefaultConfig();
  input.tiles = [];
  input.title = '';
  input.subtitle = '';
  const output = normalizeConfig(input);
  assert.deepEqual(output.tiles, []);
  assert.equal(output.title, '');
  assert.equal(output.subtitle, '');
});

test('explicit false values survive normalization', () => {
  const input = createDefaultConfig();
  input.showHeading = false;
  input.tiles[0].visible = false;
  input.tiles[0].openInNewTab = false;
  input.design.showDescription = false;
  input.design.equalHeight = false;
  input.source.sortAscending = false;
  const output = normalizeConfig(input);
  assert.equal(output.showHeading, false);
  assert.equal(output.tiles[0].visible, false);
  assert.equal(output.tiles[0].openInNewTab, false);
  assert.equal(output.design.showDescription, false);
  assert.equal(output.design.equalHeight, false);
  assert.equal(output.source.sortAscending, false);
});

test('sparse tiles normalize to complete safe content without false status', () => {
  const input = createDefaultConfig();
  input.tiles = [{ id: 'sparse', title: 'A sparse resource' }];
  const tile = normalizeConfig(input).tiles[0];
  assert.equal(tile.title, 'A sparse resource');
  assert.equal(tile.description, '');
  assert.equal(tile.imageUrl, '');
  assert.equal(tile.url, '');
  assert.equal(tile.status, 'none');
  assert.equal(typeof tile.visible, 'boolean');
});

test('normalization strips unknown properties and protects the object prototype', () => {
  const input = JSON.parse('{"schemaVersion":1,"__proto__":{"polluted":true},"runScript":"alert(1)","tiles":[]}');
  const output = normalizeConfig(input);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(output, '__proto__'), false);
  assert.equal(Object.hasOwn(output, 'runScript'), false);
});

test('invalid visual values cannot escape supported constraints', () => {
  const input = createDefaultConfig();
  input.design.columns = -10;
  input.design.padding = -100;
  input.design.titleSize = Infinity;
  input.design.layout = 'unknown-layout';
  input.design.accentColor = 'red;position:fixed';
  input.responsive.mobileColumns = 999;
  const output = normalizeConfig(input);
  assert.ok(output.design.columns >= 1 && output.design.columns <= 6);
  assert.ok(output.design.padding >= 0 && output.design.padding <= 80);
  assert.ok(Number.isFinite(output.design.titleSize));
  assert.notEqual(output.design.layout, 'unknown-layout');
  assert.equal(output.design.accentColor, '');
  assert.ok(output.responsive.mobileColumns >= 1 && output.responsive.mobileColumns <= 2);
});

test('normalization bounds content and preset counts to keep page size predictable', () => {
  const input = createDefaultConfig();
  input.tiles = Array.from({ length: 150 }, (_, index) => ({ ...createTile(), title: `Resource ${index}` }));
  input.savedPresets = Array.from({ length: 30 }, (_, index) => ({
    id: `preset-${index}`,
    name: `Saved design ${index}`,
    design: { ...input.design },
    responsive: { ...input.responsive },
  }));
  const output = normalizeConfig(input);
  assert.equal(output.tiles.length, 100);
  assert.equal(output.savedPresets.length, 20);
});

test('normalization repairs duplicate tile ids without dropping distinct content', () => {
  const input = createDefaultConfig();
  input.tiles = [
    { ...createTile(), id: 'duplicate', title: 'First tile' },
    { ...createTile(), id: 'duplicate', title: 'Second tile' },
  ];
  const output = normalizeConfig(input);
  assert.equal(new Set(output.tiles.map((tile) => tile.id)).size, 2);
  assert.deepEqual(output.tiles.map((tile) => tile.title), ['First tile', 'Second tile']);
});

test('export and import preserve a complete edited configuration', () => {
  const input = createDefaultConfig();
  input.title = 'People & technology';
  input.tiles[0].description = 'Unicode café, 中文, and an emoji ✓';
  input.design.layout = 'compact';
  const expected = normalizeConfig(input);
  assert.deepEqual(parseImport(exportConfig(expected)), expected);
});

test('imports reject malformed JSON and future schemas', () => {
  assert.throws(() => parseImport('{"broken":'));
  const input = createDefaultConfig();
  input.schemaVersion = 999;
  assert.throws(() => parseImport(JSON.stringify(input)), /version|schema|unsupported|format/i);
});

test('imports reject oversized files before attempting to use their content', () => {
  assert.throws(() => parseImport(' '.repeat(2 * 1024 * 1024)), /large|size|limit|maximum/i);
});

test('applying a design preset keeps content, source connection, and saved presets', () => {
  assert.ok(BUILT_IN_PRESETS.length >= 4);
  const input = createDefaultConfig();
  input.title = 'A title that must survive';
  input.subtitle = 'A subtitle that must survive';
  input.tiles[0].title = 'Business-owned content';
  input.source.mode = 'sharepoint';
  input.source.siteUrl = 'https://tenant.sharepoint.com/sites/Technology';
  input.source.listId = '8d6c5f53-273d-49e0-906e-848c7325471c';
  input.savedPresets = [{ ...BUILT_IN_PRESETS[0], id: 'saved-one', name: 'Local design' }];
  const before = JSON.parse(JSON.stringify(input));
  const output = applyPreset(input, BUILT_IN_PRESETS[1]);
  assert.equal(output.title, before.title);
  assert.equal(output.subtitle, before.subtitle);
  assert.deepEqual(output.tiles, before.tiles);
  assert.deepEqual(output.source, before.source);
  assert.deepEqual(output.savedPresets, before.savedPresets);
  assert.deepEqual(input, before, 'Applying a preset must not mutate the existing config');
});
