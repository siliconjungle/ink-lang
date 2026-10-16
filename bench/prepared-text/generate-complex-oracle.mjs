// Execute pinned, unmodified Pretext only. No Ink implementation is consulted.
// Usage: node generate-complex-oracle.mjs PRETEXT TYPESCRIPT_MODULE OUTPUT_DIRECTORY
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
if(process.argv.length!==5)throw Error('expected PRETEXT TYPESCRIPT_MODULE OUTPUT_DIRECTORY');
const [upstream,typescript,out]=process.argv.slice(2).map(x=>path.resolve(x));
const revision='0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:upstream,encoding:'utf8'}).trim()!==revision)throw Error('revision');
execFileSync('git',['diff','--exit-code','HEAD','--','src'],{cwd:upstream});
const ts=(await import(pathToFileURL(typescript))).default;
const output=path.join(out,'upstream');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'package.json'),'{"type":"module"}\n');
const hashes={};
function compile(dir){for(const entry of fs.readdirSync(path.join(upstream,'src',dir),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
 const rel=path.join(dir,entry.name);if(entry.isDirectory()){compile(rel);continue;}
 if(!entry.name.endsWith('.ts')||entry.name.endsWith('.test.ts')||entry.name==='test-data.ts')continue;
 const source=fs.readFileSync(path.join(upstream,'src',rel),'utf8');hashes[`src/${rel}`]=createHash('sha256').update(source).digest('hex');
 const destination=path.join(output,rel.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.writeFileSync(destination,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
}}compile('');
const api=await import(pathToFileURL(path.join(output,'line-break.js')));
const measurement=await import(pathToFileURL(path.join(output,'measurement.js')));
const f=x=>{const b=new DataView(new ArrayBuffer(8));b.setFloat64(0,x,true);return {F64Bits:b.getBigUint64(0,true).toString()};};
const floats=xs=>xs===null?null:xs.map(f),option=x=>x===null?{None:null}:{Some:x};
const profiles=['blink','gecko','webkit'].map(engine=>({engine,
 lineFitEpsilon:engine==='webkit'?1/64:0.005,hangTabs:engine!=='gecko',hangsSpacesPerTextFrame:engine==='gecko',
 testsHyphenBeforeAtomic:engine!=='webkit',zeroWidthGlueTakesLine:engine!=='gecko',tabsInAppUnits:engine==='gecko',
 unfitHyphenRetreat:engine==='blink'?'reduced-width':engine==='gecko'?'full-width':'full-width-or-first',
 paddedOpeningFit:engine==='blink'?'start':engine==='webkit'?'placed':'both',
 hardBreakItemRetreat:engine==='blink'?'item':engine==='webkit'?'fit':'last-grapheme'}));
const enumValue=(x,map)=>map[x];
function data(widths,flags,advances=widths.map(()=>null),rest={}){return {widths,segmentFlags:Uint8Array.from(flags),
 simpleLineWalkFastPath:false,simpleLineCountFastPath:false,breakableFitAdvances:advances,breakableLineStartExtras:null,
 lineStartExtras:null,lineEndTrims:null,overflowLineEndTrims:null,letterSpacing:0,discretionaryHyphenWidth:2,
 discretionaryHyphenContexts:null,tabStopAdvance:8,minimumTabAdvance:1,...rest};}
function input(p,profile){return {
 base:{widths:floats(p.widths),flags:Array.from(p.segmentFlags),advances:p.breakableFitAdvances.map(x=>option(floats(x))),
  startExtras:option(floats(p.lineStartExtras)),graphemeStartExtras:option(p.breakableLineStartExtras===null?null:p.breakableLineStartExtras.map(x=>option(floats(x)))),
  endTrims:option(floats(p.lineEndTrims)),overflowTrims:option(floats(p.overflowLineEndTrims)),
  insideExtras:option(floats(p.items?.insideExtras??null)),fillExtras:option(floats(p.items?.fillExtras??null))},
 profile:{epsilon:f(profile.lineFitEpsilon),hangTabs:profile.hangTabs,hangsSpacesPerTextFrame:profile.hangsSpacesPerTextFrame,
  testsHyphenBeforeAtomic:profile.testsHyphenBeforeAtomic,zeroWidthGlueTakesLine:profile.zeroWidthGlueTakesLine,tabsInAppUnits:profile.tabsInAppUnits,
  hyphenRetreat:enumValue(profile.unfitHyphenRetreat,{'reduced-width':'ReducedWidth','full-width':'FullWidth','full-width-or-first':'FullWidthOrFirst'}),
  openingFit:enumValue(profile.paddedOpeningFit,{start:'Start',placed:'Placed',both:'Both'}),
  hardBreakRetreat:enumValue(profile.hardBreakItemRetreat,{item:'Item',fit:'Fit','last-grapheme':'LastGrapheme'})},
 items:option(p.items===undefined?null:{hyphenWidths:option(floats(p.items.hyphenWidths)),hyphenRooms:option(floats(p.items.hyphenRooms)),
  itemEndHalts:option(floats(p.items.itemEndHalts)),openingEdges:option(floats(p.items.openingEdges)),emptyObjectSpaces:option(floats(p.items.emptyObjectSpaces)),
  emptyObjectReturns:option(p.items.emptyObjectReturns===null?null:Array.from(p.items.emptyObjectReturns)),tabStops:option(floats(p.items.tabStopAdvances)),minimumTabs:option(floats(p.items.minimumTabAdvances))}),
 letterSpacing:f(p.letterSpacing),hyphenWidth:f(p.discretionaryHyphenWidth),hyphenContexts:option(floats(p.discretionaryHyphenContexts)),tabStop:f(p.tabStopAdvance),minimumTab:f(p.minimumTabAdvance)};}
const cases=[];
function add(name,p,width,profile){
 Object.assign(measurement.getEngineProfile(),profile);
 const lines=[],stats={lineCount:0,maxLineWidth:0},w=api.normalizeMaxWidth(width);
 api.walkPreparedLinesRaw(p,w,(width,a,b,c,d)=>{if(lines.length>10000)throw Error('upstream progress');lines.push({width:f(width),start:{segment:a,grapheme:b},end:{segment:c,grapheme:d}});},stats);
 const d=input(p,profile),expected={lines:{Ok:lines},stats:{Ok:{lineCount:stats.lineCount,maxLineWidth:f(stats.maxLineWidth)}},
  count_lines:{Ok:api.countPreparedLines(p,w)},layout:{Ok:{lineCount:stats.lineCount,height:f(stats.lineCount*19.25)}}};
 const row={name:profile.engine+':'+name,data:d,width:f(width),...expected};cases.push(row);
 const cursors=[{segment:0,grapheme:0},...lines.map(line=>line.end)];row.continuations=[];
 for(const cursor of cursors){
  const upstreamCursor={segmentIndex:cursor.segment,graphemeIndex:cursor.grapheme};let expected={Ok:{None:null}};
  if(api.normalizePreparedLineStart(p,upstreamCursor)){
   const start={segment:upstreamCursor.segmentIndex,grapheme:upstreamCursor.graphemeIndex};
   const nextWidth=api.stepPreparedLineGeometryFromStart(p,upstreamCursor,w);
   if(nextWidth!==null)expected={Ok:{Some:{start,end:{segment:upstreamCursor.segmentIndex,grapheme:upstreamCursor.graphemeIndex},width:f(nextWidth)}}};
  }
  row.continuations.push({cursor,expected});

 }
}
function items(n,rest={}){return {hyphenWidths:null,hyphenRooms:null,itemEndHalts:null,insideExtras:null,fillExtras:null,
 openingEdges:null,emptyObjectSpaces:null,emptyObjectReturns:null,tabStopAdvances:null,minimumTabAdvances:null,...rest};}
for(const profile of profiles){
 const fixed=[['empty',data([],[])],['soft-hyphen',data([6,0,8],[16,3,16],[[3,3],null,[4,4]],{discretionaryHyphenContexts:[0,1,0]})],
  ['hard-breaks',data([0,0,6,0,0],[8,8,16,8,8])],['tabs',data([6,0,4,0,8],[16,5,16,5,16])],
  ['hanging',data([6,2,0,0,8],[16,4,3,2,16])],['glue-control',data([0,6,0,8],[6,16,7,16])],
  ['objects',data([6,2,0,8],[16,1,9,16])],['spaced',data([6,2,8],[16,1,16],[[3,3],null,[4,4]],{letterSpacing:0.25})],
  ['rich-hyphen-object',data([6,0,0,2,0,8],[16,3,9,4,5,16],[[3,3],null,null,null,null,[4,4]],
   {letterSpacing:0.25,discretionaryHyphenContexts:[0,1,0,0,0,0],items:items(6,{hyphenWidths:[0,3,0,0,0,0],hyphenRooms:[1,2,3,1,0,0,0],
    insideExtras:[0,0,0,0,2,0],fillExtras:[0,0,0,0,2,0],openingEdges:[0,0,1,0,0,0],emptyObjectSpaces:[-1,-1,2,-1,-1,-1],emptyObjectReturns:Uint8Array.from([0,0,1,0,0,0]),
    tabStopAdvances:[8,8,8,8,5,8],minimumTabAdvances:[1,1,1,1,0.5,1]})})],
  ['rich-trimmed',data([9,2,0,0,8],[16,4,9,8,16],[[3,3,3],null,null,null,[4,4]],
   {lineStartExtras:[1,0,0,0,1],lineEndTrims:[1,0,1,0,2],overflowLineEndTrims:[2,0,1,0,2],breakableLineStartExtras:[[0,0.5,-0.5],null,null,null,[0,1]],
    items:items(5,{insideExtras:[1,0,0,0,2],fillExtras:[1,0,0,0,2],itemEndHalts:[1,0,0,0,1],openingEdges:[0,0,1,0,0]})})]];
 for(const [name,p]of fixed)for(const width of [0,-0,-3,5,10,Infinity,-Infinity,NaN])add(name+':'+String(width),p,width,profile);
 let seed=0x6ac1f293;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 for(let i=0;i<80;i++){
  const n=1+Math.floor(random()*12),widths=[],flags=[],advances=[];
  for(let j=0;j<n;j++){
   const k=Math.floor(random()*10),a=k===0&&random()<0.7?Array.from({length:2+Math.floor(random()*4)},()=>Math.floor(random()*16)/4):null;
   flags.push(k|(k===0?16:0));advances.push(a);widths.push([2,3,5,6,7,8].includes(k)?0:a===null?Math.floor(random()*32)/4:a.reduce((a,b)=>a+b,0));
  }
  const p=data(widths,flags,advances,{letterSpacing:i%3===0?0.25:0,discretionaryHyphenContexts:i%2===0?widths.map(()=>0):null});
  if(i%4===0)p.items=items(n,{hyphenWidths:widths.map(()=>2),hyphenRooms:Array.from({length:n+1},()=>1),
   insideExtras:widths.map(()=>0.5),fillExtras:widths.map(()=>0.5),openingEdges:widths.map((_,j)=>flags[j]%16===9?0.5:0),
   itemEndHalts:widths.map((_,j)=>flags[j]%16===0?0.25:0)});
  for(const w of [0,5+random()*15,100])add('random-'+i+':'+String(w),p,w,profile);
  const flagged={...p,segmentFlags:Uint8Array.from(flags,(flag,j)=>flag|((j+i)%4===0?32:(j+i)%4===1?64:0)),
   letterSpacing:i%2===0?-0.5:0.5};
  for(const w of [0,9.125,100])add('flags-'+i+':'+String(w),flagged,w,profile);
 }
}
const fixture={revision,sourceHashes:hashes,scope:'Unmodified upstream complex prepared walkers on synthetic measured facts and explicit numerical engine profiles. Not font/segmentation/shaping/browser accuracy evidence.',cases};
fs.mkdirSync(out,{recursive:true});
const bytes=gzipSync(Buffer.from(JSON.stringify(fixture)+'\n'),{level:9});
fs.writeFileSync(path.join(out,'complex-oracle.json.gz'),bytes);
console.log(JSON.stringify({cases:cases.length,checks:cases.reduce((n,c)=>n+4+c.continuations.length,0),revision,sha256:createHash('sha256').update(bytes).digest('hex')}));
