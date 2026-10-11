// Generated JavaScript, through its public trusted-values call ABI.
// node tools/bench_collection_edits.mjs BASELINE.mjs SELECTED.mjs
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const baseline=await import(pathToFileURL(path.resolve(process.argv[2])));
const selected=await import(pathToFileURL(path.resolve(process.argv[3])));
const median=xs=>xs.sort((a,b)=>a-b)[Math.floor(xs.length/2)];
let checksum=0;
for(const length of [100,10000,100000]){
 const xs=Array.from({length},(_,i)=>i>>>0);
 for(const name of ['unchanged','overwritten_work']){
  const args=name==='unchanged'?[xs,length>>>1,99]:[xs,length>>>1,42];
  assert.deepEqual(baseline.call(name,args),selected.call(name,args));
  for(let i=0;i<20;i++){baseline.call(name,args);selected.call(name,args);}
  const times={baseline:[],selected:[]};const iterations=length>=100000?20:100;
  for(let sample=0;sample<9;sample++){
   const order=sample%2?[['selected',selected],['baseline',baseline]]:[['baseline',baseline],['selected',selected]];
   for(const [label,module] of order){
    const start=performance.now();
    for(let i=0;i<iterations;i++){const result=module.call(name,args);checksum^=Number(result[length>>>1]);}
    times[label].push((performance.now()-start)*1e6/iterations);
   }
  }
  console.log(JSON.stringify({function:name,length,samples:9,iterations,baseline_median_ns:median(times.baseline),selected_median_ns:median(times.selected),transport:'public generated JavaScript trusted-values call; no JSON conversion'}));
 }
}
if(!Number.isInteger(checksum))throw Error('invalid checksum');
