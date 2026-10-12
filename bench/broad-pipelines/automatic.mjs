// Independent data evaluation of the ordinary planner's offline-selected plan.
import fs from'node:fs';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';import{createRequire}from'node:module';import{performance}from'node:perf_hooks';
const[root,autoFile,lodashFile]=process.argv.slice(2),_=createRequire(import.meta.url)(lodashFile);
const automatic=await import(pathToFileURL(autoFile)),baseline=await import(pathToFileURL(root+'/baseline.mjs'));
let seed=104729,sink=0;const shuffle=a=>{for(let i=a.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const rows=[];for(const size of[128,4096,65536])for(const cut of[16,256,496]){
 const xs=Array.from({length:size},(_,i)=>({score:(Math.imul(i+971,1664525)+1013904223)>>>23,visible:i%7!==0,name:i%5?'other':'snow',value:(i%127-63)/8}));const args=[xs,cut,19],original=structuredClone(args);
 let expected=19;for(let i=xs.length-1;i>=0;i--)if(xs[i].score>=cut)expected+=xs[i].score;
 const lanes=[{name:'baseline',run:()=>baseline.call('filtered_mapped',args)},{name:'automatic',run:()=>automatic.call('filtered_mapped',args)},{name:'lodash',run:()=>_(xs).filter(x=>x.score>=cut).map(x=>x.score).reduceRight((acc,x)=>acc+x,19)}];const samples={};const counts={};
 for(const l of lanes){assert.equal(l.run(),expected);samples[l.name]=[];for(let i=0;i<16;i++)sink^=l.run();let n=1,ms;do{const start=performance.now();for(let i=0;i<n;i++)sink^=l.run();ms=performance.now()-start;if(ms>=8||n>=65536)break;n*=2;}while(true);counts[l.name]=n;}
 for(let round=0;round<11;round++)for(const l of shuffle([...lanes])){const n=counts[l.name],start=performance.now();for(let i=0;i<n;i++)sink^=l.run();samples[l.name].push((performance.now()-start)*1e6/n);}
 for(const l of lanes)assert.equal(l.run(),expected);assert.deepStrictEqual(args,original);rows.push({size,cut,samples_ns:samples});
}
console.log(JSON.stringify({schema:1,scope:'Same source program, different evaluation sizes/distributions from offline selection; independent literal-loop and pinned Lodash values; not held-out source programs',node:process.version,rows,sink}));
