'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const core = require('../.test-build/core.cjs');
const root = path.resolve(__dirname,'../src/webparts/tileStudio/components');

function load(relative, react, extras = {}) {
  const filename = path.join(root,'editor',relative);
  const code = ts.transpileModule(fs.readFileSync(filename,'utf8'), {
    fileName: filename, compilerOptions: {
      module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020,
      jsx:ts.JsxEmit.React,esModuleInterop:true
    }
  }).outputText;
  const mock = {
    react,
    '../../models/config':core,
    '../../models/composition':core,
    '../../models/colorContrast':core,
    '../../models/settingsSearch':core,
    './helpers': {messageFromError:e=>e instanceof Error ? e.message : 'Unknown error',textOnAccent:()=> '#ffffff'},
    './constants': {MAX_IMPORT_BYTES:1024*1024},
    ...extras
  };
  const result = {exports:{}};
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{console,Blob,URL,window:{},document:{}},{filename})(name=> {
    if(!(name in mock)) throw new Error(`Unexpected dependency: ${name} from ${relative}`);
    return mock[name];
  },result,result.exports);
  return result.exports;
}
function hooks() {
  const slots=[];
  let cursor=0;
  const api={
    useState(initial) {
      const index=cursor++;
      if(!(index in slots)) slots[index]={value:typeof initial==='function'?initial():initial};
      return [slots[index].value, next=>{slots[index].value=typeof next==='function'?next(slots[index].value):next;}];
    },
    useRef(initial) {
      const index=cursor++;
      if(!(index in slots))slots[index]={value:{current:initial}};
      return slots[index].value;
    },
    useEffect(callback,deps) {
      const index=cursor++;
      const old=slots[index];
      if(!old || !deps || !old.deps || deps.some((d,i)=>!Object.is(d,old.deps[i])) || deps.length!==old.deps.length) {
        if(old&&typeof old.cleanup==='function')old.cleanup();
        slots[index]={deps,cleanup:callback()};
      }
    }
  };
  return {react:api, render(fn){cursor=0;return fn();}, dispose(){for(const slot of slots)if(slot&&typeof slot.cleanup==='function')slot.cleanup();}};
}
function config() {
  const value=core.createDefaultConfig();
  value.tiles=[core.createTile(),core.createTile()];
  value.tiles[0].title='First'; value.tiles[1].title='Second';
  return value;
}

