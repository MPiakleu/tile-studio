'use strict';

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createDefaultConfig, createTile, LAYOUTS } = require('../.test-build/core.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
fs.mkdirSync(output, { recursive: true });
const results = [];
const pageErrors = [];
const startupRequests = [];
let page;

async function settle() {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function reset(edit = false) {
  await page.evaluate((isEdit) => {
    window.__tileStudioPreview.reset();
    window.__tileStudioPreview.setEditMode(isEdit);
  }, edit);
  await settle();
}
async function configure(config, width = 'full') {
  await page.evaluate(({ value, size }) => {
    window.__tileStudioPreview.setConfig(value);
    window.__tileStudioPreview.setWidth(size);
  }, { value: config, size: width });
  await settle();
}
async function check(name, action) {
  try {
    const detail = await action();
    results.push({ name, status: 'passed', ...(detail ? { detail } : {}) });
    console.log(`PASS ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  } catch (error) {
    results.push({ name, status: 'failed', error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function fixture() {
  const value = createDefaultConfig();
  value.design.minHeight = 0;
  value.tiles = [
    { ...createTile(), title: 'A sparse resource', url: '/safe-target', icon: 'book' },
    { ...createTile(), title: 'A'.repeat(180), description: 'Long unbroken titles must wrap in the available card width without covering adjacent content.', url: '/safe-target', openInNewTab: true, icon: 'printer', status: 'unknown', meta: 'Supporting information stays visible.' },
    { ...createTile(), title: 'A normal resource', description: 'Useful supporting information for an employee.', url: '/safe-target', icon: 'shield', badge: 'New', eyebrow: 'Resources', metric: '42', buttonLabel: 'View resource' },
    { ...createTile(), title: 'Information only', description: 'This card has no link and must not be keyboard-interactive.', icon: 'info' },
  ];
  return value;
}
async function scanAxe(scope = '[data-tile-studio]') {
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return page.evaluate(async (selector) => {
    const result = await window.axe.run(selector, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return result.violations.map(item => ({ id: item.id, impact: item.impact, description: item.description, nodes: item.nodes.slice(0, 4).map(node => ({ html: node.html, target: node.target, failure: node.failureSummary })) }));
  }, scope);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'no-preference' });
    page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => { if (/^https?:/i.test(request.url())) startupRequests.push(request.url()); });
    await page.goto(process.env.PREVIEW_URL || pathToFileURL(path.join(root, 'preview/Tile_Studio_Preview.html')).href);
    await page.waitForFunction(() => Boolean(window.__tileStudioPreview));
    await settle();
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });

    await check('Standalone preview opens without external startup requests', async () => {
      assert.equal(await page.title(), 'Tile Studio · Interactive Preview');
      assert.equal(await page.locator('[data-tile-studio]').count(), 1);
      assert.deepEqual(startupRequests, []);
    });

    await check('Ten layouts fit five narrow-to-wide containers with sparse and long content', async () => {
      await reset();
      const failures = [];
      for (const layout of LAYOUTS) {
        for (const width of [280, 390, 520, 768, 1200]) {
          const value = fixture();
          value.design.layout = layout.id;
          await configure(value, width);
          const measurement = await page.locator('[data-tile-studio] section[data-layout]').evaluate(element => {
            const style = getComputedStyle(element);
            return { width: element.getBoundingClientRect().width, client: element.clientWidth, scroll: element.scrollWidth, viewport: element.getAttribute('data-viewport'), columns: style.getPropertyValue('--ts-columns').trim(), items: element.querySelectorAll('ul > li').length };
          });
          const expectedViewport = measurement.width <= value.responsive.mobileBreakpoint ? 'mobile' : measurement.width <= value.responsive.tabletBreakpoint ? 'tablet' : 'desktop';
          if (measurement.scroll > measurement.client + 1 || measurement.viewport !== expectedViewport || measurement.items !== 4) failures.push({ layout: layout.id, requestedWidth: width, ...measurement });
        }
      }
      assert.deepEqual(failures, []);
      return '50 layout/width combinations';
    });

    await check('Native layout buttons visibly change composed cards and preserve tile content', async () => {
      await reset(true);
      const cfg = fixture();
      cfg.design.compositionTemplate = 'resource'; // force composed renderer, not legacy cards
      await configure(cfg, 1200);
      await page.getByRole('button', { name: 'Open designer', exact: true }).click();
      await page.getByRole('tab', { name: 'Layout', exact: true }).click();
      const variants = [
        { id: 'action', name: 'Action cards' },
        { id: 'compact', name: 'Compact tiles' },
        { id: 'list', name: 'Resource list' },
        { id: 'icon', name: 'Icon grid' },
        { id: 'minimal', name: 'Minimal links' }
      ];
      const signatures = new Map();
      for (const layout of variants) {
        await page.getByRole('group', { name: 'Choose a tile layout' }).getByRole('button', { name: new RegExp(layout.name, 'i') }).click();
        await settle();
        const measure = await page.locator('[data-tile-studio] section[data-layout]').evaluate(element => {
          const card = element.querySelector('[data-composition]');
          const body = element.querySelector('[class*=\"composeBody\"]');
          const grid = element.querySelector('ul');
          return {
            layout: element.dataset.layout,
            columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
            direction: getComputedStyle(body).flexDirection,
            padding: getComputedStyle(body).padding,
            radius: getComputedStyle(card).borderTopLeftRadius,
            align: getComputedStyle(card).textAlign
          };
        });
        assert.equal(measure.layout, layout.id);
        signatures.set(layout.id, JSON.stringify(measure));
        assert.equal(await page.evaluate(() => window.__tileStudioPreview.getConfig().tiles.length), cfg.tiles.length);
      }
      assert.equal(new Set(signatures.values()).size, variants.length);
      assert.ok(JSON.parse(signatures.get('list')).direction === 'row');
      assert.ok(JSON.parse(signatures.get('minimal')).radius === '0px');
      assert.ok(JSON.parse(signatures.get('icon')).align === 'center');
      return '5 distinct computed layouts through the real editor controls';
    });

    await check('Two-column mobile settings tolerate large icons and padding', async () => {
      const failures = [];
      for (const layout of LAYOUTS) {
        const value = fixture();
        value.design.layout = layout.id;
        value.design.padding = 80;
        value.design.iconSize = 64;
        value.responsive.mobileColumns = 2;
        await configure(value, 280);
        const result = await page.locator('[data-tile-studio] section[data-layout]').evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
        if (result.scroll > result.client + 1) failures.push({ layout: layout.id, ...result });
      }
      assert.deepEqual(failures, []);
      return '10 extreme narrow-container combinations';
    });

    await check('Read-mode links, non-links, and unsafe targets have correct semantics', async () => {
      const value = fixture();
      value.tiles[0].url = 'javascript:alert(1)';
      value.tiles[0].title = '<img src=x onerror=alert(1)>';
      await configure(value, 1200);
      const collection = page.locator('[data-tile-studio] section[data-layout]');
      assert.equal(await collection.locator('a').count(), 2);
      assert.equal(await collection.locator('a a, a button').count(), 0);
      assert.equal(await collection.locator('img').count(), 0);
      assert.ok((await collection.textContent()).includes('<img src=x onerror=alert(1)>'));
      const external = collection.locator('a[target="_blank"]');
      assert.equal(await external.getAttribute('rel'), 'noopener noreferrer');
      await external.focus();
      assert.notEqual(await external.evaluate(element => getComputedStyle(element).outlineStyle), 'none');
    });

    await check('Unknown and missing status remain explicit and neutral', async () => {
      const value = fixture();
      value.design.layout = 'status';
      value.tiles = [{ ...value.tiles[0], status: 'none' }, { ...value.tiles[1], status: 'unknown' }];
      await configure(value, 768);
      const collection = page.locator('[data-tile-studio] section[data-layout]');
      assert.ok((await collection.textContent()).includes('Status not supplied'));
      assert.ok((await collection.textContent()).includes('Status unknown'));
      assert.equal(await collection.locator('[data-status="operational"]').count(), 0);
    });

    await check('Hover lift works and reduced motion disables it', async () => {
      const value = fixture();
      value.design.hover = 'lift';
      await configure(value, 1200);
      const link = page.locator('[data-tile-studio] section[data-layout] a').first();
      await link.hover();
      await page.waitForTimeout(250);
      assert.notEqual(await link.evaluate(element => getComputedStyle(element).transform), 'none');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await settle();
      assert.equal(await link.evaluate(element => getComputedStyle(element).transform), 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      value.responsive.reduceMotion = true;
      await configure(value, 1200);
      assert.equal(await link.evaluate(element => getComputedStyle(element).transform), 'none');
    });

    await check('Employee layouts pass automated accessibility rules in light and dark themes', async () => {
      const violations = [];
      for (const theme of ['light', 'dark']) {
        await page.evaluate(name => window.__tileStudioPreview.setTheme(name), theme);
        for (const layout of LAYOUTS) {
          const value = fixture();
          value.design.layout = layout.id;
          await configure(value, 1200);
          const found = await scanAxe();
          if (found.length) violations.push({ theme, layout: layout.id, violations: found });
        }
      }
      fs.writeFileSync(path.join(output, 'axe-employee.json'), JSON.stringify(violations, null, 2));
      assert.deepEqual(violations, []);
      return '20 layout/theme scans';
    });

    await check('Editor supports live content, keyboard tabs, presets, and rejected imports', async () => {
      await reset(true);
      await page.getByRole('button', { name: 'Open designer', exact: true }).click();
      await page.getByLabel('Tile title', { exact: true }).fill('Printer help updated');
      await page.getByLabel('Link', { exact: true }).fill('');
      await page.getByLabel('Link', { exact: true }).pressSequentially('https://example.com/printers');
      assert.equal(await page.getByLabel('Link', { exact: true }).inputValue(), 'https://example.com/printers');
      assert.equal(await page.evaluate(() => window.__tileStudioPreview.getConfig().tiles[0].title), 'Printer help updated');
      const content = page.getByRole('tab', { name: 'Content', exact: true });
      await content.focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.getByRole('tab', { name: 'Layout', exact: true }).getAttribute('aria-selected'), 'true');
      await page.getByRole('tab', { name: 'Presets', exact: true }).click();
      await page.getByLabel('Preset name', { exact: true }).fill('QA saved design');
      await page.getByRole('button', { name: 'Save design', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__tileStudioPreview.getConfig().savedPresets.length), 1);
      await page.getByRole('button', { name: /Compact topics/ }).click();
      assert.equal(await page.evaluate(() => window.__tileStudioPreview.getConfig().tiles[0].title), 'Printer help updated');
      const before = await page.evaluate(() => JSON.stringify(window.__tileStudioPreview.getConfig()));
      await page.getByLabel('Or paste configuration JSON', { exact: true }).fill('{invalid');
      await page.getByRole('button', { name: 'Import configuration', exact: true }).click();
      assert.ok(await page.getByRole('alert').count());
      assert.equal(await page.evaluate(() => JSON.stringify(window.__tileStudioPreview.getConfig())), before);
      await page.getByRole('button', { name: 'Done editing' }).click();
      await settle();
      assert.equal(await page.getByRole('button', { name: 'Open designer', exact: true }).evaluate(element => element === document.activeElement), true);
    });

    await check('All editor tabs fit mobile and pass automated accessibility checks', async () => {
      const violations = [];
      await reset(true);
      await page.getByRole('button', { name: 'Open designer', exact: true }).click();
      for (const theme of ['light', 'dark']) {
        await page.evaluate(name => window.__tileStudioPreview.setTheme(name), theme);
        for (const tab of ['Content', 'Layout', 'Style', 'Responsive', 'Presets']) {
          await page.getByRole('tab', { name: tab, exact: true }).click();
          await page.evaluate(() => window.__tileStudioPreview.setWidth(390));
          await settle();
          const editor = page.locator('[data-testid="studio-editor"]');
          const metrics = await editor.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
          if (metrics.scroll > metrics.client + 1) violations.push({ theme, tab, overflow: metrics });
          const found = await scanAxe('[data-testid="studio-editor"]');
          if (found.length) violations.push({ theme, tab, violations: found });
        }
      }
      fs.writeFileSync(path.join(output, 'axe-editor.json'), JSON.stringify(violations, null, 2));
      assert.deepEqual(violations, []);
      return '10 editor/theme scans at narrow width';
    });

    await check('Unavailable connected data does not fall back to manual samples', async () => {
      await reset();
      const value = fixture();
      value.source.mode = 'sharepoint';
      value.source.siteUrl = 'https://example.sharepoint.com/sites/Technology';
      value.source.listId = '8d6c5f53-273d-49e0-906e-848c7325471c';
      await configure(value, 1200);
      await page.getByText('Resources are unavailable', { exact: true }).waitFor();
      assert.equal(await page.locator('[data-tile-studio] section[data-layout]').count(), 0);
      assert.ok((await page.locator('[data-tile-studio]').textContent()).includes('does not access your tenant'));
    });

    await check('Layout gallery supports ten independent instances with unique ids', async () => {
      await reset();
      await page.evaluate(() => window.__tileStudioPreview.setView('gallery'));
      await settle();
      assert.equal(await page.locator('section[data-layout]').count(), 10);
      const duplicates = await page.evaluate(() => {
        const counts = new Map();
        document.querySelectorAll('[id]').forEach(element => counts.set(element.id, (counts.get(element.id) || 0) + 1));
        return [...counts].filter(([, count]) => count > 1);
      });
      assert.deepEqual(duplicates, []);
      await page.screenshot({ path: path.join(output, 'gallery.png'), fullPage: true });
    });

    await reset(true);
    await page.getByRole('button', { name: 'Open designer', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'editor-desktop.png'), fullPage: true });
    await reset();
    await page.setViewportSize({ width: 390, height: 844 });
    await settle();
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    await check('Phone viewport has no document overflow in employee and editor views', async () => {
      const employee = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(employee.scroll <= employee.width + 1, `Employee view overflow: ${JSON.stringify(employee)}`);
      await page.evaluate(() => window.__tileStudioPreview.setEditorOpen(true));
      await page.getByRole('tab', { name: 'Content', exact: true }).waitFor();
      await settle();
      const editor = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(editor.scroll <= editor.width + 1, `Editor view overflow: ${JSON.stringify(editor)}`);
    });
    await check('No uncaught browser errors occurred', async () => assert.deepEqual(pageErrors, []));
  } finally {
    await browser.close();
    const summary = { generatedAt: new Date().toISOString(), passed: results.filter(item => item.status === 'passed').length, failed: results.filter(item => item.status === 'failed').length, results, pageErrors };
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(summary, null, 2));
    console.log(`Browser checks: ${summary.passed} passed, ${summary.failed} failed.`);
    if (summary.failed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
