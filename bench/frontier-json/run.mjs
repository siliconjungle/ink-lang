import {provenance} from './provenance.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {spawn}from'node:child_process';import {createInterface}from'node:readline';import {createHash}from'node:crypto';import {fileURLToPath}from'node:url';
import {cloneJson}from'@shapeshift-labs/frontier/clone';import {diff}from'@shapeshift-labs/frontier/diff';import {applyPatch,applyPatchImmutable}from'@shapeshift-labs/frontier/apply';import {OP_SET,OP_REMOVE}from'@shapeshift-labs/frontier/constants';import {createStateEngine as releasedState}from'@shapeshift-labs/frontier-state';import {encodePatch,decodePatch}from'@shapeshift-labs/frontier-codec';
import {createStateEngine as mainState}from'../../build/frontier-state-main/dist/index.js';import * as ink from '../../build/frontier-json/ink.mjs';import * as indexed from '../../build/frontier-json/ink-indexed.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),D=path.join(ROOT,'build/frontier-json'),OUT=path.join(ROOT,'reports/frontier-json-2026-10-13');fs.mkdirSync(OUT,{recursive:true});
const processIndex=Number(process.argv[2]??0),smoke=process.argv.includes('--smoke'),rounds=smoke?1:9;
const fixtureFilter=process.argv.find(a=>a.startsWith('--fixture='))?.split('=')[1];
const reportPath=path.join(OUT,`state-${fixtureFilter?'targeted-'+fixtureFilter+'-'+processIndex:smoke?'smoke':processIndex}.json`);
if(fs.existsSync(reportPath))throw Error('report exists; choose a fresh process ID');
const provenanceAtStart=provenance(ROOT);
const fixtures=JSON.parse(fs.readFileSync(path.join(D,'fixtures.json'))),raw=[],validation=[],setup=[];
const lanes=['ink-rust-ordered','ink-rust-borrow','ink-rust-indexed','ink-rust-indexed-borrow','ink-js','ink-js-bound','ink-js-prepared','ink-js-db-indexed','frontier-core-patch','frontier-core-diff','frontier-core-dirty','frontier-state-release-patch','frontier-state-main-patch','frontier-state-main-prepared-patch','frontier-state-release-commit','frontier-state-main-commit'].filter(lane=>!process.argv.includes('--javascript-only')||!lane.startsWith('ink-rust'));
const native=spawn(path.join(D,'target/release/ink-frontier-json-benchmark'),[path.join(D,'fixtures.json')],{stdio:['pipe','pipe','inherit']}),pending=[];
createInterface({input:native.stdout}).on('line',line=>{const p=pending.shift();if(!p)throw Error('unexpected native response');p.resolve(JSON.parse(line));});
native.on('exit',code=>{for(const p of pending.splice(0))p.reject(Error('native exit '+code));});
const nativeRun=(fixture,lane,repeats,capture)=>new Promise((resolve,reject)=>{pending.push({resolve,reject});native.stdin.write(JSON.stringify({fixture,lane,repeats,capture})+'\n');});
const normalize=v=>typeof v==='bigint'?Number(v):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
const hashBytes=b=>createHash('sha256').update(b).digest('hex');
function consume(h,r){let e=0;for(const v of r.events)e=(e+Number(v.value)+Number(v.commit)+Number(v.position))>>>0;const value=typeof r.result==='number'?r.result:r.result?.Err?0xbad:0;return(Math.imul(h,1664525)+Number(r.version)+value+(r.committed?65537:0)+e)>>>0;}
function expected(replies,repeats){const commits=replies.filter(r=>r.committed).length;let h=0;for(let cycle=0;cycle<repeats;cycle++)for(const r of replies)h=consume(h,{...r,version:r.version+cycle*commits,events:r.events.map(e=>({...e,commit:e.commit+cycle*commits}))});return h;}
function word(value){if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('u64 requires an exact integer');if(!['number','bigint','string'].includes(typeof value)||typeof value==='string'&&!/^(0|[1-9][0-9]*)$/.test(value))throw Error('invalid u64');const n=BigInt(value);if(n<0n||n>18446744073709551615n)throw Error('invalid u64');return n;}
function frontier(f,lane){
 const isState=lane.includes('state'),isCommit=lane.endsWith('commit'),factory=lane.includes('main')?mainState:releasedState;
 let rows=cloneJson(f.initial),engine=isState?factory(rows):null,version=BigInt(f.rows),outbox=[];
 function invoke_json(name,args){
  if(name==='total')return{result:Object.values(rows).reduce((n,r)=>n+(r.active?r.value:0),0)>>>0,committed:false,version,events:[]};
  const key=args[0],value=name==='put'?args[1]:undefined,fail=args.at(-1),saved=fail&&lane.startsWith('frontier-core-')&&lane!=='frontier-core-patch'?cloneJson(rows[key]):rows[key];
  if(lane==='frontier-core-patch')rows=applyPatch(rows,value?[[OP_SET,[key],value]]:[[OP_REMOVE,[key]]],{cloneValues:true});
  else if(isState&&!isCommit){engine.commitPatch(value?[[OP_SET,[key],lane.includes('prepared')?value:cloneJson(value)]]:[[OP_REMOVE,[key]]]);rows=engine.get();}
  else{
   const target={...rows};if(value)target[key]=lane.includes('prepared')?value:cloneJson(value);else delete target[key];
   if(isState){engine.commit(target);rows=engine.get();}
   else{const patch=diff(rows,target,lane==='frontier-core-dirty'?{dirtyPaths:[[key]]}:undefined);rows=applyPatch(rows,patch,{cloneValues:true});}
  }
  if(fail){const inverse=saved?[[OP_SET,[key],saved]]:[[OP_REMOVE,[key]]];if(engine){engine.commitPatch(inverse);rows=engine.get();}else rows=applyPatch(rows,inverse);return{result:{Err:'Error.Failed'},committed:false,version,events:[]};}
  if(version===18446744073709551615n){const inverse=saved?[[OP_SET,[key],saved]]:[[OP_REMOVE,[key]]];if(engine){engine.commitPatch(inverse);rows=engine.get();}else rows=applyPatch(rows,inverse);throw Error('commit sequence exhausted');}
  version++;const event={commit:version,position:0n,channel:'seen',value:value?.value??0};outbox.push({...event});return{result:{Ok:null},committed:true,version,events:[event]};
 }
 return{invoke_json,acknowledge_through(commit,position){commit=word(commit);position=word(position);const last=outbox.at(-1);if(!last)return;if(last.commit<commit||(last.commit===commit&&last.position<=position)){outbox.length=0;return;}outbox=outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},get rows(){return rows;},get version(){return version;},get outbox(){return outbox.map(e=>({...e}));},dispose(){engine?.clear();}};
}
async function execute(f,index,lane,repeats,capture){
 if(lane.startsWith('ink-rust'))return nativeRun(index,lane,repeats,capture);
 const started=process.hrtime.bigint(),isInk=lane.startsWith('ink-js'),state=isInk?(lane==='ink-js-db-indexed'?indexed:ink).createState():frontier(f,lane);
 const row=r=>({...r,metadata:ink.parseJson(JSON.stringify(r.metadata))});
 if(isInk)for(const [k,r]of Object.entries(f.initial)){await state.invoke_json('put',[k,row(r),false]);(state.acknowledgeThrough??state.acknowledge_through).call(state,0xffffffffffffffffn,0xffffffffffffffffn);}
 const bound=lane==='ink-js-bound'?Object.fromEntries(['put','erase','total'].map(n=>[n,state.bind(n)])):null;
 let script=isInk?f.script.map(s=>s.call==='put'?{...s,args:[s.args[0],row(s.args[1]),s.args[2]]}:s):f.script;
 const beforePrepare=process.hrtime.bigint();
 if(lane==='ink-js-prepared')script=script.map(s=>({...s,prepared:state.prepare(s.call,s.args)}));
 if(lane==='frontier-state-main-prepared-patch')script=script.map(s=>s.call==='put'?{...s,args:[s.args[0],cloneJson(s.args[1]),s.args[2]]}:s);
 const prepare_ns=process.hrtime.bigint()-beforePrepare;
 const initialise_ns=process.hrtime.bigint()-started,initial_snapshot=capture&&isInk?Array.from(await state.checkpoint()):null;
 let checksum=0;const replies=[];const start=process.hrtime.bigint();
 for(let cycle=0;cycle<repeats;cycle++)for(const s of script){const r=await (s.prepared?state.invokePrepared(s.prepared):bound?bound[s.call](...s.args):state.invoke_json(s.call,s.args));checksum=consume(checksum,r);if(capture)replies.push(normalize(r));(state.acknowledgeThrough??state.acknowledge_through).call(state,0xffffffffffffffffn,0xffffffffffffffffn);}
 const elapsed_ns=process.hrtime.bigint()-start,snapshot=capture&&isInk?Array.from(await state.checkpoint()):null,version=Number(state.version);
 if(!isInk){assert.deepEqual(state.rows,f.initial);assert.deepEqual(state.outbox,[]);state.dispose();}
 return{elapsed_ns:String(elapsed_ns),prepare_ns:String(prepare_ns),initialise_ns:String(initialise_ns),checksum,version,replies,snapshot,initial_snapshot};
}
let rng=(0x5ab3ef+processIndex*12345)>>>0;function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=rng%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
try{
 for(let index=0;index<fixtures.length;index++){
  const f=fixtures[index];if(fixtureFilter?f.id!==fixtureFilter:smoke&&!(f.rows===32&&f.mode==='mixed'))continue;
  const control=await execute(f,index,'ink-js',1,true);const expectedReplies=control.replies;
  const counts={};
  for(const lane of shuffle(lanes)){
   const check=await execute(f,index,lane,1,true);assert.deepEqual(check.replies,expectedReplies,lane+' full replies');assert.equal(check.checksum,expected(expectedReplies,1),lane+' checksum');assert.equal(check.version,control.version);
   if(check.snapshot){assert.equal(hashBytes(Buffer.from(check.snapshot)),hashBytes(Buffer.from(control.snapshot)),lane+' exact final checkpoint');assert.equal(hashBytes(Buffer.from(check.initial_snapshot)),hashBytes(Buffer.from(control.initial_snapshot)),lane+' exact initial checkpoint');}
   validation.push({fixture:f.id,lane,full_replies:true,logical_state:true,exact_portable_snapshot:!!check.snapshot,snapshot_sha256:check.snapshot?hashBytes(Buffer.from(check.snapshot)):null});
   const pilot=await execute(f,index,lane,1,false);counts[lane]=smoke?1:Math.max(1,Math.min(512,Math.ceil(20000000/Number(pilot.elapsed_ns))));
  }
  for(let round=0;round<rounds;round++)for(const lane of shuffle(lanes)){
   global.gc?.();const repeats=counts[lane],r=await execute(f,index,lane,repeats,false);assert.equal(r.checksum,expected(expectedReplies,repeats),lane+' timed checksum');assert.equal(r.version,f.rows+repeats*expectedReplies.filter(r=>r.committed).length);
   raw.push({fixture:f.id,rows:f.rows,workload:f.mode,lane,process:processIndex,round,repeats,calls:repeats*f.script.length,elapsed_ns:r.elapsed_ns,checksum:r.checksum});setup.push({fixture:f.id,lane,process:processIndex,round,initialise_ns:r.initialise_ns,prepare_ns:r.prepare_ns??null});
  }
  console.error(`${processIndex}: ${f.id}: all outcomes/state verified, ${rounds} rotated rounds`);
 }
 const report={schema:1,provenance:provenanceAtStart,instrumented:process.execArgv.some(a=>a.startsWith('--cpu-prof')||a.startsWith('--prof')||a.startsWith('--trace')),node:process.version,target:{cpu:os.cpus()[0].model,platform:os.platform(),arch:os.arch(),release:os.release()},process:processIndex,rounds,state_api:'watcher-free; full transactions, rollback, versions, events and acknowledgement supplied in adapter where Frontier omits them',timing_boundary:'retained compiled data; actual in-process calls; native IPC/checkpoints/capture/setup excluded; input capture/output replies included',measurements:raw,setup,validation};
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}finally{native.stdin.end();}
