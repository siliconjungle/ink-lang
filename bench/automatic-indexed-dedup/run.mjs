import fs from 'node:fs';import assert from 'node:assert/strict';import {performance}from'node:perf_hooks';import{pathToFileURL}from'node:url';
const dir=process.argv[2],a=await import(pathToFileURL(dir+'/baseline.mjs')),b=await import(pathToFileURL(dir+'/selected.mjs'));
const impl={baseline:xs=>a.call('run',[xs]),indexed:xs=>b.call('run',[xs]),nativeSet:xs=>[...new Set(xs)]};
let sink=0,seed=0x9e3779b9;const shuffle=v=>{for(let i=v.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[v[i],v[j]]=[v[j],v[i]];}return v;};
function consume(v){let h=0;for(const x of v)h=Math.imul(h,31)^x;return h;}
const rows=[];
for(const n of [0,1,16,128,1024,8192])for(const shape of ['unique','repeated64','reverseUnique']){
 const xs=Array.from({length:n},(_,i)=>Math.imul(shape==='repeated64'?i%64:shape==='reverseUnique'?n-1-i:i,2654435761)>>>0),original=xs.slice(),expected=[...new Set(xs)];
 const samples={},counts={};
 for(const name of shuffle(Object.keys(impl))){const f=impl[name];assert.deepEqual(f(xs),expected);assert.deepEqual(xs,original);for(let i=0;i<8;i++)sink^=consume(f(xs));let count=1;
 while(true){const start=performance.now();for(let i=0;i<count;i++)sink^=consume(f(xs));if(performance.now()-start>=3||count>=1024)break;count*=2;}counts[name]=count;samples[name]=[];}
 for(let round=0;round<9;round++)for(const name of shuffle(Object.keys(impl))){const count=counts[name],start=performance.now();for(let i=0;i<count;i++)sink^=consume(impl[name](xs));samples[name].push((performance.now()-start)*1e6/count);}
 for(const f of Object.values(impl)){assert.deepEqual(f(xs),expected);assert.deepEqual(xs,original);}
 rows.push({n,shape,unique:expected.length,samples_ns:samples,calls_per_sample:counts});
}
console.log(JSON.stringify({node:process.version,rows,peak_rss_bytes:process.resourceUsage().maxRSS*1024,sink}));
