import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {SETTINGS,assessEngines,validateEngine} from './policy.mjs';
import {binding,verifyReceipt} from './gate.mjs';
import {equal,measure} from './worker.mjs';
const samples=x=>Array(SETTINGS.samples).fill(x);
const runs=(kind,ratio=1,control=1)=>Array.from({length:3},()=>({isolation:SETTINGS.isolation,identity:kind==='chrome'?{kind,version:'155.0',userAgent:'Chrome/155.0',v8:'test'}:{kind:'node',node:kind==='node22'?'v22.22.1':'v26.1.0',v8:'test'},verification:Object.fromEntries(['baseline','candidate','control'].map(k=>[k,{independentChecks:1}])),rows:[{name:'full-call',callsPerBatch:1024,warmCalls:SETTINGS.warmCalls,completeOutputsChecked:SETTINGS.samples,samplesUs:{baseline:samples(10),candidate:samples(10*ratio),control:samples(10*control)}}]}));
const engines=(a=1,b=1,c=1)=>({node22:runs('node22',a),node26:runs('node26',b),chrome:runs('chrome',c)});
assert.equal(assessEngines(engines(),['full-call']).status,'pass');
const unisolated=engines();delete unisolated.node22[0].isolation;assert.throws(()=>assessEngines(unisolated,['full-call']),/realm isolation/);
const underwarmed=engines();underwarmed.node22[0].rows[0].warmCalls=SETTINGS.warmCalls-1;assert.throws(()=>assessEngines(underwarmed,['full-call']),/invalid warmup/);
const old=assessEngines(engines(1.29,.59),['full-call']);
assert.equal(old.status,'blocked');assert.equal(old.engines.node22.status,'regression');assert.equal(old.engines.node26.status,'pass');
const noisy=engines();noisy.chrome=runs('chrome',1,1.2);assert.equal(assessEngines(noisy,['full-call']).engines.chrome.status,'inconclusive');
const tiny=engines();for(const run of tiny.chrome){const row=run.rows[0];row.samplesUs={baseline:samples(.014),candidate:samples(.014),control:samples(.011)};}
assert.equal(assessEngines(tiny,['full-call']).status,'pass');
const tinyNoisy=structuredClone(tiny);for(const run of tinyNoisy.chrome)run.rows[0].samplesUs.control=samples(.06);
assert.equal(assessEngines(tinyNoisy,['full-call']).engines.chrome.status,'inconclusive');
const tinyRegression=structuredClone(tiny);for(const run of tinyRegression.chrome)run.rows[0].samplesUs.candidate=samples(.06);
assert.equal(assessEngines(tinyRegression,['full-call']).engines.chrome.status,'regression');
const mixed=engines();mixed.node22[1].rows[0].samplesUs.candidate=samples(13);assert.equal(assessEngines(mixed,['full-call']).engines.node22.status,'inconclusive');
assert.throws(()=>assessEngines({node22:runs('node22')},['full-call']),/all required engines/);
const missing=engines();missing.chrome.pop();assert.throws(()=>assessEngines(missing,['full-call']),/missing fresh process/);
assert.throws(()=>validateEngine('node22',{kind:'node',node:'v26.1.0',v8:'test'}),/22.22.1/);
const unchecked=engines();delete unchecked.chrome[0].verification;assert.throws(()=>assessEngines(unchecked,['full-call']),/independent verification/);
assert.throws(()=>equal({a:-0},{a:0}),/unequal/);equal({a:NaN},{a:NaN});
const dir=mkdtempSync(join(tmpdir(),'ink-gate-test-'));
try {
  for(const f of ['source.ink','workload.mjs','baseline.mjs','candidate.mjs','compiler']) writeFileSync(join(dir,f),f);
  const config=join(dir,'config.json');
  writeFileSync(config,JSON.stringify({inputs:['source.ink','workload.mjs'],baseline:'baseline.mjs',cases:['full-call'],frozenHashes:{}}));
  const receipt={schema:'ink-engine-gate-v1',mode:'compiled',settings:SETTINGS,binding:binding(config,join(dir,'candidate.mjs'),join(dir,'compiler')),runs:engines()};
  assert.equal(verifyReceipt(receipt,config,join(dir,'candidate.mjs'),join(dir,'compiler')).status,'pass');
  const rejected=structuredClone(receipt);rejected.runs=engines(1.29,.59);rejected.decision={status:'pass'};
  assert.throws(()=>verifyReceipt(rejected,config,join(dir,'candidate.mjs'),join(dir,'compiler')),/blocked/);
  writeFileSync(join(dir,'candidate.mjs'),'different output');
  assert.throws(()=>verifyReceipt(receipt,config,join(dir,'candidate.mjs'),join(dir,'compiler')),/stale receipt/);
  writeFileSync(join(dir,'realm-module.mjs'),`globalThis.moduleLoads=(globalThis.moduleLoads??0)+1;globalThis.calls=0;export const array=Array;export function run(){return {calls:++globalThis.calls,loads:globalThis.moduleLoads,exceptional:new Float64Array([-0,NaN,Infinity])};}`);
  writeFileSync(join(dir,'realm-adapter.mjs'),`globalThis.adapterLoads=(globalThis.adapterLoads??0)+1;export const cases=[{name:'full-call',lifetime:'complete',create:m=>()=>m.run()}];export function verify(m){if(m.array!==Array||globalThis.moduleLoads!==1||globalThis.adapterLoads!==1)throw Error('shared realm');return {independentChecks:1};}`);
  const creator=new URL('./node-roles.mjs',import.meta.url).href,worker=new URL('./worker.mjs',import.meta.url).href;
  writeFileSync(join(dir,'realm-test.mjs'),`import {createNodeRole} from ${JSON.stringify(creator)};import {equal} from ${JSON.stringify(worker)};const init=JSON.parse(process.argv[2]);const a=await createNodeRole({...init,role:'baseline'}),b=await createNodeRole({...init,role:'candidate'});try{if(a.realm.pid===b.realm.pid||a.realm.pid===process.pid)throw Error('shared process');equal((await a.time('full-call',2)).value,{calls:2,loads:1,exceptional:new Float64Array([-0,NaN,Infinity])});equal((await b.time('full-call',2)).value,{calls:2,loads:1,exceptional:new Float64Array([-0,NaN,Infinity])});equal((await a.time('full-call',1)).value,{calls:3,loads:1,exceptional:new Float64Array([-0,NaN,Infinity])});}finally{await a.close();await b.close();}console.log('isolated ESM realms checked');`);
  const result=execFileSync(process.execPath,[join(dir,'realm-test.mjs'),JSON.stringify({module:pathToFileURL(join(dir,'realm-module.mjs')).href,workload:pathToFileURL(join(dir,'realm-adapter.mjs')).href})],{encoding:'utf8'});
  assert.match(result,/isolated ESM realms checked/);
  writeFileSync(join(dir,'candidate.mjs'),'candidate.mjs');writeFileSync(join(dir,'compiler'),'different compiler');
  assert.throws(()=>verifyReceipt(receipt,config,join(dir,'candidate.mjs'),join(dir,'compiler')),/stale receipt/);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log('Engine gate: cross-engine regression, A/A noise, mixed processes, missing engines, exact outputs and stale receipts rejected');

// Calibration must not give the baseline extra warmup / call-site feedback.
const counts={baseline:0,candidate:0,control:0};
await measure({baseline:'a',candidate:'b',workload:'c',settings:{warmCalls:2,maxCalls:8,warmMs:0,batchMs:0,samples:2},
 createRole:async({role})=>({importMs:0,verification:{independentChecks:1},cases:[{name:'test',lifetime:'complete'}],realm:{Array:class{},Object:class{},Function:class{}},
 time(name,n){counts[role]+=n;return {ms:1,value:{complete:true}};},close(){}})});
assert.deepEqual(counts,{baseline:7,candidate:7,control:7});
