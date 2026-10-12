import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const directory=process.argv[2],native=JSON.parse(fs.readFileSync(`${directory}/native.json`));
const modules={};for(const lane of Object.keys(native.lanes)){const {instance}=await WebAssembly.instantiate(fs.readFileSync(`${directory}/${lane}.wasm`),{});modules[lane]=instance.exports;assert.equal(BigInt.asUintN(64,instance.exports.bench_validate_hash()),BigInt(native.validation_hash));}
let seed=681;const shuffle=a=>{for(let i=a.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const results=[];for(const reference of native.results){const samples={},setup={},iterations=512;
 for(const [lane,module]of Object.entries(modules)){const start=performance.now();module.bench_prepare(reference.size);setup[lane]=(performance.now()-start)*1e6;samples[lane]=[];assert.equal(BigInt.asUintN(64,module.bench_run(reference.key,1)),BigInt(reference.expected));for(let i=0;i<8;i++)module.bench_run(reference.key,1);}
 for(let round=0;round<9;round++)for(const lane of shuffle(Object.keys(modules))){const start=performance.now();const actual=modules[lane].bench_run(reference.key,iterations);samples[lane].push((performance.now()-start)*1e6/iterations);assert.equal(BigInt.asUintN(64,actual),BigInt.asUintN(64,BigInt(reference.expected)*BigInt(iterations)));}
 results.push({size:reference.size,key:reference.key,setup_ns:setup,samples_ns:samples});
}
console.log(JSON.stringify({node:process.version,results,boundary:'Same generated JSON state-query implementation as native; resident Wasm state and setup outside query timer; consumed full replies.'}));
