'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTs(relativePath, mockRequire, globals = {}) {
  const file = path.resolve(__dirname, '..', relativePath);
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
  }).outputText;
  const context = { console, Promise, ...globals };
  const factory = vm.runInNewContext(`(function (require, module, exports) { ${output}\n })`, context, { filename: file });
  const module = { exports: {} };
  factory(mockRequire, module, module.exports);
  return module.exports;
}
const sessionModule = loadTs('src/webparts/tileStudio/services/PropertyPaneSession.ts', name => {
  throw new Error(`PropertyPaneSession unexpectedly imports ${name}`);
});
const { PropertyPaneSession } = sessionModule;

test('old host disposal does not invalidate the newly mounted callback', () => {
  const connection = new PropertyPaneSession();
  const oldHost = {}, newHost = {};
  let oldCount = 0, newCount = 0;
  connection.attach(oldHost, () => { oldCount += 1; });
  assert.equal(connection.attach(newHost, () => { newCount += 1; }), oldHost);
  assert.equal(connection.detach(oldHost), false, 'stale disposal must not clear the replacement');
  assert.equal(connection.host, newHost);
  connection.changeCallback('config', { title: 'After replacement' }, true);
  assert.equal(oldCount, 0);
  assert.equal(newCount, 1);
});

test('same-host property-pane rerender updates callback without unmounting', () => {
  const connection = new PropertyPaneSession();
  const host = {};
  let original = 0, latest = 0;
  assert.equal(connection.attach(host, () => { original += 1; }), undefined);
  assert.equal(connection.attach(host, () => { latest += 1; }), undefined);
  // SPFx can omit the callback on subsequent onRender calls; retain the last known valid one.
  assert.equal(connection.attach(host, undefined), undefined);
  connection.changeCallback('config', 'value', true);
  assert.equal(original, 0);
  assert.equal(latest, 1);
});

test('current host disposal clears current callback, unlike stale disposal', () => {
  const connection = new PropertyPaneSession();
  const host = {};
  connection.attach(host, () => undefined);
  assert.equal(connection.detach(host), true);
  assert.equal(connection.changeCallback, undefined);
  assert.equal(connection.host, undefined);
  connection.attach({}, () => undefined);
  connection.clear();
  assert.equal(connection.changeCallback, undefined);
});

function createWebPart() {
  const calls = [];
  const document = { body: {}, documentElement: {}, activeElement: null };
  const reactDom = {
    render(node, host) { calls.push({ type: 'render', node, host }); },
    unmountComponentAtNode(host) { calls.push({ type: 'unmount', host }); document.activeElement = document.body; return true; }
  };
  class BaseClientSideWebPart {
    constructor() {
      this.properties = { config: { title: 'Start', subtitle: '', tiles: [{ id: 'a', title: 'A' }], source: { mode: 'manual' } } };
      this.displayMode = 2;
      this.instanceId = 'test-instance';
      this.domElement = { querySelector() { return null; } };
      this.renderedOnce = true;
      this.context = { pageContext: { web: { absoluteUrl: 'https://tenant.sharepoint.com/sites/Tech' } }, propertyPane: { _open: false, open() { this._open = true; }, close() { this._open = false; }, isPropertyPaneOpen(...args) { assert.equal(args.length, 0, 'SPFx propertyPane.isPropertyPaneOpen takes no arguments'); return this._open; } } };
    }
    onPropertyPaneFieldChanged(propertyPath, oldValue, newValue) { calls.push({ type: 'framework-change', propertyPath, oldValue, newValue }); }
    onDisplayModeChanged() {}
    renderError() {}
  }
  class MockInput {
    constructor(id) { this.id = id; this.selectionStart = 0; this.selectionEnd = 0; }
    focus() { document.activeElement = this; }
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  }
  const mocks = {
    'react': { createElement(...args) { return args; } },
    'react-dom': reactDom,
    '@microsoft/sp-core-library': { DisplayMode: { Edit: 2, Read: 1 }, Version: { parse(s) { return s; } } },
    '@microsoft/sp-webpart-base': { BaseClientSideWebPart },
    '@microsoft/sp-property-pane': { PropertyPaneFieldType: { Custom: 12 } },
    '@microsoft/sp-http': { SPHttpClient: { configurations: { v1: {} } } },
    './components/StudioEditor': { StudioEditor: function StudioEditor() {} },
    './models/config': { DEFAULT_THEME: {}, createDefaultConfig() { return {}; }, normalizeConfig(v) { return { ...v }; } },
    './services/listData': { ListDataClient: function ListDataClient() {} },
    './services/PropertyPaneSession': sessionModule,
    './components/TileStudioApp': { TileStudioApp: function TileStudioApp() {}, TileStudioBoundary: function TileStudioBoundary() {} }
  };
  const { default: TileStudioWebPart } = loadTs('src/webparts/tileStudio/TileStudioWebPart.ts', name => {
    if (!(name in mocks)) throw new Error(`Unmocked module: ${name}`);
    return mocks[name];
  }, { document, window: { requestAnimationFrame(fn) { fn(); } }, HTMLInputElement: MockInput, HTMLTextAreaElement: class {} });
  const part = new TileStudioWebPart();
  return { part, calls, document, MockInput };
}

