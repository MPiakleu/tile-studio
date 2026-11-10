'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  createDefaultConfig, normalizeConfig, normalizeTile, resolveCardInteraction,
  safeTileImage, contrastRatio, checkTileContrast, searchSettings,
  exportConfig, parseImport
} = require('../.test-build/core.cjs');

const tenant = 'https://filteredstate.sharepoint.com/sites/Design';

test('new pages only render same-host images unless explicitly approved', () => {
  const newConfig = createDefaultConfig();
  assert.equal(newConfig.imagePolicy, 'tenant');
  assert.equal(safeTileImage('/sites/Design/Assets/photo.png',tenant,newConfig.imagePolicy),'/sites/Design/Assets/photo.png');
  assert.equal(safeTileImage('https://filteredstate.sharepoint.com/sites/Design/picture.webp',tenant,newConfig.imagePolicy),'https://filteredstate.sharepoint.com/sites/Design/picture.webp');
  assert.equal(safeTileImage('https://images.example.com/a.png',tenant,newConfig.imagePolicy),undefined);
  assert.equal(safeTileImage('https://filteredstate.sharepoint.com.evil.test/a.png',tenant,newConfig.imagePolicy),undefined);
  assert.equal(safeTileImage('https://images.example.com/a.png',tenant,'tenant','images.example.com'),'https://images.example.com/a.png');
  assert.equal(safeTileImage('https://sub.images.example.com/a.png',tenant,'tenant','images.example.com'),undefined,'do not grant subdomains implicitly');
  assert.equal(safeTileImage('javascript:alert(1)',tenant,'any-https'),undefined);
  assert.equal(safeTileImage('//outside.test/a.png',tenant,'any-https'),undefined);
});

test('legacy web-part instances retain prior image policy with no data migration', () => {
  const prior = createDefaultConfig();
  delete prior.imagePolicy;
  delete prior.trustedImageHosts;
  const restored = normalizeConfig(prior);
  assert.equal(restored.imagePolicy,'any-https');
  assert.equal(normalizeConfig(createDefaultConfig()).imagePolicy,'tenant');
  assert.equal(parseImport(exportConfig(restored)).imagePolicy,'any-https');
});

test('a second destination always produces separate reachable actions, even without a label', () => {
  const settings = createDefaultConfig().design;
  const card = normalizeTile({title:'Example',url:'/docs',secondaryUrl:'/support',secondaryLabel:''});
  assert.equal(resolveCardInteraction(settings,card),'actions');
  assert.equal(resolveCardInteraction({...settings,cardInteraction:'card'},card),'actions');
  const onlySecondary = normalizeTile({title:'Secondary',url:'',secondaryUrl:'/support'});
  assert.equal(resolveCardInteraction(settings,onlySecondary),'actions');
  assert.equal(resolveCardInteraction({...settings,buttonRadius:40},normalizeTile({title:'Primary',url:'/docs'})),'card');
});

test('contrast checks composite translucent colors rather than ignoring alpha', () => {
  const blackOnWhite = contrastRatio('#000000','#ffffff');
  assert.ok(blackOnWhite > 20 && blackOnWhite < 22);
  assert.ok(contrastRatio('#ffffff','#ffffff') < 1.01);
  const transparent = contrastRatio('#00000000','#ffffff');
  assert.ok(transparent < 1.01);
  const lowContrast = checkTileContrast({text:'#cccccc',muted:'#cccccc',accent:'#dddddd',background:'#ffffff'});
  assert.equal(lowContrast.length,3);
  assert.equal(checkTileContrast({text:'#111111',muted:'#333333',accent:'#153f65',background:'#ffffff'}).length,0);
});

test('settings search navigates to actual field identifiers and accepts several terms', () => {
  const results = searchSettings('text color');
  assert.ok(results.some(item => item.tab==='style' && item.id==='text'));
  assert.ok(searchSettings('image privacy').some(item=>item.id==='image-policy'));
  assert.ok(searchSettings('mobile columns').some(item=>item.id==='mobile-columns'));
  assert.ok(searchSettings('configuration file').some(item=>item.id==='import-file'));
  assert.deepEqual(searchSettings(''),[]);
  const editor = fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/editor/useEditorController.ts'),'utf8');
  assert.match(editor,/target\.closest\('details'\)/,'settings search opens collapsed advanced groups');
  assert.match(editor,/target\.focus\(\)/,'settings search focuses actual setting');
});

test('clickable composed cards never contain nested anchors', () => {
  const source = fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/ComposedTile.tsx'),'utf8');
  assert.match(source,/fullCardLink\) return <span/);
  assert.match(source,/fullCardLink\s*\? <a \{\.\.\.sharedProps\}/);
  assert.match(source,/\: <article \{\.\.\.sharedProps\}/);
  assert.match(source,/referrerPolicy="no-referrer"/);
});
