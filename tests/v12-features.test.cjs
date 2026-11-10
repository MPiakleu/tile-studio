'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createDefaultConfig, createTile, normalizeConfig, normalizeDesign, normalizeTile,
  parseImport, exportConfig, normalizeTileAppearance, applyPreset, BUILT_IN_PRESETS,
  COMPOSITION_TEMPLATES, COMPOSITION_NAMES, resolveTileAppearance, isTileEligible,
  DEFAULT_DESIGN, ListDataClient, mapListItem, buildItemsUrl
} = require('../.test-build/core.cjs');

test('v1 persisted configuration migrates to v2 without losing old tile contents', () => {
  const before = createDefaultConfig();
  const old = { ...before, schemaVersion: 1, sharedPresetSource: undefined };
  delete old.design.composition;
  delete old.design.compositionTemplate;
  delete old.tiles[0].appearance;
  delete old.tiles[0].secondaryUrl;
  const migrated = normalizeConfig(old);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.tiles[0].title, old.tiles[0].title);
  assert.deepEqual(migrated.design.composition, COMPOSITION_TEMPLATES.classic);
  assert.equal(migrated.sharedPresetSource.enabled, false);
  assert.equal(migrated.design.layout, old.design.layout);
});

test('existing page IDs remain unchanged and design defaults are independent', () => {
  const x = createDefaultConfig(); const y = createDefaultConfig();
  x.design.composition.footerLeft = 'secondary';
  assert.equal(y.design.composition.footerLeft, 'primary');
  assert.equal(x.tiles[0].id, 'starter-1');
  assert.equal(y.tiles[0].id, 'starter-1');
});

test('all seven templates expose independent slot compositions', () => {
  assert.equal(COMPOSITION_NAMES.length, 7);
  assert.deepEqual(Object.keys(COMPOSITION_TEMPLATES).sort(), ['buttons','classic','health','help','news','resource','service']);
  assert.equal(COMPOSITION_TEMPLATES.help.footerRight, 'meta');
  assert.equal(COMPOSITION_TEMPLATES.service.footerLeft, 'badge');
  assert.equal(COMPOSITION_TEMPLATES.health.footerRight, 'status');
  assert.equal(COMPOSITION_TEMPLATES.buttons.footerCenter, 'secondary');
  assert.equal(COMPOSITION_TEMPLATES.news.footerAnchor, 'bottom');
});

test('invalid imported composition settings cannot inject arbitrary HTML or CSS', () => {
  const d = normalizeDesign({ compositionTemplate: 'help', composition: {
    footerLeft: '<iframe>', footerRight: 'arrow', headerMode: '__proto__', iconInCategory: 'true'
  }, primaryStyle: 'javascript:alert(1)', buttonRadius: 5000, titleWeight: '900' });
  assert.equal(d.composition.footerLeft, 'primary');
  assert.equal(d.composition.footerRight, 'arrow');
  assert.equal(d.composition.headerMode, 'category-inline');
  assert.equal(d.primaryStyle, 'text');
  assert.equal(d.buttonRadius, 40);
  assert.equal(d.titleWeight, '600');
});

test('both independently linked actions sanitize unsafe URLs', () => {
  const t = normalizeTile({ title: 'Maintenance', url: '/SitePages/Maintenance.aspx', buttonLabel: 'See updates',
    secondaryUrl: 'javascript:alert(1)', secondaryLabel: 'Urgent help', secondaryNewTab: true });
  assert.equal(t.url, '/SitePages/Maintenance.aspx');
  assert.equal(t.secondaryUrl, '');
  assert.equal(t.secondaryNewTab, true);
  const safe = normalizeTile({ secondaryUrl: '/SitePages/Help.aspx', secondaryLabel: 'Urgent help' });
  assert.equal(safe.secondaryUrl, '/SitePages/Help.aspx');
});

test('per-tile settings replace selected composition slots and inherit remaining fields', () => {
  const t = normalizeTile({ title: 'Software', appearance: { compositionTemplate: 'service',
    composition: { footerRight: 'secondary' }, titleSize: 27, iconSize: 999, primaryStyle: 'solid' } });
  const d = resolveTileAppearance(createDefaultConfig().design, t);
  assert.equal(d.composition.headerMode, 'category-inline');
  assert.equal(d.composition.footerRight, 'secondary');
  assert.equal(d.composition.footerLeft, 'badge');
  assert.equal(d.titleSize, 27);
  assert.equal(d.iconSize, 64);
  assert.equal(d.primaryStyle, 'solid');
});

test('per-tile configuration rejects unknown appearance properties', () => {
  const t = normalizeTile({ appearance: { __proto__: { polluted: true },
    customCss: 'body{display:none}', onclick: 'alert(1)', iconPosition: 'right',
    composition: { footerLeft: 'badge', arbitraryScript: 'alert(1)' } } });
  assert.equal(t.appearance.iconPosition, 'right');
  assert.equal(t.appearance.customCss, undefined);
  assert.equal(t.appearance.onclick, undefined);
  assert.equal(t.appearance.composition.arbitraryScript, undefined);
});

