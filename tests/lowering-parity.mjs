import fs from 'node:fs';import assert from 'node:assert/strict';import {createState,call,metadata} from './program.mjs';
import {parseExactJSON} from './state-wasm.mjs';
const steps=parseExactJSON(fs.readFileSync(new URL('script.json',import.meta.url),'utf8')),expected=parseExactJSON(fs.readFileSync(new URL('expected.json',import.meta.url),'utf8'));
function capture(v,t){
 if(t.kind==='ref')return capture(v,metadata.named_types[t.name]);
 if(t.kind==='u64')return v;
 if(t.kind==='u32'||t.kind==='i32')return Number(v);
 if(t.kind==='f32')return typeof v==='object'?{F32Bits:Number(v.F32Bits)}:Number(v);
 if(t.kind==='list'||t.kind==='vector')return v.map(x=>capture(x,t.element));
 if(t.kind==='record')return Object.fromEntries(t.fields.map(f=>[f.name,capture(v[f.name],f.type)]));
 if(t.kind==='option')return Object.hasOwn(v,'Some')?{Some:capture(v.Some,t.element)}:v;
 if(t.kind==='result')return Object.hasOwn(v,'Ok')?{Ok:capture(v.Ok,t.ok)}:{Err:capture(v.Err,t.error)};
 return v;
}
const normalize=v=>typeof v==='bigint'?v.toString():typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
const state=createState();let index=0;
for(const step of steps){
 if(step.restore){await state.restore(step.restore.map(Number));continue;}
 const decl=step.pure?metadata.functions.find(f=>f.name===step.pure):metadata.state.actions.find(a=>a.name===step.call);
 const args=step.args.map((v,i)=>capture(v,decl.params[i].type));let reply;
 try{reply=step.pure?{value:call(step.pure,args)}:{outcome:state.invoke(step.call,args)};}catch(e){reply={host_error:e.message};}
 assert.deepEqual(normalize(reply),normalize(expected[index].reply),`step ${index} ${step.pure??step.call}`);
 assert.deepEqual(Array.from(await state.checkpoint()),expected[index].snapshot.map(Number),`snapshot ${index}`);index++;
}
// Failure must leave the instance intact and restore must capture input bytes.
const before=await state.checkpoint();const corrupt=before.slice();corrupt[corrupt.length-1]^=1;await assert.rejects(state.restore(corrupt));assert.deepEqual(await state.checkpoint(),before);
const captured=before.slice();const restoring=state.restore(captured);captured.fill(0);await restoring;assert.deepEqual(await state.checkpoint(),before);
assert.throws(()=>state.invoke('create',['bad','x',0]));assert.deepEqual(await state.checkpoint(),before);
console.log(`${index} JS outcomes and exact portable snapshots matched`);
