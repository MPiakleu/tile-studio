'use strict';
/** Deep-dive interaction regression tests: no SPFx runtime or secrets required. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {
  createDefaultConfig, normalizeConfig, normalizeTile, resolveTileAppearance,
  normalizeDesign, normalizeResponsive, applyPreset, BUILT_IN_PRESETS,
  COMPOSITION_TEMPLATES, LAYOUTS, ListDataClient, shouldRenderLegacyCard, resolveCardInteraction,
  exportConfig, parseImport
} = require('../.test-build/core.cjs');

const react = {
  createElement(type, props, ...children) {return {type,props: {...props,children}};},
  useState(value){return [typeof value==='function'?value():value,()=>{}];},
  useEffect(){},
  Fragment: 'fragment'
};
const fakeStyles = new Proxy({}, {get: (_t,k) => String(k)});
function loadComposedTile() {
  const source = fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/ComposedTile.tsx'),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020}}).outputText;
  const requireMock = name => {
    if(name==='react')return react;
    if(name==='../models/composition')return require('../.test-build/core.cjs');
    if(name==='../services/safety')return require('../.test-build/core.cjs');
    if(name==='../models/colorContrast')return require('../.test-build/core.cjs');
    if(name==='./TileIcon')return {TileIcon:()=>null};
    if(name.endsWith('.scss'))return {default:fakeStyles};
    throw Error('Unexpected module '+name);
  };
  const box={exports:{}};
  vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{console}).call(null,requireMock,box,box.exports);
  return box.exports.ComposedTile;
}
const renderTile=loadComposedTile();
function walk(node,pred,out=[]){
 if(Array.isArray(node)){node.forEach(x=>walk(x,pred,out));return out;}
 if(!node||typeof node!=='object')return out;
 if(pred(node))out.push(node);
 if(node.props&&node.props.children)walk(node.props.children,pred,out);
 return out;
}
function elements(tree,tag,cls){return walk(tree,n=>n.type===tag&&(!cls||(n.props.className||'').split(' ').includes(cls)));}
function txt(node){return typeof node==='string'?node:typeof node==='number'?String(node):Array.isArray(node)?node.map(txt).join(''):node&&node.props?txt(node.props.children):'';}
function complete(overrides={}){
 const base=createDefaultConfig();
 base.tiles=[normalizeTile({title:'Sample',description:'Description',url:'/SitePages/sample.aspx',secondaryUrl:'/SitePages/other.aspx',secondaryLabel:'More',buttonLabel:'Open',category:'Productivity',eyebrow:'Helpful',badge:'Approval required',status:'unknown',meta:'3 min read',imageUrl:'/SiteAssets/example.png'})];
 return {...base,...overrides};
}

test('all layout/template combinations preserve independently configured actions and metadata',()=>{
 let count=0;
 for(const layout of LAYOUTS.map(x=>x.id))for(const [template,composition] of Object.entries(COMPOSITION_TEMPLATES))for(const showArrow of [true,false])for(const headerMode of ['stacked','icon-top','icon-inline','category-inline','none']){
  const c=complete();c.design={...c.design,layout,compositionTemplate:template,composition:{...composition,headerMode},showArrow};
  const tree=renderTile({tile:c.tiles[0],config:c,preview:false,instanceId:'matrix',index:0});
  const urls=elements(tree,'a').map(n=>n.props.href).filter(Boolean);
  assert.ok(urls.includes('/SitePages/sample.aspx'),`missing primary ${layout}/${template}/${headerMode}/${showArrow}`);
  assert.ok(urls.includes('/SitePages/other.aspx'),`missing secondary ${layout}/${template}/${headerMode}/${showArrow}`);
  assert.ok(elements(tree,'h3').length===1,'one title');
  assert.ok(elements(tree,'span','composeBadge').length<=1,'no duplicate badge');
  assert.ok(elements(tree,'span','composeStatus').length<=1,'no duplicate status');
  if(!showArrow) assert.equal(elements(tree,'a','composeArrow').length,0,'arrow toggle effective');
  count++;
 }
 assert.equal(count,700);
});

test('repeated footer slots do not duplicate buttons, metadata, or labels',()=>{
 const c=complete();c.design.compositionTemplate='service';c.design.composition={...COMPOSITION_TEMPLATES.service,showBadgeInHeader:true,showStatusInBody:true,footerLeft:'primary',footerCenter:'primary',footerRight:'status'};
 const tree=renderTile({tile:c.tiles[0],config:c,preview:false,instanceId:'dup',index:0});
 assert.equal(elements(tree,'a','composeAction').filter(n=>n.props.href==='/SitePages/sample.aspx').length,1);
 assert.equal(elements(tree,'span','composeStatus').length,1);
 assert.equal(elements(tree,'span','composeBadge').length,1);
});

test('a headerless card does not hide a badge assigned to its footer',()=>{
 const c=complete();c.design.compositionTemplate='service';c.design.composition={...COMPOSITION_TEMPLATES.service,headerMode:'none',showBadgeInHeader:true};
 const tree=renderTile({tile:c.tiles[0],config:c,preview:false,instanceId:'badge',index:0});
 assert.equal(elements(tree,'span','composeBadge').length,1);
});

test('icon hidden is respected even by icon-in-category composition',()=>{
 const c=complete();c.design.compositionTemplate='help';c.design.composition={...COMPOSITION_TEMPLATES.help};c.design.iconPosition='hidden';
 const tree=renderTile({tile:c.tiles[0],config:c,preview:false,instanceId:'hidden',index:0});
 assert.equal(elements(tree,'span','composeIcon').length,0);
});

test('per-tile layout appearance wins over global design without leaking to sibling',()=>{
 const c=complete();const left=normalizeTile({...c.tiles[0],id:'a',appearance:{titleSize:34,titleWeight:'800',padding:7,iconPosition:'right'}});
 const right=normalizeTile({...c.tiles[0],id:'b',appearance:{}});
 assert.equal(resolveTileAppearance(c.design,left).titleSize,34);
 assert.equal(resolveTileAppearance(c.design,left).titleWeight,'800');
 assert.equal(resolveTileAppearance(c.design,right).titleSize,c.design.titleSize);
 assert.equal(resolveTileAppearance(c.design,right).iconPosition,c.design.iconPosition);
 const a=renderTile({tile:left,config:c,preview:false,instanceId:'tilea',index:0});
 const b=renderTile({tile:right,config:c,preview:false,instanceId:'tileb',index:1});
 assert.equal(elements(a,'article')[0].props['data-icon-placement'],'right');
 assert.equal(elements(b,'article')[0].props['data-icon-placement'],'top');
 assert.equal(elements(a,'article')[0].props.style['--ts-tile-pad'],'7px');
 assert.equal(elements(b,'article')[0].props.style['--ts-tile-pad'],'var(--ts-padding)');
});

test('500/600/700/800 title weights roundtrip without being overwritten',()=>{
 for(const w of ['500','600','700','800']){
  const c=complete();c.design.titleWeight=w;const reloaded=parseImport(exportConfig(c));
  assert.equal(reloaded.design.titleWeight,w);
  assert.equal(normalizeDesign({titleWeight:w}).titleWeight,w);
 }
});

test('legacy rendering only remains when advanced controls are at defaults',()=>{
 const c=complete();const tile=normalizeTile({title:'Hello',url:'/docs',appearance:{}});
 assert.equal(shouldRenderLegacyCard(c.design,tile),true);
 for(const patch of [{buttonRadius:20},{footerGap:20},{primaryStyle:'solid'},{statusStyle:'pill'},{titleLineHeight:180}]){
  assert.equal(shouldRenderLegacyCard({...c.design,...patch},tile),false,JSON.stringify(patch));
 }
});

test('all built-in presets preserve the manual tiles and produce bounded responsive values',()=>{
 for(const p of BUILT_IN_PRESETS){
  const c=complete();const before=JSON.stringify(c.tiles);
  const applied=applyPreset(c,p);
  assert.equal(JSON.stringify(applied.tiles),before,p.name);
  assert.ok(applied.responsive.mobileBreakpoint+100<=applied.responsive.tabletBreakpoint,p.name);
  assert.ok(applied.design.columns>=1 && applied.design.columns<=6,p.name);
 }
});

test('mobile breakpoints and columns remain consistently bounded through 1000 setting combinations',()=>{
 let count=0;
 for(const mobile of [320,450,520,600,700])for(const tablet of [600,900,1200,1400])for(const mobileColumns of [1,2])for(const tabletColumns of [1,2,3,4])for(const compact of [false,true])for(const hideMeta of [false,true])for(const hideSecondary of [false,true]){
  const r=normalizeResponsive({mobileBreakpoint:mobile,tabletBreakpoint:tablet,mobileColumns,tabletColumns,compactOnMobile:compact,hideMetaOnMobile:hideMeta,hideSecondaryOnMobile:hideSecondary});
  assert.ok(r.tabletBreakpoint>=r.mobileBreakpoint+100);
  assert.ok(r.mobileColumns>=1 && r.mobileColumns<=2);
  assert.ok(r.tabletColumns>=1 && r.tabletColumns<=4);
  count++;
 }
 assert.equal(count,1280);
});

test('failed coalesced forced request is retriable and cannot poison a later cache', async () => {
 const c=complete(),site='https://tenant.sharepoint.com/sites/Technology';
 const source={...c.source,mode:'sharepoint',siteUrl:site,listId:'8d6c5f53-273d-49e0-906e-848c7325471c'};
 let rejectOld,resolveNew;
 const old=new Promise((_resolve,reject)=>{rejectOld=reject;});
 const fresh=new Promise(resolve=>{resolveNew=resolve;});let n=0;
 const provider=new ListDataClient(site,async()=>{n++;return n===1?old:fresh;});
 const stale=provider.loadTiles(source,true);
 const same=provider.loadTiles(source,true);
 rejectOld(new Error('request failed'));
 await assert.rejects(stale); await assert.rejects(same);
 const current=provider.loadTiles(source,true);
 resolveNew({ok:true,status:200,json:async()=>({value:[{Id:1,Title:'Latest'}]})});
 assert.equal((await current).tiles[0].title,'Latest');
 assert.equal((await provider.loadTiles(source,false)).tiles[0].title,'Latest');
 assert.equal(n,2);
});

test('stylesheet applies shared settings to composed and classic cards',()=>{
 const scss=fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/TileCollection.module.scss'),'utf8');
 const source=fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/ComposedTile.tsx'),'utf8');
 assert.match(scss,/data-mobile-hide-meta='true'\] \.meta/);
 assert.match(scss,/data-mobile-hide-secondary='true'\] \.composeCard\[data-has-primary-link='true'\]/);
 assert.match(source,/data-decorative=\{!tile\.imageAlt\.trim\(\)/);
 assert.match(source,/'data-icon-placement': d\.iconPosition/);
 assert.match(source,/tile\.appearance\.padding === undefined \? 'var\(--ts-padding\)'/);
});

test('invalid per-tile overrides never replace valid global inherited styles',()=>{
 const c=complete(); c.design.compositionTemplate='service';c.design.composition={...COMPOSITION_TEMPLATES.service,footerLeft:'badge',footerCenter:'primary',footerRight:'arrow'};
 const t=normalizeTile({appearance:{iconPosition:'bogus',primaryStyle:'bogus',badgeStyle:'bogus',composition:{footerCenter:'malicious',footerRight:'status'}}});
 const d=resolveTileAppearance(c.design,t);
 assert.equal(d.iconPosition,c.design.iconPosition);
 assert.equal(d.primaryStyle,c.design.primaryStyle);
 assert.equal(d.badgeStyle,c.design.badgeStyle);
 assert.equal(d.composition.footerCenter,'primary');
 assert.equal(d.composition.footerRight,'status');
});

test('secondary-only cards retain a reachable link even with mobile hide-secondary enabled',()=>{
 const c=complete();c.design.compositionTemplate='buttons';c.design.composition={...COMPOSITION_TEMPLATES.buttons};
 const t=normalizeTile({...c.tiles[0],url:'',buttonLabel:'',secondaryUrl:'/SitePages/OnlyAction.aspx',secondaryLabel:'Get help'});
 const tree=renderTile({tile:t,config:c,preview:false,instanceId:'secondary',index:0});
 const links=elements(tree,'a').map(n=>n.props.href);
 assert.deepEqual(links,['/SitePages/OnlyAction.aspx']);
 const scss=fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/TileCollection.module.scss'),'utf8');
 assert.match(scss,/data-mobile-hide-secondary='true'\] \.composeCard\[data-has-primary-link='true'\]/);
});

test('layout selector uses a shared profile rather than only toggling layout ID',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/editor/LayoutSection.tsx'),'utf8');
 assert.match(source,/design\(layoutSelectionPatch\(layout\.id\)\)/);
 const gallery=fs.readFileSync(path.join(__dirname,'../preview/Preview.tsx'),'utf8');
 assert.match(gallery,/layoutSelectionPatch\(layout\)/);
});

test('every editable design field has a persistent schema key after roundtrip',()=>{
 const c=complete();
 const target={...c.design, titleWeight:'800', padding:38,minHeight:297,iconPosition:'right',iconSize:45,shadow:'medium',hover:'shadow',footerGap:22,buttonRadius:16,titleLineHeight:168,descriptionLineHeight:185,categorySize:17,metaSize:15};
 c.design=target;
 const x=parseImport(exportConfig(c));
 for(const [key,value] of Object.entries(target)) assert.deepEqual(x.design[key],value,`lost design setting: ${key}`);
});

test('solid button text contrast follows inherited light SharePoint accent colors',()=>{
 const c=complete(); c.design.compositionTemplate='buttons';c.design.composition={...COMPOSITION_TEMPLATES.buttons};c.design.primaryStyle='solid';
 const tree=renderTile({tile:c.tiles[0],config:c,preview:false,instanceId:'contrast',index:0,themeAccent:'#fff0a0'});
 assert.equal(elements(tree,'article')[0].props.style['--ts-on-accent'],'#101c22');
});

test('v1.2.3 global card background is an explicit style across composed templates', () => {
  for (const layout of LAYOUTS.map(item => item.id)) {
    for (const template of Object.keys(COMPOSITION_TEMPLATES)) {
      const config = complete();
      config.design.layout = layout;
      config.design.compositionTemplate = template;
      config.design.composition = { ...COMPOSITION_TEMPLATES[template] };
      config.design.backgroundColor = '#153f65';
      const tile = normalizeTile({ ...config.tiles[0], backgroundColor: '' });
      const card = elements(renderTile({ tile, config, preview: false, instanceId: 'bg', index: 0 }), 'article')[0];
      assert.equal(card.props.style.backgroundColor, '#153f65', `${layout}/${template}`);
      assert.equal(card.props['data-has-background'], true, `${layout}/${template}`);
    }
  }
});

test('v1.2.3 individual tile background beats section background without leaking', () => {
  const config = complete();
  config.design.layout = 'minimal';
  config.design.compositionTemplate = 'service';
  config.design.composition = { ...COMPOSITION_TEMPLATES.service };
  config.design.backgroundColor = '#153f65';
  const special = normalizeTile({ ...config.tiles[0], backgroundColor: '#ffdbaa' });
  const ordinary = normalizeTile({ ...config.tiles[0], backgroundColor: '' });
  const render = (tile, i) => elements(renderTile({tile,config,preview:false,instanceId:'bg',index:i}), 'article')[0];
  assert.equal(render(special,0).props.style.backgroundColor, '#ffdbaa');
  assert.equal(render(ordinary,1).props.style.backgroundColor, '#153f65');
  const persisted = parseImport(exportConfig({ ...config, tiles: [special, ordinary] }));
  assert.equal(persisted.tiles[0].backgroundColor, '#ffdbaa');
  assert.equal(persisted.tiles[1].backgroundColor, '');
  assert.equal(persisted.design.backgroundColor, '#153f65');
});

test('v1.2.3 no chosen background still inherits theme and keeps minimal transparent', () => {
  const config = complete();
  config.design.layout = 'minimal';
  config.design.compositionTemplate = 'service';
  config.design.composition = { ...COMPOSITION_TEMPLATES.service };
  config.design.backgroundColor = '';
  const tile = normalizeTile({ ...config.tiles[0], backgroundColor: '' });
  const card = elements(renderTile({tile,config,preview:false,instanceId:'unset',index:0}), 'article')[0];
  assert.equal(card.props.style.backgroundColor, undefined);
  assert.equal(card.props['data-has-background'], undefined);
  const stylesheet = fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/TileCollection.module.scss'),'utf8');
  assert.match(stylesheet, /collection\[data-layout='minimal'\]:not\(\[data-has-background='true'\]\)/);
});

test('v1.2.3 legacy cards use the same explicit background precedence as composed cards', () => {
  const source = fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/TileCollection.tsx'),'utf8');
  assert.match(source, /const explicitBackground = validColor\(tile\.backgroundColor, validColor\(design\.backgroundColor, ''\)\)/);
  assert.match(source, /\.\.\.\(explicitBackground \? \{ backgroundColor: explicitBackground \} : \{\}\)/);
  assert.match(source, /'data-has-background': !!\(tile\.backgroundColor \|\| design\.backgroundColor\)/);
});

test('hex color editor previews completed values immediately while incomplete input stays editable', () => {
  const source = fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/EditorControls.tsx'),'utf8');
  assert.match(source, /if \(\/\^#\(\?:\[0-9a-f\]\{6\}\|\[0-9a-f\]\{8\}\)\$\/i\.test\(next\)\) onChange\(next\)/);
  assert.match(source, /onBlur=\{commit\}/);
  const editor = fs.readFileSync(path.join(__dirname,'../src/webparts/tileStudio/components/editor/StyleSection.tsx'),'utf8');
  assert.match(editor, /tile\(s\) have individual background colors/);
});

test('cosmetic settings and inherited overrides cannot alter navigation semantics', () => {
  const config = complete();
  const tile = normalizeTile({ title:'One',url:'/docs',buttonLabel:'Open' });
  assert.equal(resolveCardInteraction(config.design,tile),'card');
  for (const patch of [{buttonRadius:20},{footerGap:20},{primaryStyle:'solid'},{titleLineHeight:180},{minHeight:0}]) {
    assert.equal(resolveCardInteraction({...config.design,...patch},tile),'card');
  }
  const custom= {...config,design:{...config.design,buttonRadius:20}};
  const composed=renderTile({tile,config:custom,preview:false,instanceId:'nav',index:0,currentSiteUrl:'https://tenant.sharepoint.com/sites/Tech'});
  const cards=elements(composed,'a','composeCard');
  assert.equal(cards.length,1,'the composed renderer should keep the full-card anchor');
  assert.equal(cards[0].props.href,'/docs');
  assert.equal(elements(composed,'a','composeAction').length,0,'no nested links');
  assert.equal(resolveCardInteraction(config.design,normalizeTile({url:'/docs',secondaryUrl:'/second',secondaryLabel:'Second'})),'actions');
});
