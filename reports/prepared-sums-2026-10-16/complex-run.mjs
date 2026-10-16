// Complete count observations against the actual upstream complex walker.
// Usage: node measure-complex.mjs INK_MODULE UPSTREAM_LINE_BREAK.js OUTPUT.json
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';
if(process.argv.length!==5)throw Error('expected INK_MODULE UPSTREAM_LINE_BREAK.js OUTPUT.json');
const [modulePath,upstreamPath,out]=process.argv.slice(2).map(x=>resolve(x));
const ink=await import(pathToFileURL(modulePath)),upstream=await import(pathToFileURL(upstreamPath));
const {getEngineProfile}=await import(pathToFileURL(resolve(dirname(upstreamPath),'measurement.js')));
const source=async path=>{const bytes=await readFile(path);return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
const none={None:null},some=Some=>({Some});
const profiles=['blink','gecko','webkit'].map(engine=>({engine,
 lineFitEpsilon:engine==='webkit'?1/64:0.005,hangTabs:engine!=='gecko',hangsSpacesPerTextFrame:engine==='gecko',
 testsHyphenBeforeAtomic:engine!=='webkit',zeroWidthGlueTakesLine:engine!=='gecko',tabsInAppUnits:engine==='gecko',
 unfitHyphenRetreat:engine==='blink'?'reduced-width':engine==='gecko'?'full-width':'full-width-or-first',
 paddedOpeningFit:engine==='blink'?'start':engine==='webkit'?'placed':'both',
 hardBreakItemRetreat:engine==='blink'?'item':engine==='webkit'?'fit':'last-grapheme'}));
const profileType=ink.compiledValues.prepare.params[0].descriptor.root.fields.find(f=>f.name==='profile').type;
function variant(field,suffix){
 const result=profileType.fields.find(f=>f.name===field).type.variants.find(v=>v.endsWith('.'+suffix));
 assert(result);return result;
}
const warmupRounds=128,samples=15,calls=128;
const rotation=Number(process.env.INK_COMPLEX_PROFILE_ROTATION??0);
if(!Number.isInteger(rotation)||rotation<0||rotation>2)throw Error('profile rotation must be 0, 1 or 2');
const records=[],setup=[],cold=[];let sink=0;
for(const profile of [...profiles.slice(rotation),...profiles.slice(0,rotation)])for(const size of [8,64,512]){
 Object.assign(getEngineProfile(),profile);
 const flags=Array.from({length:size},(_,i)=>[16,3,16,1,16,5,16,8][i%8]);
 const widths=flags.map(k=>k===16?6.25:k===1?1.25:0);
 const advances=flags.map(k=>k===16?[2.125,4.125]:null);
 const p={widths,segmentFlags:Uint8Array.from(flags),simpleLineWalkFastPath:false,simpleLineCountFastPath:false,
  breakableFitAdvances:advances,breakableLineStartExtras:null,lineStartExtras:null,lineEndTrims:null,overflowLineEndTrims:null,
  letterSpacing:.125,discretionaryHyphenWidth:2,discretionaryHyphenContexts:widths.map(()=>0),tabStopAdvance:8,minimumTabAdvance:1};
 const data={base:{widths,flags,advances:advances.map(x=>x===null?none:some(x)),
  startExtras:none,graphemeStartExtras:none,endTrims:none,overflowTrims:none,insideExtras:none,fillExtras:none},
  profile:{epsilon:profile.lineFitEpsilon,hangTabs:profile.hangTabs,hangsSpacesPerTextFrame:profile.hangsSpacesPerTextFrame,
   testsHyphenBeforeAtomic:profile.testsHyphenBeforeAtomic,zeroWidthGlueTakesLine:profile.zeroWidthGlueTakesLine,tabsInAppUnits:profile.tabsInAppUnits,
   hyphenRetreat:variant('hyphenRetreat',{'reduced-width':'ReducedWidth','full-width':'FullWidth','full-width-or-first':'FullWidthOrFirst'}[profile.unfitHyphenRetreat]),
   openingFit:variant('openingFit',{start:'Start',placed:'Placed',both:'Both'}[profile.paddedOpeningFit]),
   hardBreakRetreat:variant('hardBreakRetreat',{item:'Item',fit:'Fit','last-grapheme':'LastGrapheme'}[profile.hardBreakItemRetreat])},
  items:none,letterSpacing:p.letterSpacing,hyphenWidth:p.discretionaryHyphenWidth,hyphenContexts:some(p.discretionaryHyphenContexts),tabStop:p.tabStopAdvance,minimumTab:p.minimumTabAdvance};
 const varying=[0,3,5,10,16,21,32,47,64,80,100,120,150,200,250,1000];
 const expected=varying.map(w=>({Ok:upstream.countPreparedLines(p,w)}));
 let started=process.hrtime.bigint();const raw=ink.functions.prepare(data,1000000).Ok;assert(raw);
 const construction_ns=Number(process.hrtime.bigint()-started),entry=ink.compiledValues.count_prepared;
 started=process.hrtime.bigint();const paragraph=entry.params[0].capture(raw),capturedWidths=varying.map(w=>entry.params[1].capture(w));
 const capture_ns=Number(process.hrtime.bigint()-started);
 started=process.hrtime.bigint();const token=ink.prepareCompiled('count_prepared',[[0,paragraph]]);
 const token_ns=Number(process.hrtime.bigint()-started);
 setup.push({engine:profile.engine,size,construction_ns,capture_ns,token_ns,source_core:ink.metadata.core_sha256});
 const lanes={pretext:i=>({Ok:upstream.countPreparedLines(p,varying[i])}),
  ordinary:i=>entry.result.materialize(ink.callCompiled('count_prepared',[paragraph,capturedWidths[i]])),
  prepared:i=>entry.result.materialize(ink.callPreparedCompiled(token,[capturedWidths[i]]))};
 const names=Object.keys(lanes);
 for(const name of names){
  started=process.hrtime.bigint();const value=lanes[name](0);const ns=Number(process.hrtime.bigint()-started);
  cold.push({engine:profile.engine,name,size,ns});assert.deepEqual(value,expected[0]);
  for(let i=0;i<16;i++)assert.deepEqual(lanes[name](i),expected[i]);
 }
 for(let round=0;round<warmupRounds;round++)for(const name of names)for(let i=0;i<16;i++)sink+=lanes[name](i).Ok;
 for(let sample=0;sample<samples;sample++)for(const name of [...names.slice(sample%names.length),...names.slice(0,sample%names.length)]){
  started=process.hrtime.bigint();for(let i=0;i<calls;i++)sink+=lanes[name](i%16).Ok;
  records.push({engine:profile.engine,name,size,sample,calls,ns_per_call:Number(process.hrtime.bigint()-started)/calls});
  for(let i=0;i<16;i++)assert.deepEqual(lanes[name](i),expected[i]);
 }
}
await writeFile(out,JSON.stringify({schema:1,node:process.version,cpu:os.cpus()[0].model,
 sources:{ink:await source(modulePath),upstream:await source(upstreamPath)},rotation,warmupRounds,samples,calls,setup,cold,records,sink,
 scope:'Diagnostic single-process complete count calls against the pinned upstream complex walker, with explicit engine profiles. Synthetic measured inputs, input capture outside timing, Result materialization included, setup/first calls separate. No browser accuracy, whole lifecycle selection, broad performance or speed-parity claim.'},null,2)+'\n');
