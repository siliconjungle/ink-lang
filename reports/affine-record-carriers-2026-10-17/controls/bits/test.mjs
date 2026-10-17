
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url))),cases=read('cases.json');
for(const c of cases){
 const before=structuredClone(c.args);assert.deepEqual(m.call(c.name,c.args),c.expected,c.name);assert.deepEqual(c.args,before,'borrowed inputs');
 const entry=m.compiledValues[c.name],args=c.args.map((v,i)=>entry.params[i].capture(v)),expected=m.valueCodecs[c.name].result.encode(c.expected);
 assert.deepEqual(entry.result.encode(m.callCompiled(c.name,args)),expected,c.name);
 if(c.name!=='parallel')for(const fixed of [[],[0],[0,2],[0,1,2,3]]){
  const token=m.prepareCompiled(c.name,fixed.map(i=>[i,args[i]]));
  for(let attempt=0;attempt<2;attempt++){
   const out=m.callPreparedCompiled(token,args.filter((_,i)=>!fixed.includes(i)));
   assert.deepEqual(entry.result.encode(out),expected,c.name);
   const host=entry.result.materialize(out);host.left.splice(0);host.right.splice(0);host.history.splice(0);host.source.splice(0);
  }
 }
}
assert.ok(m.parallelStatistics().workers>=6);assert.ok(m.parallelStatistics().lastWorkerIds.length>=2);
for(const name of ['advance','finish','identity','wide','index_step','nested_finish']){assert.equal(m.functions[name],undefined);assert.throws(()=>m.call(name,[]),/temporary storage/);}
const q=await import('./instrumented.mjs');globalThis.__ownedAdvance=0;globalThis.__ownedWide=0;
assert.deepEqual(q.functions.run([1.5,-0],[0.25],0.5,3),m.functions.run([1.5,-0],[0.25],0.5,3));assert.equal(globalThis.__ownedAdvance,0);
for(const name of ['folded_left','folded_right','folded_until']){assert.deepEqual(q.functions[name]([1.5,-0],[0.25],0.5,3),m.functions[name]([1.5,-0],[0.25],0.5,3));assert.equal(globalThis.__ownedAdvance,0);}
assert.deepEqual(q.functions.fallback([1.5,-0],[0.25],0.5,3),m.functions.fallback([1.5,-0],[0.25],0.5,3));assert.equal(globalThis.__ownedWide,1);
delete globalThis.__ownedAdvance;delete globalThis.__ownedWide;
const trace=[];let fail=true;const borrowed={get a(){trace.push('a');return 7;},get b(){trace.push('b');if(fail)throw Error('borrowed retry');return 9;}};
assert.equal(m.functions.borrowed_fold([],borrowed),7);assert.deepEqual(trace,['a']);trace.length=0;
assert.throws(()=>m.functions.borrowed_fold([3],borrowed),/borrowed retry/);assert.deepEqual(trace,['b']);trace.length=0;
fail=false;assert.equal(m.functions.borrowed_fold([3],borrowed),3);assert.deepEqual(trace,['b']);trace.length=0;
assert.equal(m.functions.borrowed_stop([3,4],borrowed),3);assert.deepEqual(trace,['a','b']);
const normalize=v=>typeof v==='bigint'?String(v):typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
let outcomes=0,restores=0;
const history=read('history.json');
if(history.length){const state=m.createState();for(const step of history){
 if(step.restore){await state.restore(step.restore);restores++;continue;}
 const actual=state.invoke(step.call,step.args);assert.deepEqual(normalize(actual),normalize(step.expected));
 if(actual.result?.Ok?.left)actual.result.Ok.left.splice(0);
 assert.deepEqual(Array.from(await state.checkpoint()),step.snapshot);outcomes++;
}const before=await state.checkpoint();state.beginTransaction();state.invoke('fit',[[1.5,-0],0.5,3,false]);state.rollbackTransaction();assert.deepEqual(await state.checkpoint(),before);}
console.log(JSON.stringify({status:'passed',values:cases.length,outcomes,restores,actualWorkers:true,preparedReuse:true,detachedOutputs:true}));
