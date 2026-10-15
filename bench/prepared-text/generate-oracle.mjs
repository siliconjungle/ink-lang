// Generate expected values by executing pinned, unmodified Pretext source.
// Usage: node generate-oracle.mjs PRETEXT TYPESCRIPT_MODULE OUTPUT_DIRECTORY
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const [upstream,typescript,out]=process.argv.slice(2).map(x=>path.resolve(x));
const revision='0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:upstream,encoding:'utf8'}).trim()!==revision)throw Error('Pretext revision');
execFileSync('git',['diff','--exit-code','HEAD','--','src'],{cwd:upstream,stdio:'pipe'});
const ts=(await import(pathToFileURL(typescript).href)).default;
const transpiled=path.join(out,'upstream');fs.mkdirSync(transpiled,{recursive:true});
fs.writeFileSync(path.join(transpiled,'package.json'),'\u007b"type":"module"\u007d\n');
const hashes={};
function compile(dir){
 for(const entry of fs.readdirSync(path.join(upstream,'src',dir),{withFileTypes:true})){
  const rel=path.join(dir,entry.name);
  if(entry.isDirectory()){compile(rel);continue;}
  if(!entry.name.endsWith('.ts')||entry.name.endsWith('.test.ts')||entry.name==='test-data.ts')continue;
  const source=fs.readFileSync(path.join(upstream,'src',rel),'utf8');
  hashes[`src/${rel}`]=crypto.createHash('sha256').update(source).digest('hex');
  const target=path.join(transpiled,rel.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 }
}compile('');
const api=await import(pathToFileURL(path.join(transpiled,'line-break.js')).href);
const {getEngineProfile}=await import(pathToFileURL(path.join(transpiled,'measurement.js')).href);
const epsilon=getEngineProfile().lineFitEpsilon;
const f=x=>{const b=new ArrayBuffer(8);const d=new DataView(b);d.setFloat64(0,x,true);return {F64Bits:d.getBigUint64(0,true).toString()};};
const floats=xs=>xs===null?null:xs.map(f);
const option=x=>x===null?{None:null}:{Some:x};
function data(widths,flags=widths.map(()=>0),advances=widths.map(()=>null),rest={}){
 return {widths,segmentFlags:Uint8Array.from(flags),simpleLineWalkFastPath:true,simpleLineCountFastPath:true,
  breakableFitAdvances:advances,breakableLineStartExtras:null,lineStartExtras:null,lineEndTrims:null,
  overflowLineEndTrims:null,letterSpacing:0,discretionaryHyphenWidth:0,discretionaryHyphenContexts:null,
  tabStopAdvance:0,minimumTabAdvance:0,...rest};
}
function input(p){return {
 widths:floats(p.widths),flags:Array.from(p.segmentFlags),advances:p.breakableFitAdvances.map(x=>option(floats(x))),
 startExtras:option(floats(p.lineStartExtras)),graphemeStartExtras:option(p.breakableLineStartExtras===null?null:p.breakableLineStartExtras.map(x=>option(floats(x)))),
 endTrims:option(floats(p.lineEndTrims)),overflowTrims:option(floats(p.overflowLineEndTrims)),
 insideExtras:option(floats(p.items?.insideExtras??null)),fillExtras:option(floats(p.items?.fillExtras??null)),
};}
const cases=[];
function add(name,p,width){
 const lines=[];const stats={lineCount:0,maxLineWidth:0};const w=api.normalizeMaxWidth(width);
 api.walkPreparedLinesRaw(p,w,(width,a,b,c,d)=>lines.push({width:f(width),start:{segment:a,grapheme:b},end:{segment:c,grapheme:d}}),stats);
 const count=api.countPreparedLines(p,w);
 cases.push({name,data:input(p),epsilon:f(epsilon),width:f(width),
  count_lines:{Ok:count},lines:{Ok:lines},stats:{Ok:{lineCount:stats.lineCount,maxLineWidth:f(stats.maxLineWidth)}},
  layout:{Ok:{lineCount:count,height:f(count*19.25)}}});
}
for(const width of [0,-0,-3,5,10,Infinity,-Infinity,NaN]){
 add(`empty:${width}`,data([]),width);
 add(`spaces:${width}`,data([0,2,0],[1,1,2]),width);
 add(`word:${width}`,data([12],[0],[[3,4,5]]),width);
 add(`prefix:${width}`,data([0,5,2,6,0],[2,0,1,0,2],[null,[2,3],null,[3,3],null]),width);
}
add('binary64-break-decision',data([16777217],[0],[[8388608,8388609]]),16777216);
add('negative-zero-width',data([-0]),0);
add('line-end-trim',data([6,2,8],[0,1,0],[null,null,[4,4]],{lineEndTrims:[1,0,2]}),5);
add('overflow-trim',data([12,1,7],[0,1,0],[[3,4,5],null,[3,4]],{overflowLineEndTrims:[3,0,0],lineEndTrims:[1,0,0]}),9);
add('reshaped-graphemes',data([20],[0],[[4,5,5,6]],{breakableLineStartExtras:[[1,-1,2,0]]}),8);
add('inline-inside-fill',data([20],[0],[[4,5,5,6]],{items:{insideExtras:[2],fillExtras:[4]}}),9);
add('negative-advances',data([6],[0],[[8,-4,2]],{breakableLineStartExtras:[[0,1,0]]}),5);
add('overflow-to-nan',data([Number.MAX_VALUE,Number.MAX_VALUE,-Number.MAX_VALUE,-Number.MAX_VALUE],[0,0,0,0]),Infinity);
let seed=0x51a3df27;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;}
for(let i=0;i<64;i++){
 const n=1+Math.floor(random()*10);const widths=[],flags=[],advances=[],extras=[],start=[],end=[],overflow=[],inside=[],fill=[];
 for(let j=0;j<n;j++){
  const kind=random()<0.7?0:random()<0.7?1:2;
  const a=kind===0&&random()<0.7?Array.from({length:2+Math.floor(random()*5)},()=>Math.floor(random()*40)/4):null;
  flags.push(kind);advances.push(a);widths.push(kind===2?0:a===null?Math.floor(random()*80)/4:a.reduce((s,x)=>s+x,0));
  extras.push(a===null?null:a.map(()=>Math.floor(random()*9-3)/4));
  start.push(Math.floor(random()*5)/4);end.push(kind===0?Math.floor(random()*5)/4:0);
  overflow.push(kind===0?Math.floor(random()*8)/4:0);inside.push(Math.floor(random()*5)/4);fill.push(Math.floor(random()*5)/4);
 }
 const rest={lineStartExtras:i%3===0?start:null,lineEndTrims:i%4===0?end:null,
  overflowLineEndTrims:i%5===0?overflow:null,breakableLineStartExtras:i%2===0?extras:null,
  ...(i%7===0?{items:{insideExtras:inside,fillExtras:fill}}:{})};
 const p=data(widths,flags,advances,rest);
 for(const w of [0,5+random()*25,200])add(`random-${i}:${w}`,p,w);
}
const fixture={revision,sourceHashes:hashes,scope:'Unmodified upstream simple prepared walkers. Synthetic measured facts; not font, shaping, segmentation or browser accuracy evidence.',cases};
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'oracle.json'),JSON.stringify(fixture,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,revision,oracle:path.join(out,'oracle.json')}));
