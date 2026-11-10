'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createDefaultConfig, LAYOUTS, layoutSelectionPatch, normalizeConfig } = require('../.test-build/core.cjs');
const css = fs.readFileSync(path.resolve(__dirname, '../src/webparts/tileStudio/components/TileCollection.module.scss'), 'utf8');

const five = ['action', 'compact', 'list', 'icon', 'minimal'];

test('every layout has a unique structural profile and never alters user content', () => {
  const base = createDefaultConfig();
  const patches = new Map();
  for (const layout of LAYOUTS.map(item => item.id)) {
    const patch = layoutSelectionPatch(layout);
    assert.equal(patch.layout, layout);
    const updated = normalizeConfig({ ...base, design: { ...base.design, ...patch } });
    assert.deepEqual(updated.tiles, base.tiles, `layout ${layout} lost manual tile data`);
    assert.deepEqual(updated.source, base.source, `layout ${layout} lost data connection`);
    assert.equal(updated.design.compositionTemplate, base.design.compositionTemplate);
    assert.equal(updated.design.cardInteraction, base.design.cardInteraction);
    assert.equal(updated.design.accentColor, base.design.accentColor);
    assert.equal(updated.design.layout, layout);
    patches.set(layout, JSON.stringify([patch.columns, patch.minHeight, patch.padding, patch.iconPosition, patch.align, patch.titleSize, patch.radius, patch.showDescription]));
  }
  assert.equal(new Set([...patches.values()]).size, LAYOUTS.length, 'all 10 layouts need distinct starting-point profiles');
});

test('all five previously indistinguishable layouts now style composed markup, not just legacy markup', () => {
  for (const id of five) {
    assert.ok(css.includes(`.collection[data-layout='${id}'] .composeBody`), `${id}: composition body has no layout-specific design`);
  }
  assert.match(css, /\.collection\[data-layout='compact'\] \.composeHeader\[data-mode='stacked'\]/);
  assert.match(css, /\.collection\[data-layout='list'\] \.grid[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.collection\[data-layout='icon'\] \.composeCard \{ text-align: center;/);
  assert.match(css, /\.collection\[data-layout='minimal'\] \.composeCard \{[\s\S]*?border-block-end: 1px solid/);
  assert.match(css, /\.collection\[data-viewport='mobile'\]\[data-layout='list'\] \.composeBody/);
  assert.match(css, /\.collection\[data-viewport='mobile'\]\[data-layout='minimal'\] \.composeBody/);
});

test('gallery and native editor share the same layout defaults', () => {
  const selector = fs.readFileSync(path.resolve(__dirname, '../src/webparts/tileStudio/components/editor/LayoutSection.tsx'), 'utf8');
  const preview = fs.readFileSync(path.resolve(__dirname, '../preview/Preview.tsx'), 'utf8');
  assert.match(selector, /design\(layoutSelectionPatch\(layout\.id\)\)/);
  assert.match(preview, /\.\.\.layoutSelectionPatch\(layout\)/);
  assert.doesNotMatch(preview, /const layoutSettings:/);
});