test('property-pane config is fresh for each call while the custom editor identity remains stable', () => {
  const { part } = createWebPart();
  const first = part.getPropertyPaneConfiguration();
  const second = part.getPropertyPaneConfiguration();
  assert.notStrictEqual(first, second, 'framework-mutated configuration must not be returned again');
  assert.notStrictEqual(first.pages, second.pages);
  assert.notStrictEqual(first.pages[0].groups, second.pages[0].groups);
  assert.strictEqual(second.pages[0].groups[0].groupFields[0], first.pages[0].groups[0].groupFields[0],
    'custom editor field/key must retain its identity across refreshes');
});

test('SharePoint-inserted visibility sections cannot accumulate when the pane refreshes', () => {
  const { part } = createWebPart();
  const initial = part.getPropertyPaneConfiguration();
  const custom = initial.pages[0].groups[0].groupFields[0];
  // Simulate the framework augmenting the returned configuration.
  for (let attempt = 0; attempt < 12; attempt++) {
    const page = part.getPropertyPaneConfiguration().pages[0];
    page.groups.push({ groupName: 'Visibility', groupFields: [{ type: 'switch' }] });
    const next = part.getPropertyPaneConfiguration();
    assert.equal(next.pages[0].groups.length, 1, 'framework-inserted group must not leak into the next render');
    assert.equal(next.pages[0].groups[0].groupName, 'Tile Studio');
    assert.strictEqual(next.pages[0].groups[0].groupFields[0], custom);
  }
});

test('replaced pane host notifies only the active callback and repaints the live preview', () => {
  const { part, calls } = createWebPart();
  const editorField = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const oldHost = { contains() { return false; } }, newHost = { contains() { return false; } };
  const first = [], second = [];
  editorField.onRender(oldHost, undefined, (...args) => first.push(args));
  editorField.onRender(newHost, undefined, (...args) => second.push(args));
  editorField.onDispose(oldHost);
  part.updateConfiguration({ ...part.properties.config, title: 'Works after rerender' });
  assert.equal(first.length, 0, 'stale callback must never receive changes');
  assert.equal(second.length, 1, 'new field must notify SharePoint of the edit');
  assert.equal(second[0][0], 'config');
  assert.equal(second[0][1].title, 'Works after rerender');
  assert.equal(second[0][2], true);
  assert.equal(part.properties.config.title, 'Works after rerender');
  assert.ok(calls.some(call => call.type === 'render' && call.host === newHost));
  const page = calls.filter(call => call.type === 'render' && call.host === part.domElement).at(-1);
  assert.equal(page.node[2][1].config.title, 'Works after rerender', 'page preview must use updated config');
});