test('each panel owns an accessible tab and all v1.3 input identities remain present',()=>{
  const shell=fs.readFileSync(path.join(root,'StudioEditor.tsx'),'utf8');
  const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/editor-field-ids-v1.3.json'),'utf8'));
  const allFiles=[path.join(root,'StudioEditor.tsx'),...fs.readdirSync(path.join(root,'editor')).filter(name=>name.endsWith('.tsx')).map(name=>path.join(root,'editor',name))];
  const joined=allFiles.map(p=>fs.readFileSync(p,'utf8')).join('\n');
  const actual=[...new Set([...joined.matchAll(/\bid\(['"]([a-z0-9-]+)['"]\)/g)].map(match=>match[1]))].sort();
  assert.deepEqual(actual,expected,'The modular editor must not silently discard existing field IDs');
  for(const tab of ['content','layout','style','responsive','presets']){
    assert.match(shell,new RegExp(`tab === '${tab}' && <[A-Z]\\w+ editor=\\{editor\\}`));
    assert.match(joined,new RegExp(`id\\('panel-${tab}'\\).*role="tabpanel".*aria-labelledby=\\{id\\('tab-${tab}'\\)\\}`));
  }
  assert.match(shell,/role="tablist"/);
  assert.match(shell,/hidden \/>/);
  assert.ok(shell.split('\n').length<115,'Host shell should only coordinate sections and not grow into a monolith');
});

test('editing draft applies rapid changes against the latest value rather than stale props',()=>{
  const h=hooks(),{useEditorDraft}=load('useEditorDraft.ts',h.react);
  const value=config(), changes=[];
  const draft=h.render(()=>useEditorDraft(value, updated=>changes.push(updated)));
  draft.change({title:'New heading'});
  draft.design({radius:23});
  draft.responsive({mobileColumns:2});
  assert.equal(changes.length,3);
  assert.equal(changes.at(-1).title,'New heading');
  assert.equal(changes.at(-1).design.radius,23);
  assert.equal(changes.at(-1).responsive.mobileColumns,2);
  assert.equal(value.title,config().title,'changes never mutate the old SharePoint property bag');
});

test('tile actions duplicate, move, and edit only the selected tile without modifying siblings',()=>{
  const {createTileActions}=load('createTileActions.ts',{});
  let value=config(),selectedId=value.tiles[0].id,deleteId,notice;
  const make=()=>createTileActions({
    configRef:{get current(){return value;}},selectedId,deleteId,
    change:patch=>{value={...value,...patch};},
    setSelectedId:next=>{selectedId=next;},setDeleteId:next=>{deleteId=next;},setNotice:next=>{notice=next;},focusAfterUpdate:()=>{}
  });
  make().duplicateTile();
  assert.equal(value.tiles.length,3);
  assert.equal(value.tiles[1].id,selectedId);
  assert.equal(value.tiles[1].title,'First copy');
  make().editTile({title:'Edited duplicate'});
  assert.equal(value.tiles[0].title,'First');
  assert.equal(value.tiles[1].title,'Edited duplicate');
  make().moveTile(selectedId,2);
  assert.equal(value.tiles[2].id,selectedId);
  deleteId=selectedId;
  make().removeTile();
  assert.equal(value.tiles.length,2);
  assert.ok(!value.tiles.some(t=>t.id===deleteId));
  assert.equal(notice,'Tile removed.');
});

test('list editor ignores an old response after the site URL has been edited',async()=>{
  const h=hooks(),{useSourceEditor}=load('useSourceEditor.ts',h.react);
  const value=config(),ref={current:value},changes=[];
  let finish;
  const provider={getLists:()=>new Promise(resolve=>{finish=resolve;}),getFields:async()=>[],loadTiles:async()=>({tiles:[]})};
  const args={config:value,configRef:ref,change:patch=>{ref.current={...ref.current,...patch};changes.push(patch);},dataProvider:provider,currentSiteUrl:'https://contoso.sharepoint.com/sites/IT',alive:{current:true}};
  const view=h.render(()=>useSourceEditor(args));
  const pending=view.loadLists();
  view.updateSiteInput('https://contoso.sharepoint.com/sites/Other');
  finish([{id:'old',title:'Stale list'}]);
  await pending;
  const latest=h.render(()=>useSourceEditor(args));
  assert.deepEqual(Array.from(latest.lists),[]);
  assert.equal(latest.loadingLists,false);
  assert.equal(changes.length,0,'stale fetch must not modify saved SharePoint source');
  h.dispose();
});

test('source URL changes invalidate connection-check results, never reporting stale success',async()=>{
  const h=hooks(),{useSourceEditor}=load('useSourceEditor.ts',h.react);
  const value=config(),ref={current:value};
  let finish;
  const provider={getFields:async()=>[],getLists:async()=>[],loadTiles:()=>new Promise(resolve=>{finish=resolve;})};
  const args={config:value,configRef:ref,change:patch=>{ref.current={...ref.current,...patch};},dataProvider:provider,currentSiteUrl:'https://contoso.sharepoint.com/sites/IT',alive:{current:true}};
  const view=h.render(()=>useSourceEditor(args));
  const pending=view.checkConnection();
  view.source({mode:'sharepoint',listId:'00000000-0000-0000-0000-000000000001'});
  finish({tiles:[{title:'stale'}],truncated:false});
  await pending;
  assert.equal(h.render(()=>useSourceEditor(args)).connectionResult,'');
  h.dispose();
});

test('validated import cannot be committed after draft JSON becomes invalid',()=>{
  const h=hooks(),{usePresetsEditor}=load('usePresetsEditor.ts',h.react);
  const value=config(),ref={current:value};
  const args={config:value,configRef:ref,change:patch=>{ref.current={...ref.current,...patch};},alive:{current:true},checkpoint:()=>{},setSelectedId:()=>{},setNotice:()=>{}};
  const good=JSON.stringify(JSON.parse(core.exportConfig(value)));
  let view=h.render(()=>usePresetsEditor(args));
  view.importConfig(good);
  view=h.render(()=>usePresetsEditor(args));
  assert.ok(view.pendingImport,'review holds the validated replacement');
  view.importConfig('{invalid-json');
  view=h.render(()=>usePresetsEditor(args));
  assert.equal(view.pendingImport,undefined,'old confirmed preview is invalidated');
  assert.ok(view.importError,'malformed data is rejected');
  h.dispose();
});

test('preset editing does not change content and export uses latest in-memory settings',()=>{
  const h=hooks(),{usePresetsEditor}=load('usePresetsEditor.ts',h.react);
  let value=config();const ref={get current(){return value;}};
  const args={config:value,configRef:ref,change:patch=>{value={...value,...patch};},alive:{current:true},checkpoint:()=>{},setSelectedId:()=>{},setNotice:()=>{}};
  const view=h.render(()=>usePresetsEditor(args));
  const before=value.tiles.map(t=>t.id);
  view.choosePreset(core.BUILT_IN_PRESETS[0]);
  assert.deepEqual(value.tiles.map(t=>t.id),before);
  assert.equal(value.savedPresets.length,0);
  view.updateSharedPresetSource({enabled:true});
  assert.equal(value.sharedPresetSource.enabled,true);
  h.dispose();
});

test('a local editor rerender with unchanged SharePoint props does not discard rapid edits',()=>{
  const h=hooks(),{useEditorDraft}=load('useEditorDraft.ts',h.react);
  const original=config(); let latest=original;
  const write=next=>{latest=next;};
  let draft=h.render(()=>useEditorDraft(original,write));
  draft.change({title:'Saved locally'});
  // A local notification, selection, or tab state change rerenders before the SPFx host responds.
  draft=h.render(()=>useEditorDraft(original,write));
  draft.change({subtitle:'Second local update'});
  assert.equal(latest.title,'Saved locally');
  assert.equal(latest.subtitle,'Second local update');
  // A new host configuration (e.g. another import/undo) intentionally replaces the draft.
  const externallyReplaced={...latest,title:'SharePoint restored'};
  draft=h.render(()=>useEditorDraft(externallyReplaced,write));
  draft.change({subtitle:'Current'});
  assert.equal(latest.title,'SharePoint restored');
});

test('typing a different SharePoint site invalidates any pending connection status',async()=>{
  const h=hooks(),{useSourceEditor}=load('useSourceEditor.ts',h.react);
  const value=config(),ref={current:value};
  let finish;
  const provider={getFields:async()=>[],getLists:async()=>[],loadTiles:()=>new Promise(resolve=>{finish=resolve;})};
  const args={config:value,configRef:ref,change:patch=>{ref.current={...ref.current,...patch};},dataProvider:provider,currentSiteUrl:'https://contoso.sharepoint.com/sites/IT',alive:{current:true}};
  const view=h.render(()=>useSourceEditor(args));
  const pending=view.checkConnection();
  view.updateSiteInput('https://contoso.sharepoint.com/sites/Other');
  finish({tiles:[{title:'Results from previous site'}],truncated:false});
  await pending;
  const latest=h.render(()=>useSourceEditor(args));
  assert.equal(latest.connectionResult,'');
  assert.equal(latest.checking,false);
  h.dispose();
});

test('a late import file read cannot overwrite a newer pasted JSON draft',async()=>{
  const h=hooks(),{usePresetsEditor}=load('usePresetsEditor.ts',h.react);
  const value=config(),ref={current:value};
  const args={config:value,configRef:ref,change:patch=>{ref.current={...ref.current,...patch};},alive:{current:true},checkpoint:()=>{},setSelectedId:()=>{},setNotice:()=>{}};
  const view=h.render(()=>usePresetsEditor(args));
  let finish;
  const pending=view.readImportFile({size:400,text:()=>new Promise(resolve=>{finish=resolve;})});
  view.editImportText('{"name":"newer paste"}');
  finish('{"name":"older file"}');
  await pending;
  assert.equal(h.render(()=>usePresetsEditor(args)).importText,'{"name":"newer paste"}');
  h.dispose();
});
