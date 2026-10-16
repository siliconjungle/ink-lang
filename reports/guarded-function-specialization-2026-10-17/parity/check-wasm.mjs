import fs from 'node:fs';import assert from 'node:assert/strict';import {StatefulModule,parseExactJSON} from './state-wasm.mjs';
import {metadata} from './program.mjs';
const steps=parseExactJSON(fs.readFileSync(new URL('script.json',import.meta.url),'utf8')),expected=parseExactJSON(fs.readFileSync(new URL('expected.json',import.meta.url),'utf8'));
const normalize=v=>typeof v==='bigint'?v.toString():typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
for(const backend of ['rust']){
 const module=await StatefulModule.instantiate(new Uint8Array(fs.readFileSync(new URL(`${backend}/target/wasm32-unknown-unknown/debug/compiled_state.wasm`,import.meta.url))));
 let state=module.create(),index=0;
 for(const step of steps){
  if(step.reject_restore){const before=state.snapshot();assert.throws(()=>module.restore(new Uint8Array(step.reject_restore.map(Number))),new RegExp(step.restore_error??'invariant'));assert.deepEqual(state.snapshot(),before);continue;}
  if(step.restore){state.dispose();state=module.restore(new Uint8Array(step.restore.map(Number)));continue;}
  const before=module.parallelStatistics();
  let reply;try{if(step.async){const pending=step.pure?state.pureAsync(step.pure,step.args):state.invokeAsync(step.call,step.args);if(!step.pure){assert.throws(()=>state.invoke(step.call,step.args),/operation already in progress/);assert.throws(()=>state.snapshot(),/operation already in progress/);}reply=step.pure?{value:await pending}:{outcome:await pending};}else reply=step.pure?{value:state.pure(step.pure,step.args)}:{outcome:state.invoke(step.call,step.args)};}catch(e){reply={host_error:e.message};}
  if(step.expect_workers){const after=module.parallelStatistics();assert.ok(after.workers-before.workers>=2);assert.ok(after.lastWorkerIds.length>=2);}
  assert.deepEqual(normalize(reply),normalize(expected[index].reply),`${backend} step ${index}`);
  assert.deepEqual(Array.from(state.snapshot()),expected[index].snapshot.map(Number),`${backend} snapshot ${index}`);index++;
 }
 const before=state.snapshot();
 // In inventory histories these exercise nominal ID ingress, including short
 // but valid hexadecimal text. Every rejected call must retain exact state.
 const create=metadata.state?.actions.find(action=>action.name==='create');
 if(create?.params[0]?.type.kind==='id'&&create.params[1]?.type.kind==='string'&&create.params[2]?.type.kind==='u32'){
  for(const id of ['bad','0'.repeat(31),'0'.repeat(33),'g'.repeat(32),0n,null]){
   assert.throws(()=>state.invoke('create',[id,'x',0n]));assert.deepEqual(state.snapshot(),before);
  }
 }
 assert.throws(()=>state.invoke('__unknown_action__',[]));assert.deepEqual(state.snapshot(),before);
 if(steps.some(s=>s.async)){await assert.rejects(state.invokeAsync('__unknown_action__',[]));assert.deepEqual(state.snapshot(),before);await assert.rejects(state.invokeAsync('batch',['invalid',false]));assert.deepEqual(state.snapshot(),before);}
 state.dispose();
 console.log(`${backend} Wasm: ${index} values/outcomes and exact snapshots matched`);
}