test('an editing update during an SPFx remount gap is retained, not silently discarded', () => {
  const { part, calls } = createWebPart();
  const props = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const oldHost = { contains() { return false; } };
  props.onRender(oldHost, undefined, () => undefined);
  props.onDispose(oldHost);
  part.updateConfiguration({ ...part.properties.config, title: 'Input during transition' });
  assert.equal(part.properties.config.title, 'Input during transition');
  assert.ok(calls.some(call => call.type === 'framework-change'), 'framework change handler must be informed');
});


test('current tab and selected tile survive a property-pane host replacement', () => {
  const { part, calls } = createWebPart();
  const custom = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const oldHost = { contains() { return false; } }, nextHost = { contains() { return false; } };
  custom.onRender(oldHost, undefined, () => undefined);
  part.saveEditorUiState({ tab: 'style', selectedId: 'a', search: 'color' });
  custom.onRender(nextHost, undefined, () => undefined);
  const rendered = calls.filter(call => call.type === 'render' && call.host === nextHost).at(-1);
  assert.equal(rendered.node[1].initialUiState.tab, 'style');
  assert.equal(rendered.node[1].initialUiState.selectedId, 'a');
  assert.equal(rendered.node[1].initialUiState.search, 'color');
});

test('typing focus and cursor position are restored after a property-pane remount', () => {
  const { part, document, MockInput } = createWebPart();
  const custom = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const previousInput = new MockInput('test-instance-studio-tile-title');
  previousInput.selectionStart = 4;
  previousInput.selectionEnd = 4;
  const replacementInput = new MockInput('test-instance-studio-tile-title');
  const oldHost = { contains(node) { return node === previousInput; } };
  const newHost = { contains(node) { return node === replacementInput; }, querySelectorAll() { return [replacementInput]; } };
  custom.onRender(oldHost, undefined, () => undefined);
  document.activeElement = previousInput;
  custom.onRender(newHost, undefined, () => undefined);
  assert.strictEqual(document.activeElement, replacementInput);
  assert.equal(replacementInput.selectionStart, 4);
  assert.equal(replacementInput.selectionEnd, 4);
});


