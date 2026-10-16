import assert from 'node:assert/strict';
import fs from 'node:fs';import * as p from './program.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
for(const c of read('cases.json')){
 assert.deepEqual(p.call(c.name,c.args),c.expected,JSON.stringify(c));
 const codec=p.valueCodecs[c.name],params=p.metadata.functions.find(f=>f.name===c.name).params;
 const value=Object.fromEntries(params.map((param,i)=>[param.name,c.args[i]]));
 assert.deepEqual(p.callBinary(c.name,codec.arguments.encode(value)),codec.result.encode(c.expected));
 assert.deepEqual(p.callCompact(c.name,codec.arguments.compact().encode(value)),codec.result.compact().encode(c.expected));
}
const normalize=v=>typeof v==='bigint'?String(v):typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
const state=p.createState();let observations=0;
assert.ok(p.parallelStatistics().workers>=6);assert.ok(p.parallelStatistics().lastWorkerIds.length>=2);
for(const step of read('history.json')){
 if(step.restore){await state.restore(step.restore);continue;}
 assert.deepEqual(normalize(state.invoke(step.call,step.args)),normalize(step.expected));
 assert.deepEqual(Array.from(await state.checkpoint()),step.snapshot);observations++;
}
// This module's existing bit-carrier public boundary captures composite
// arguments eagerly. Keep that ingress order as well as the lazy source branch.
const trace=[];let failures=0;
const r=Object.fromEntries(['x','y','z'].map((name,i)=>[name,{get F32Bits(){trace.push(name+':bits');return [1069547520,1073741824,1056964608][i];}}]));
const host={};for(const name of ['x','y','z'])Object.defineProperty(host,name,{get(){trace.push(name);if(name==='y'&&failures>0){failures--;throw Error('retry');}return r[name];}});
assert.equal(p.functions.fields(host,false),0);assert.deepEqual(trace,['x','x:bits','y','y:bits','z','z:bits']);trace.length=0;failures=1;
assert.throws(()=>p.functions.fields(host,true),/retry/);
assert.deepEqual(trace,['x','x:bits','y']);trace.length=0;
assert.equal(p.functions.fields(host,true),3.5);
assert.deepEqual(trace,['x','x:bits','y','y:bits','z','z:bits']);
// Test-only instrumentation observes evaluation positions and thrown failures;
// this patched image is never a selected implementation or a proof premise.
const q=await import('./instrumented.mjs');let calls=[];let fail=true;
globalThis.__floatProbe=(value)=>{calls.push(value);if(fail)throw Error('source position');};
assert.equal(q.functions.lazy(1.5,false),0);assert.deepEqual(calls,[]);
assert.throws(()=>q.functions.lazy(1.5,true),/source position/);assert.equal(calls.length,1);
fail=false;assert.equal(q.functions.lazy(1.5,true),3.75);assert.equal(calls.length,2);
calls=[];q.functions.order(1.5,2.0);assert.deepEqual(calls,[1069547520,1073741824,1069547520]);
delete globalThis.__floatProbe;
console.log(JSON.stringify({status:'passed',values:read('cases.json').length,stateOutcomes:observations,restores:17,captureOrder:true,lazyBranches:true,retry:true}));
