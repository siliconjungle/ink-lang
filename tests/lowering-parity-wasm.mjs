import fs from 'node:fs';import assert from 'node:assert/strict';import {StatefulModule,parseExactJSON} from './state-wasm.mjs';
const steps=parseExactJSON(fs.readFileSync(new URL('script.json',import.meta.url),'utf8')),expected=parseExactJSON(fs.readFileSync(new URL('expected.json',import.meta.url),'utf8'));
const normalize=v=>typeof v==='bigint'?v.toString():typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
for(const backend of ['c','rust']){
 const module=await StatefulModule.instantiate(new Uint8Array(fs.readFileSync(new URL(`${backend}/target/wasm32-unknown-unknown/debug/compiled_state.wasm`,import.meta.url))));
 let state=module.create(),index=0;
 for(const step of steps){
  if(step.restore){state.dispose();state=module.restore(new Uint8Array(step.restore.map(Number)));continue;}
  let reply;try{reply=step.pure?{value:state.pure(step.pure,step.args)}:{outcome:state.invoke(step.call,step.args)};}catch(e){reply={host_error:e.message};}
  assert.deepEqual(normalize(reply),normalize(expected[index].reply),`${backend} step ${index}`);
  assert.deepEqual(Array.from(state.snapshot()),expected[index].snapshot.map(Number),`${backend} snapshot ${index}`);index++;
 }
 const before=state.snapshot();assert.throws(()=>state.invoke('create',['bad','x',0n]));assert.deepEqual(state.snapshot(),before);state.dispose();
 console.log(`${backend} Wasm: ${index} values/outcomes and exact snapshots matched`);
}
