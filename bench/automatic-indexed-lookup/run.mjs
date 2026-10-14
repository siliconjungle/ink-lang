import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const [directory,processIndex,output]=process.argv.slice(2);
const registration=JSON.parse(fs.readFileSync(`${directory}/registration.json`));
const baseline=(await import(pathToFileURL(`${directory}/baseline.mjs`))).functions;
const indexed=(await import(pathToFileURL(`${directory}/indexed.mjs`))).functions;
const rows=[];let sink=0;
for(const operation of ['membership','filtered'])for(const n of registration.sizes)
for(const count of registration.queries)for(const distribution of registration.distributions){
 let keys=Array.from({length:n},(_,i)=>distribution==='unique'?(Math.imul(i,2654435761)+17)>>>0:i%16);
 let queries=Array.from({length:count},(_,i)=>i%2===0?(keys[i%n]??0):(Math.imul(i,7919)+99)>>>0);
 if(operation==='filtered'){keys=keys.map(k=>0xffffffff00000000n+BigInt(k));queries=queries.map(k=>0xffffffff00000000n+BigInt(k));}
 const beforeKeys=[...keys],beforeQueries=[...queries];
 const control=()=>{const set=new Set(keys);return operation==='membership'?queries.map(q=>set.has(q)):queries.filter(q=>set.has(q));};
 const expected=control(),variants={baseline:()=>baseline[operation](keys,queries),indexed:()=>indexed[operation](keys,queries),native_set:control};
 const consume=xs=>{let value=xs.length;for(const x of xs)value=(Math.imul(value,31)^Number(typeof x==='bigint'?x&0xffffffffn:x))|0;return value;};
 const time=(f,reps)=>{const start=performance.now();for(let i=0;i<reps;i++)sink^=consume(f());return (performance.now()-start)*1e6/reps;};
 const repetitions={},samples_ns={};
 for(const [name,f]of Object.entries(variants)){
  assert.deepEqual(f(),expected);let reps=1;
  while(time(f,reps)*reps<registration.batch_ns&&reps<65536)reps*=2;
  repetitions[name]=reps;samples_ns[name]=[];
  for(let i=0;i<3;i++)time(f,reps);
 }
 const names=Object.keys(variants);
 for(let sample=0;sample<registration.samples;sample++)for(let k=0;k<names.length;k++){
  const name=names[(k+sample+Number(processIndex))%names.length];samples_ns[name].push(time(variants[name],repetitions[name]));
 }
 for(const f of Object.values(variants))assert.deepEqual(f(),expected);
 assert.deepEqual(keys,beforeKeys);assert.deepEqual(queries,beforeQueries);
 rows.push({operation,n,queries:count,distribution,output_size:expected.length,validated:true,repetitions,samples_ns});
}
fs.writeFileSync(output,JSON.stringify({schema:1,node:process.version,process:Number(processIndex),sink,registration,rows},null,2)+'\n');
