// Matched aggregate histories: actual main artifacts, complete adaptive host cost.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {createStateEngine} from '../../build/frontier-state-main/dist/index.js';
import {OP_SET} from '../frontier-json/node_modules/@shapeshift-labs/frontier/dist/constants.js';
const [bundleArg,profileArg,out,rotationArg='0']=process.argv.slice(2);
const root=path.resolve(bundleArg),rotation=Number(rotationArg);
const bundle=JSON.parse(fs.readFileSync(path.join(root,'bundle.json')));
const fitted=JSON.parse(fs.readFileSync(profileArg));
assert.deepEqual(bundle.binding,fitted.binding);
const {createAdaptiveState}=await import(pathToFileURL(path.join(root,'adaptive-state.mjs')));
const modules=Object.fromEntries(await Promise.all(bundle.artifacts.map(async a=>[a.id,await import(pathToFileURL(path.join(root,a.file)))])));
const seed=modules.direct.createState();for(let i=0;i<128;i++)seed.bind('put')(BigInt(i),BigInt(i));
const initial=await seed.checkpoint();
const restore=async(id,b=initial)=>{const s=modules[id].createState();await s.restore(b);return s;};
const variants=Object.fromEntries(Object.keys(modules).map(id=>[id,{create:()=>restore(id),restore:b=>restore(id,b)}]));
const policy={...fitted.policy,horizon_calls:32768,min_residence_calls:1024,stable_windows:3,max_pause_ns:1e9,memory_limit_bytes:1073741824,max_switches:32};
const traces={steady_read:Array(12).fill('read'),steady_write:Array(12).fill('write'),write_read:[...Array(4).fill('write'),...Array(12).fill('read')],read_write:[...Array(8).fill('read'),...Array(8).fill('write')],short_bursts:Array.from({length:16},(_,i)=>i%2?'read':'write'),sparse_updates:Array.from({length:16},(_,i)=>i%5?'read':'write')};
function script(kinds){return kinds.flatMap((k,t)=>Array.from({length:512},(_,i)=>k==='read'?['zero',[]]:['replace_zero',[BigInt((i*17+t*31)%10007),false]]));}
function frontier(maintained){
 const engine=createStateEngine(Object.fromEntries(Array.from({length:128},(_,i)=>[i,i])));
 let version=128n,sum=8128,events=[];
 return {async call(name,args){
  if(name==='zero')return {result:BigInt(maintained?sum:Object.values(engine.get()).reduce((a,b)=>a+b,0)),committed:false,version,events:[]};
  if(typeof args[0]!=='bigint'||args[0]<0n||args[0]>18446744073709551615n||typeof args[1]!=='boolean')throw Error('invalid input');
  const value=Number(args[0]),old=engine.get()[0];engine.commitPatch([[OP_SET,['0'],value]]);
  if(args[1]){engine.commitPatch([[OP_SET,['0'],old]]);return {result:{Err:'Error.Failed'},committed:false,version,events:[]};}
  sum+=value-old;version++;const event={commit:version,position:0n,channel:'seen',value:args[0]};events.push(event);
  return {result:{Ok:null},committed:true,version,events:[event]};
 },final(){return {rows:engine.get(),version,events};},async close(){engine.clear();}};
}
async function host(mode,diagnostics){
 if(mode.startsWith('frontier'))return frontier(mode.endsWith('maintained'));
 if(mode==='ink_direct'||mode==='ink_cached'){
  const s=await restore(mode==='ink_cached'?'cached':'direct'),bindings=new Map();
  return {async call(n,a){if(!bindings.has(n))bindings.set(n,s.bind(n));return bindings.get(n)(...a);},checkpoint:()=>s.checkpoint(),async close(){}};
 }
 return createAdaptiveState({binding:bundle.binding,profile:fitted.profile,policy,variants,baseline:'direct',enabled:mode!=='ink_fixed_host',recording:mode==='ink_fixed_host'?false:{windowCalls:mode==='ink_adaptive_short'?64:512,sampleEvery:32},onDiagnostic:e=>{if(e.kind==='switched'||e.kind==='adaptation-disabled')diagnostics.push(e);}});
}
function consume(hash,r){let n=Number(r.version)+(r.committed?65537:0);if(typeof r.result==='bigint')n+=Number(r.result);if(r.result?.Err)n+=0xbad;for(const e of r.events)n+=Number(e.value)+Number(e.commit);return(Math.imul(hash,1664525)+n)>>>0;}
const modes=['ink_direct','ink_cached','ink_fixed_host','ink_adaptive','ink_adaptive_short','frontier_scan','frontier_maintained'];
const results=[];
// Separate complete replies/rollback conformance before performance acquisition.
for(const mode of modes){const h=await host(mode,[]),control=await restore('direct');for(const [n,a]of [['zero',[]],['replace_zero',[17n,true]],['zero',[]],['replace_zero',[19n,false]],['zero',[]]])assert.deepEqual(await h.call(n,a,{shape:'rows128',state_elements:128}),control.bind(n)(...a),mode+' complete replies/rollback');await h.close();}
for(const [trace,kinds]of Object.entries(traces)){
 const calls=script(kinds),oracle=await restore('direct');let expected=0;
 const expectedEvents=[];for(const [n,a]of calls){const r=oracle.bind(n)(...a);expected=consume(expected,r);expectedEvents.push(...r.events);}
 const checkpoint=await oracle.checkpoint(),expectedRows={};for(let i=0;i<128;i++)expectedRows[i]=Number(oracle.bind('get')(BigInt(i)).result.Some);
 const rows=[];
 for(let round=0;round<7;round++)for(let j=0;j<modes.length;j++){
  const mode=modes[(j+rotation+round)%modes.length],diagnostics=[];
  global.gc?.();const start=performance.now(),h=await host(mode,diagnostics);let hash=0;
  for(const [n,a]of calls)hash=consume(hash,await h.call(n,a,{shape:'rows128',state_elements:128}));
  const elapsed_ns=(performance.now()-start)*1e6;
  assert.equal(hash,expected,mode+' timed outcomes');
  if(mode.startsWith('frontier')){assert.deepEqual(h.final().rows,expectedRows);assert.equal(h.final().version,128n+BigInt(calls.filter(([n])=>n==='replace_zero').length));assert.deepEqual(h.final().events,expectedEvents);}
  else assert.deepEqual(await h.checkpoint(),checkpoint,mode+' exact portable state');
  await h.close();rows.push({mode,round,elapsed_ns,diagnostics});
 }
 results.push({trace,calls:calls.length,samples:rows});console.error(trace+' verified');
}
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const hashes={};for(const p of [fileURLToPath(import.meta.url),profileArg,...bundle.artifacts.map(a=>path.join(root,a.file)),...['adaptive-state.mjs','adaptive-profile.mjs','usage-window.mjs','ink-selection.mjs','ink-selection.wasm'].map(f=>path.join(root,f)),...['index.js','subscription.js','types.js'].filter(f=>fs.existsSync(path.join(repo,'build/frontier-state-main/dist',f))).map(f=>path.join(repo,'build/frontier-state-main/dist',f))])hashes[p]=createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync(out,JSON.stringify({binding:bundle.binding,node:process.version,cpu:os.cpus()[0].model,rotation,hashes,frontier_revision:execFileSync('git',['-C',path.join(repo,'build/frontier-state-main'),'rev-parse','HEAD'],{encoding:'utf8'}).trim(),timing:'Complete session: state restoration/setup, calls, result checksumming, recording and all migrations. Module import, offline cost acquisition, final snapshot validation and forced GC excluded. Shared host.',scope:'128 numeric rows, finite exact safe-integer domain; watcher-free. Frontier facade adds Ink reply/version/event/rollback observations; maintained control explicitly maintains equivalent sum. No JSON text, heap or startup ranking.',results},null,2)+'\n',{flag:'wx'});
