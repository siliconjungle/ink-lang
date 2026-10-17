
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)));
for(const c of cases){const before=structuredClone(c.args);assert.deepEqual(m.call(c.name,c.args),c.expected,c.name);assert.deepEqual(c.args,before,'caller list stays shared');
 const entry=m.compiledValues[c.name],args=c.args.map((v,i)=>entry.params[i].capture(v)),expected=m.valueCodecs[c.name].result.encode(c.expected);
 assert.deepEqual(entry.result.encode(m.callCompiled(c.name,args)),expected);
 if(c.name!=='parallel'){const token=m.prepareCompiled(c.name,[[0,args[0]]]);for(let i=0;i<2;i++){
  const actual=m.callPreparedCompiled(token,args.slice(1));assert.deepEqual(entry.result.encode(actual),expected);const host=entry.result.materialize(actual);host.values.splice(0);host.shared.splice(0);host.indexed.splice(0);
 }}
}
const q=await import('./instrumented.mjs');for(const n of ['add','stage','index','walk','wide'])globalThis['__owned_'+n]=0;
assert.deepEqual(q.call('run',[[1.5,-0],0.5,3]),m.call('run',[[1.5,-0],0.5,3]));
for(const n of ['add','stage','index'])assert.equal(globalThis['__owned_'+n],0,n+' expanded');assert.ok(globalThis.__owned_walk>0,'recursive helper remains ordinary');
assert.deepEqual(q.call('fallback',[[1.5,-0],0.5,3]),m.call('fallback',[[1.5,-0],0.5,3]));assert.equal(globalThis.__owned_wide,1,'oversized helper remains ordinary');
for(const n of ['add','stage','index','walk','wide']){assert.equal(m.functions[n],undefined);assert.throws(()=>m.call(n,[]),/temporary storage/);delete globalThis['__owned_'+n];}
assert.ok(m.parallelStatistics().workers>=9);assert.ok(m.parallelStatistics().lastWorkerIds.length>=2);
console.log(JSON.stringify({status:'passed',cases:cases.length,expanded:true,ordinaryRecursiveAndBudgetFallback:true,workers:m.parallelStatistics().workers}));
