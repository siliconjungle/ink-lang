
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)));
for(const c of cases){const before=structuredClone(c.args);assert.deepEqual(m.call(c.name,c.args),c.expected,c.name);assert.deepEqual(c.args,before);
 const entry=m.compiledValues[c.name],args=c.args.map((v,i)=>entry.params[i].capture(v));
 assert.deepEqual(entry.result.encode(m.callCompiled(c.name,args)),m.valueCodecs[c.name].result.encode(c.expected));
 if(c.name!=='parallel'){const token=m.prepareCompiled(c.name,[[0,args[0]],[1,args[1]]]);for(let i=0;i<2;i++){
  const actual=m.callPreparedCompiled(token,args.slice(2));assert.deepEqual(entry.result.encode(actual),m.valueCodecs[c.name].result.encode(c.expected));entry.result.materialize(actual).splice(0);
 }}
}
assert.ok(m.parallelStatistics().workers>=8);assert.ok(m.parallelStatistics().lastWorkerIds.length>=2);
console.log(JSON.stringify({status:'passed',cases:cases.length,workers:m.parallelStatistics()}));
