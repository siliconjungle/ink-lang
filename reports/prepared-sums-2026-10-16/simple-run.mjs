import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';
const [beforePath,currentPath,upstreamPath,out]=process.argv.slice(2).map(x=>resolve(x));
const source=async p=>({path:p,bytes:(await readFile(p)).length,sha256:createHash('sha256').update(await readFile(p)).digest('hex')});
const modules={before:await import(pathToFileURL(beforePath).href),current:await import(pathToFileURL(currentPath).href)};
const upstream=await import(pathToFileURL(upstreamPath).href);
const none={None:null},some=x=>({Some:x});
const records=[],setup=[],cold=[];let sink=0;
function numeric(xs){return xs===null?none:some(xs);}
for(const size of [8,64,512]){
 const widths=Array.from({length:size},(_,i)=>i%3===1?1.25:2.5);
 const flags=widths.map((_,i)=>i%3===1?1:0);
 const advances=flags.map(k=>k===0?[1.125,1.375]:null);
 const p={widths,segmentFlags:Uint8Array.from(flags),simpleLineWalkFastPath:true,simpleLineCountFastPath:true,
  breakableFitAdvances:advances,breakableLineStartExtras:null,lineStartExtras:null,lineEndTrims:null,
  overflowLineEndTrims:null,letterSpacing:0,discretionaryHyphenWidth:0,discretionaryHyphenContexts:null,tabStopAdvance:0,minimumTabAdvance:0};
 const input={widths,flags,advances:advances.map(numeric),startExtras:none,graphemeStartExtras:none,endTrims:none,overflowTrims:none,insideExtras:none,fillExtras:none};
 const varying=[0,3,5,10,16,21,32,47,64,80,100,120,150,200,250,1000];
 const expected=varying.map(w=>({Ok:upstream.countPreparedLines(p,w)}));
 const lanes={pretext:i=>({Ok:upstream.countPreparedLines(p,varying[i])})};
 for(const [name,m] of Object.entries(modules)){
  const start=performance.now(),raw=m.functions.prepare(input,.005,1000000).Ok;assert(raw);const construction=performance.now()-start;
  const entry=m.compiledValues.count_prepared??m.compiledValues.forged;
  const fn=m.compiledValues.count_prepared?'count_prepared':'forged';
  const capturedAt=performance.now(),plan=entry.params[0].capture(raw),widths=varying.map(w=>entry.params[1].capture(w));const capture=performance.now()-capturedAt;
  const preparedAt=performance.now(),token=m.prepareCompiled(fn,[[0,plan]]);const preparation=performance.now()-preparedAt;
  setup.push({name,size,construction_ms:construction,capture_ms:capture,token_ms:preparation,source_core:m.metadata.core_sha256});
  lanes[name+'_ordinary']=i=>entry.result.materialize(m.callCompiled(fn,[plan,widths[i]]));
  lanes[name+'_prepared']=i=>entry.result.materialize(m.callPreparedCompiled(token,[widths[i]]));
 }
 const names=Object.keys(lanes);const calls=32;
 for(const name of names){
  const start=performance.now(),value=lanes[name](0);cold.push({name,size,ns:Number((performance.now()-start)*1e6)});assert.deepEqual(value,expected[0]);
  for(let i=0;i<16;i++)assert.deepEqual(lanes[name](i),expected[i]);
 }
 for(let round=0;round<8;round++)for(const name of names)for(let i=0;i<16;i++)sink+=lanes[name](i).Ok;
 for(let sample=0;sample<9;sample++)for(const name of [...names.slice(sample%names.length),...names.slice(0,sample%names.length)]){
  const start=process.hrtime.bigint();for(let i=0;i<calls;i++)sink+=lanes[name](i%16).Ok;
  records.push({name,size,sample,calls,ns_per_call:Number(process.hrtime.bigint()-start)/calls});
  for(let i=0;i<16;i++)assert.deepEqual(lanes[name](i),expected[i]);
 }
}
await writeFile(out,JSON.stringify({schema:1,node:process.version,cpu:os.cpus()[0].model,sources:{before:await source(beforePath),current:await source(currentPath),upstream:await source(upstreamPath)},setup,cold,records,sink,
 scope:'Diagnostic single-process repeated complete count calls; inputs captured outside timing, Result materialization included. Setup and first calls separate. Synthetic prepared measurements, no font measurement, strings, browser accuracy, GPU, automatic selection or universal speed claim.'},null,2)+'\n');
