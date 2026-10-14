// Paired complete calls and a separate instrumented boundary profile. No optimiser.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [javascriptPath,rustPath,hostPath]=process.argv.slice(2);
if(!hostPath)throw Error('javascript program, Rust-Wasm and state-wasm host paths required');
const rows=Number(process.env.INK_PROFILE_ROWS??4000),calls=Number(process.env.INK_PROFILE_CALLS??1000);
assert(Number.isInteger(rows)&&rows>0&&rows<=100_000);assert(Number.isInteger(calls)&&calls>=100&&calls<=10000);
const mixes=(process.env.INK_PROFILE_READS??'100,90,0').split(',').map(Number),rounds=Number(process.env.INK_PROFILE_ROUNDS??5);
assert(mixes.length>0&&mixes.length<=16&&mixes.every(n=>Number.isInteger(n)&&n>=0&&n<=100));
assert(Number.isInteger(rounds)&&rounds>=1&&rounds<=20);
const {StatefulModule,stringifyExactJSON}=await import(pathToFileURL(hostPath));
const javascript=await import(pathToFileURL(javascriptPath));
const source=javascript.createState(),maximum=0xffffffffffffffffn;
for(let i=0;i<rows;i++){await source.invoke_json('put',[BigInt(i),BigInt(i*13+7),i%3!==0,false]);source.acknowledge_through(maximum,maximum);}
const snapshot=await source.checkpoint(),observations=[],profiles=[];
const artifacts={};for(const [label,path]of Object.entries({javascript:javascriptPath,'rust-wasm':rustPath,host:hostPath}))artifacts[label]={path,sha256:createHash('sha256').update(await fs.readFile(path)).digest('hex')};
const hosts={'rust-wasm':await StatefulModule.instantiate(await fs.readFile(rustPath))};
if(process.env.INK_PROFILE_BASELINE_HOST){
 const path=process.env.INK_PROFILE_BASELINE_HOST;
 const baseline=await import(pathToFileURL(path));
 artifacts.baseline_host={path,sha256:createHash('sha256').update(await fs.readFile(path)).digest('hex')};
 hosts['baseline-rust-wasm']=await baseline.StatefulModule.instantiate(await fs.readFile(rustPath));
}
const canonical=v=>typeof v==='bigint'?v.toString():Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
const normalize=x=>JSON.stringify(canonical(x));
const clock=()=>process.hrtime.bigint();
function script(reads){return Array.from({length:calls},(_,i)=>i%100<reads?['total_query',[]]:i%4===0?['erase',[BigInt(i*17%rows),false]]:['put',[BigInt(i*17%rows),BigInt(100000+i),i%3!==0,false]]);}
for(const reads of mixes){
 const actions=script(reads),expected=javascript.createState();await expected.restore(snapshot);const replies=[];
 let start=clock();for(const [call,args]of actions){replies.push(await expected.invoke_json(call,args));expected.acknowledge_through(maximum,maximum);}const javascriptNs=clock()-start,final=await expected.checkpoint();
 for(let round=0;round<rounds;round++){
  const lanes=round%2?Object.entries(hosts).reverse():Object.entries(hosts);
  for(const [lane,host]of lanes){
   const restoreStart=clock(),state=host.restore(snapshot),restoreNs=clock()-restoreStart;
   const actual=[];start=clock();for(const [call,args]of actions){actual.push(state.invoke(call,args));state.acknowledge(maximum,maximum);}const ns=clock()-start;
   assert.equal(normalize(actual),normalize(replies));assert.deepEqual(state.snapshot(),final);
   observations.push({lane,rows,calls,read_percent:reads,round,ns:String(ns),restore_ns:String(restoreNs),javascript_ns:String(javascriptNs),linear_memory_bytes:host.exports.memory.buffer.byteLength});state.dispose();
  }
 }
 for(const [lane,host]of Object.entries(hosts)){
  const state=host.restore(snapshot),totals={encode:0n,input_allocation_copy:0n,guest_invoke:0n,response_copy_decode:0n,release_ack:0n};const actual=[];
  for(const [call,args]of actions){
   let t=clock();const wire=host.encoder.encode(stringifyExactJSON({call,args}));let next=clock();totals.encode+=next-t;t=next;
   const input=host.input(wire);next=clock();totals.input_allocation_copy+=next-t;t=next;
   const output=host.call('lang_invoke',state.handle,input)>>>0;next=clock();totals.guest_invoke+=next-t;t=next;
   const reply=host.response(output);next=clock();totals.response_copy_decode+=next-t;t=next;
   host.release(input);state.acknowledge(maximum,maximum);next=clock();totals.release_ack+=next-t;actual.push(reply);
  }
  assert.equal(normalize(actual),normalize(replies));assert.deepEqual(state.snapshot(),final);state.dispose();
  profiles.push({lane,rows,calls,read_percent:reads,segments_ns:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,String(v)]))});
 }
}
console.log(JSON.stringify({schema:1,node:process.version,artifacts,scope:'complete calls with exact JSON arguments, parsed replies and acknowledgement; cold portable restore separate; oracle and snapshots checked outside timing; instrumented segments include clock overhead and are not speedup measurements; linear memory is reserved backing, not live-state size',observations,profiles}));