test('conditional visibility is a display filter, never a security boundary', () => {
  const t = normalizeTile({ visible: true, visibilityCondition: 'has-status', status: 'unknown' });
  assert.equal(isTileEligible(t), false);
  t.status = 'operational'; assert.equal(isTileEligible(t), true);
  t.visible = false; assert.equal(isTileEligible(t), false);
  const linked = normalizeTile({ visibilityCondition: 'has-link', url: 'javascript:alert(1)' });
  assert.equal(isTileEligible(linked), false);
});

test('v2 export/import roundtrip retains separate action and per-tile layout', () => {
  const c = createDefaultConfig();
  c.tiles[0].secondaryUrl = '/SitePages/Help.aspx';
  c.tiles[0].secondaryLabel = 'Help';
  c.tiles[0].appearance = { compositionTemplate: 'buttons', padding: 32 };
  c.design.compositionTemplate = 'help';
  c.design.composition = { ...COMPOSITION_TEMPLATES.help };
  c.sharedPresetSource = { enabled: true, siteUrl: '', listId: 'd3c363c6-b9a5-427e-a983-58edb79d5a44' };
  const output = parseImport(exportConfig(c));
  assert.deepEqual(output, normalizeConfig(c));
  assert.equal(output.tiles[0].secondaryUrl, '/SitePages/Help.aspx');
});

test('7 screenshot styles are available as reusable built-in presets', () => {
  const names = new Set(BUILT_IN_PRESETS.map(p=>p.name));
  for(const name of ['Help article cards','Service request cards','Two-button cards','Horizontal health','Editorial news','Resource navigation']) assert.ok(names.has(name),name);
  const c = createDefaultConfig(); const before = structuredClone(c.tiles);
  const after = applyPreset(c, BUILT_IN_PRESETS.find(p=>p.name==='Service request cards'));
  assert.equal(after.design.composition.footerLeft,'badge');
  assert.deepEqual(after.tiles,before);
});

test('list mapping accepts secondary actions and optional composition without executing data', () => {
  const c = createDefaultConfig();
  c.source.listId = 'd3c363c6-b9a5-427e-a983-58edb79d5a44';
  c.source.mapping = { ...c.source.mapping, buttonLabel:'ButtonLabel', secondaryLabel:'OtherLabel', secondaryUrl:'OtherUrl', categoryIcon:'Icon', visibilityCondition:'DisplayRule', compositionTemplate:'Template' };
  const tile = mapListItem({ Id: 2, Title:'Adobe', ButtonLabel:'Request', OtherLabel:'Documentation', OtherUrl:{Url:'/SitePages/Adobe.aspx'}, Icon:'apps', DisplayRule:'has-link', Template:'buttons' }, c.source.mapping);
  assert.equal(tile.buttonLabel,'Request');
  assert.equal(tile.secondaryUrl,'/SitePages/Adobe.aspx');
  assert.equal(tile.appearance.compositionTemplate,'buttons');
  const url = buildItemsUrl(c.source,'https://tenant.sharepoint.com/sites/Technology');
  assert.ok(url.includes('OtherUrl'));
});

test('organization preset loading reads only configured SharePoint list with permissions', async () => {
  const base = 'https://tenant.sharepoint.com/sites/Technology';
  const requests = [];
  const client = new ListDataClient(base, async url => { requests.push(url); return { ok:true, status:200, json:async() => ({ value: [
    { Id:1, Title:'Brand cards', PresetJson:JSON.stringify({design:{compositionTemplate:'help', composition:COMPOSITION_TEMPLATES.help},responsive:{mobileColumns:1}}) },
    {Id:2, Title:'Invalid data', PresetJson:'{garbage' }
  ]}) }; });
  const presets = await client.getSharedPresets({ enabled:true, siteUrl:'',listId:'d3c363c6-b9a5-427e-a983-58edb79d5a44' });
  assert.equal(presets.length,1);
  assert.equal(presets[0].name,'Brand cards');
  assert.equal(presets[0].design.compositionTemplate,'help');
  assert.match(requests[0],/PresetJson/);
  await assert.rejects(client.getSharedPresets({enabled:true,siteUrl:'https://evil.example',listId:'d3c363c6-b9a5-427e-a983-58edb79d5a44'}));
});

test('organization preset read-only client rejects permission failures', async () => {
  const client = new ListDataClient('https://tenant.sharepoint.com/sites/Technology', async () => ({ok:false,status:403,json:async()=>({})}));
  await assert.rejects(client.getSharedPresets({enabled:true,siteUrl:'',listId:'d3c363c6-b9a5-427e-a983-58edb79d5a44'}),/access|expired/i);
});