test('SPFx property-pane render roots are paired with unmount paths', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/webparts/tileStudio/TileStudioWebPart.ts'), 'utf8');
  const renders = [...source.matchAll(/\bReactDom\.render\(/g)].length;
  const unmounts = [...source.matchAll(/\bReactDom\.unmountComponentAtNode\(/g)].length;
  // RushStack checks call parity at file scope; both React roots must also
  // remain independently unmountable when the pane host is replaced.
  assert.equal(renders, 2);
  assert.equal(unmounts, renders);
  assert.match(source, /private unmountPaneHost\(host: HTMLElement\)/);
  assert.match(source, /this\.unmountPaneHost\(previousHost\)/);
  assert.match(source, /this\.unmountPaneHost\(host\)/);
  assert.match(source, /ReactDom\.unmountComponentAtNode\(this\.domElement\)/);
});

test('replacing pane editor unmounts only the previous host, then cleans up all roots', () => {
  const { part, calls } = createWebPart();
  const props = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const host1 = { contains() { return false; } };
  const host2 = { contains() { return false; } };
  part.render();
  props.onRender(host1, undefined, () => undefined);
  props.onRender(host2, undefined, () => undefined);
  assert.ok(calls.some(call => call.type === 'unmount' && call.host === host1));
  assert.equal(calls.some(call => call.type === 'unmount' && call.host === host2), false);
  props.onDispose(host1);
  assert.equal(calls.some(call => call.type === 'unmount' && call.host === host2), false,
    'disposing stale host must not unmount active pane');
  part.onDispose();
  assert.ok(calls.some(call => call.type === 'unmount' && call.host === host2));
  assert.ok(calls.some(call => call.type === 'unmount' && call.host === part.domElement));
});

test('native SharePoint visibility configuration is preserved with fresh arrays', () => {
  const { part } = createWebPart();
  for (let i = 0; i < 80; i++) {
    const pane = part.getPropertyPaneConfiguration();
    assert.equal(pane.disableVisibilityGroup, undefined, 'do not use a preview-only suppression flag');
    assert.equal(pane.pages.length, 1);
    assert.equal(pane.pages[0].groups.length, 1);
  }
});

test('50 sequential edits notify SharePoint with previous-value ordering, update preview and serialize last edit', () => {
  const { part, calls } = createWebPart();
  const editor = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const host = { contains() { return false; } };
  const notifications = [];
  editor.onRender(host, undefined, (propertyPath, newValue, isValid) => {
    notifications.push({ propertyPath, newValue, isValid, oldValue: part.properties.config.title });
  });
  part.onPropertyPaneConfigurationStart();
  for (let i = 1; i <= 50; i++) part.updateConfiguration({ ...part.properties.config, title: `Updated ${i}` });
  assert.equal(notifications.length, 50, 'all edits, not only the first, must notify SharePoint');
  assert.equal(notifications[0].oldValue, 'Start', 'SharePoint must be notified BEFORE replacing old property value');
  assert.equal(notifications[49].oldValue, 'Updated 49');
  assert.equal(notifications[49].newValue.title, 'Updated 50');
  assert.ok(notifications.every(item => item.propertyPath === 'config' && item.isValid === true));
  const preview = calls.filter(call => call.type === 'render' && call.host === part.domElement).at(-1);
  assert.equal(preview.node[2][1].config.title, 'Updated 50', 'live preview must reflect final edit');
  part.onBeforeSerialize();
  assert.equal(part.properties.config.title, 'Updated 50');
});

test('idle completion while the property pane stays open does not unmount or erase the settings', () => {
  const { part, calls } = createWebPart();
  const custom = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const host = { contains() { return false; } };
  const events = [];
  part.context.propertyPane.open();
  part.onPropertyPaneConfigurationStart();
  custom.onRender(host, undefined, (_path, value) => events.push(value.title));
  part.saveEditorUiState({ tab: 'layout', selectedId: 'a', search: '' });
  part.updateConfiguration({ ...part.properties.config, title: 'Before idle' });
  const unmountsBeforeIdle = calls.filter(call => call.type === 'unmount' && call.host === host).length;
  // SPFx can call this method after its configuration completion timeout,
  // without closing the property pane. Simulate several such idle periods.
  for (let i = 0; i < 3; i++) part.onPropertyPaneConfigurationComplete();
  assert.equal(calls.filter(call => call.type === 'unmount' && call.host === host).length, unmountsBeforeIdle);
  assert.equal(part.paneSession.host, host);
  assert.equal(part.editorUiState.tab, 'layout');
  part.updateConfiguration({ ...part.properties.config, title: 'After idle' });
  assert.deepEqual(events, ['Before idle', 'After idle']);
  assert.equal(part.properties.config.title, 'After idle');
  assert.equal(part.getPropertyPaneConfiguration().pages[0].groups.length, 1);
  part.context.propertyPane.close();
  part.onPropertyPaneConfigurationComplete();
  assert.equal(calls.filter(call => call.type === 'unmount' && call.host === host).length, unmountsBeforeIdle + 1);
  assert.equal(part.paneSession.host, undefined);
  assert.equal(part.properties.config.title, 'After idle');
});

test('closing and reopening the property pane preserves final edits for SharePoint page save', () => {
  const { part } = createWebPart();
  const editor = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const notified = [];
  part.onPropertyPaneConfigurationStart();
  const host = { contains() { return false; } };
  editor.onRender(host, undefined, (_path, value) => notified.push(value.title));
  part.updateConfiguration({ ...part.properties.config, title: 'First' });
  part.updateConfiguration({ ...part.properties.config, title: 'Last before closing' });
  part.onPropertyPaneConfigurationComplete();
  assert.equal(part.properties.config.title, 'Last before closing');
  part.onPropertyPaneConfigurationStart();
  editor.onRender({ contains() { return false; } }, undefined, (_path, value) => notified.push(value.title));
  part.updateConfiguration({ ...part.properties.config, title: 'Last after reopening' });
  part.onBeforeSerialize();
  assert.equal(part.properties.config.title,'Last after reopening');
  assert.deepEqual(notified, ['First','Last before closing','Last after reopening']);
});

test('remount gap still repaints and sends newest pending update to the next SharePoint callback', () => {
  const { part, calls } = createWebPart();
  const field = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const old = { contains() { return false; } };
  field.onRender(old, undefined, () => undefined);
  field.onDispose(old);
  for (let i = 0; i < 10; i++) part.updateConfiguration({ ...part.properties.config, subtitle: `Gap ${i}` });
  const reported = [];
  field.onRender({ contains() { return false; } }, undefined, (_path, value) => reported.push(value.subtitle));
  assert.equal(part.properties.config.subtitle,'Gap 9');
  assert.deepEqual(reported, ['Gap 9'], 'pending edit reaches new callback exactly once');
  assert.equal(calls.filter(call => call.type === 'framework-change').length,10);
  const preview = calls.filter(call => call.type === 'render' && call.host === part.domElement).at(-1);
  assert.equal(preview.node[2][1].config.subtitle, 'Gap 9');
  assert.equal(part.getPropertyPaneConfiguration().disableVisibilityGroup,undefined);
});

test('editing through mounted React editor updates both preview and serialized configuration', () => {
  const { part, calls } = createWebPart();
  const editor = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const host = { contains() { return false; } };
  const recorded = [];
  editor.onRender(host, undefined, (_path, value) => recorded.push(value.title));
  const mountedEditor = calls.filter(call => call.type === 'render' && call.host === host).at(-1);
  mountedEditor.node[1].onChange({ ...part.properties.config, title: 'From the actual editor bridge' });
  assert.deepEqual(recorded, ['From the actual editor bridge']);
  const page = calls.filter(call => call.type === 'render' && call.host === part.domElement).at(-1);
  assert.equal(page.node[2][1].config.title, 'From the actual editor bridge');
  part.onPropertyPaneConfigurationComplete();
  part.onBeforeSerialize();
  assert.equal(part.properties.config.title, 'From the actual editor bridge');
});

test('synchronous SharePoint callback rendering cannot leave a stale preview', () => {
  const { part, calls } = createWebPart();
  const custom = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  custom.onRender({ contains() { return false; } }, undefined, () => {
    // Simulate a framework that repaints before it commits a custom-field value.
    part.render();
  });
  part.updateConfiguration({ ...part.properties.config, title: 'Must be visibly updated' });
  const previews = calls.filter(call => call.type === 'render' && call.host === part.domElement);
  assert.ok(previews.length >= 2);
  assert.equal(previews.at(-1).node[2][1].config.title, 'Must be visibly updated');
});

test('custom field notification survives a synchronous pane replacement before old disposal', () => {
  const { part, calls } = createWebPart();
  const custom = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const firstHost = { contains() { return false; } };
  const nextHost = { contains() { return false; } };
  const notifications = [];
  custom.onRender(firstHost, undefined, (_path, value) => {
    notifications.push(`old:${value.title}`);
    custom.onRender(nextHost, undefined, (_newPath, newValue) => notifications.push(`new:${newValue.title}`));
    custom.onDispose(firstHost);
  });
  part.updateConfiguration({ ...part.properties.config, title: 'First edit' });
  part.updateConfiguration({ ...part.properties.config, title: 'Second edit' });
  assert.deepEqual(notifications, ['old:First edit', 'new:Second edit']);
  assert.equal(part.properties.config.title, 'Second edit');
  assert.equal(calls.filter(call => call.type === 'render' && call.host === part.domElement).at(-1).node[2][1].config.title, 'Second edit');
});

test('SharePoint-like dirty tracking persists the last nested style and tile edits across page save/reload', () => {
  const { part, calls } = createWebPart();
  const initial = { ...part.properties.config, design: { radius: 8, accentColor: '#135789' } };
  part.properties.config = initial;
  const field = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  let dirty = false;
  const notified = [];
  field.onRender({ contains() { return false; } }, undefined, (path, value, valid) => {
    // This mock deliberately rejects changes when the property is assigned
    // before notification; it models SharePoint comparing the previous value.
    assert.equal(path, 'config');
    assert.equal(valid, true);
    dirty ||= JSON.stringify(value) !== JSON.stringify(part.properties.config);
    notified.push(value);
    part.properties.config = value;
  });
  part.updateConfiguration({ ...part.properties.config, design: { ...part.properties.config.design, radius: 24 } });
  part.updateConfiguration({ ...part.properties.config, tiles: [{ ...part.properties.config.tiles[0], title: 'Updated link' }] });
  part.updateConfiguration({ ...part.properties.config, design: { ...part.properties.config.design, accentColor: '#2468ac' } });
  assert.equal(dirty, true, 'SharePoint detects that the page was modified');
  assert.equal(notified.length, 3, 'every semantic edit reaches the pane callback');
  assert.equal(notified[2].design.radius, 24);
  assert.equal(notified[2].tiles[0].title, 'Updated link');
  assert.equal(notified[2].design.accentColor, '#2468ac');
  part.onPropertyPaneConfigurationComplete();
  part.onBeforeSerialize();
  const savedPage = JSON.parse(JSON.stringify(part.properties));
  part.properties = savedPage;
  part.displayMode = 1;
  part.render();
  const preview = calls.filter(call => call.type === 'render' && call.host === part.domElement).at(-1);
  assert.equal(preview.node[2][1].config.design.radius, 24);
  assert.equal(preview.node[2][1].config.design.accentColor, '#2468ac');
  assert.equal(preview.node[2][1].config.tiles[0].title, 'Updated link');
});

test('editor preview stays functional when a custom property pane callback throws during remount', () => {
  const { part, calls } = createWebPart();
  const field = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  const oldHost = { contains() { return false; } };
  field.onRender(oldHost, undefined, () => { throw new Error('Host was disposed'); });
  part.updateConfiguration({ ...part.properties.config, title: 'Draft despite disposed callback' });
  assert.equal(part.properties.config.title, 'Draft despite disposed callback');
  assert.equal(calls.filter(call => call.type === 'render' && call.host === part.domElement).at(-1).node[2][1].config.title, 'Draft despite disposed callback');
  field.onDispose(oldHost);
  const received = [];
  field.onRender({ contains() { return false; } }, undefined, (_path, value) => received.push(value.title));
  assert.deepEqual(received, ['Draft despite disposed callback']);
});

test('a synchronous framework preview of the updated bag is not redundantly repainted', () => {
  const { part, calls } = createWebPart();
  part.render();
  const custom = part.getPropertyPaneConfiguration().pages[0].groups[0].groupFields[0].properties;
  custom.onRender({ contains() { return false; } }, undefined, (_path, updated) => {
    part.properties.config = updated;
    part.render();
  });
  const before = calls.filter(call => call.type === 'render' && call.host === part.domElement).length;
  part.updateConfiguration({ ...part.properties.config, title: 'Already painted by host' });
  const renders = calls.filter(call => call.type === 'render' && call.host === part.domElement).slice(before);
  assert.equal(renders.length, 1, 'do not redraw the entire web part twice for every keystroke');
  assert.equal(renders[0].node[2][1].config.title, 'Already painted by host');
});
