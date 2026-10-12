import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const out=process.argv[2],modules={};for(const lane of ['literal','selected'])modules[lane]=await import(pathToFileURL(`${out}/${lane}.mjs`));
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
let sink=0,seed=181;const results=[];
const consume=value=>{if(Array.isArray(value))sink^=value.length;else if(typeof value==='bigint')sink^=Number(value&0xffffffffn);else if(typeof value==='string')sink^=value.length;else sink^=value;};
for(const n of [0,128,4096,65536]){
 const xs=Array.from({length:n},(_,i)=>({key:i,label:`row-${i}`,flag:!!(i%2)})),ys=xs.slice(0,Math.floor(n/2));
 const before=JSON.stringify([xs,ys]);
 for(const [fn,args,expected]of [['visible',[xs],xs],['discarded',[xs],[]],['keep_left',[xs,'seed-λ'],'seed-λ'],['keep_right',[xs,0xffffffffffffffffn],0xffffffffffffffffn],['combined_count',[xs,ys],BigInt(xs.length+ys.length)],['combined_length',[xs,ys],xs.length+ys.length]]){
  const samples={},counts={};
  for(const [lane,module]of Object.entries(modules)){
   const call=()=>consume(module.functions[fn](...args));assert.deepEqual(module.functions[fn](...args),expected);
   for(let i=0;i<32;i++)call();let count=1;
   for(;;){const start=performance.now();for(let i=0;i<count;i++)call();if(performance.now()-start>=8||count>=65536)break;count*=2;}
   counts[lane]=count;samples[lane]=[];
  }
  for(let round=0;round<11;round++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const lanes=seed%2?['literal','selected']:['selected','literal'];
   for(const lane of lanes){const call=modules[lane].functions[fn],count=counts[lane],start=performance.now();for(let i=0;i<count;i++)consume(call(...args));samples[lane].push((performance.now()-start)*1e6/count);}
  }
  assert.equal(JSON.stringify([xs,ys]),before);for(const module of Object.values(modules))assert.deepEqual(module.functions[fn](...args),expected);
  results.push({fn,size:n,samples_ns:samples,median_ns:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,median(v)]))});
 }
}
const summary={};for(const fn of Object.keys(modules.literal.functions)){const cells=results.filter(r=>r.fn===fn&&r.size>0);summary[fn]=Math.exp(cells.reduce((v,r)=>v+Math.log(r.median_ns.literal/r.median_ns.selected),0)/cells.length);}
console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,rounds:11,boundary:'Complete trusted JS calls with ordinary inputs and consumed results; construction outside timing. Equality and input immutability checked.',results,summary,sink}));
