import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const out=process.argv[2],native=JSON.parse(fs.readFileSync(`${out}/native.json`)),modules={};
for(const lane of ['literal','selected']){const {instance}=await WebAssembly.instantiate(fs.readFileSync(`${out}/${lane}.wasm`),{});modules[lane]=instance.exports;}
let seed=845;const results=[];
for(const reference of native.results){
 const samples={},setup={},counts={};
 for(const [lane,module]of Object.entries(modules)){
  let start=performance.now();module.bench_prepare(reference.size,reference.which);setup[lane]=(performance.now()-start)*1e6;samples[lane]=[];assert.equal(BigInt.asUintN(64,module.bench_run(1)),BigInt(reference.expected));
  for(let i=0;i<8;i++)module.bench_run(1);start=performance.now();module.bench_run(1);counts[lane]=Math.max(1,Math.min(32768,Math.floor(8/(performance.now()-start))));
 }
 for(let round=0;round<7;round++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;for(const lane of seed%2?['literal','selected']:['selected','literal']){
  const start=performance.now(),actual=modules[lane].bench_run(counts[lane]);samples[lane].push((performance.now()-start)*1e6/counts[lane]);assert.equal(BigInt.asUintN(64,actual),BigInt.asUintN(64,BigInt(reference.expected)*BigInt(counts[lane])));assert.equal(modules[lane].bench_immutable(),1);
 }}
 results.push({size:reference.size,fn:reference.fn,samples_ns:samples,setup_ns:setup});
}
console.log(JSON.stringify({node:process.version,results,boundary:'Same generated JSON conversion/validation, call and serialized full output consumption as native; inputs reside inside Wasm, batch entry overhead amortised. Setup outside timer.'}));
