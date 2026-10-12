import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const directory=process.argv[2],real=JSON.parse(fs.readFileSync(process.argv[3]));
const modules={};for(const name of ['literal','prior-one','prior-chain','composed']) modules[name]=await import(pathToFileURL(`${directory}/${name}.mjs`));
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
let seed=931,sink=0;function shuffle(xs){for(let i=xs.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[xs[i],xs[j]]=[xs[j],xs[i]];}return xs;}
const results=[];
const cohorts=[['generated',[0,128,4096,65536].map(n=>Array.from({length:n},(_,i)=>Math.imul(i,7919)>>>0))]];
if(real.length)cohorts.push(['actual-Acorn-Lodash-AST',[real.slice(0,128),real.slice(0,4096),real].map(rows=>rows.map(r=>r.key>>>0))]);
for(const [cohort,inputs]of cohorts)for(const xs of inputs)for(const fraction of [0,0.5,1]) {
 const n=Math.floor(xs.length*fraction),cut=xs.length?xs[Math.floor((xs.length-1)*fraction)]:0,expected=BigInt(xs.filter(x=>x>=cut).length),before=JSON.stringify(xs),samples={},iterations={};
 for(const [name,module]of Object.entries(modules)) {
  const call=()=>{const value=module.functions.f(xs,n,cut);assert.equal(typeof value,'bigint');sink^=Number(value&0xffffffffn);return value;};
  assert.equal(call(),expected);for(let i=0;i<64;i++)call();let count=1;
  for(;;){const start=performance.now();for(let i=0;i<count;i++)call();if(performance.now()-start>=8||count>=32768)break;count*=2;}
  iterations[name]=count;samples[name]=[];
 }
 for(let round=0;round<11;round++)for(const name of shuffle(Object.keys(modules))) {
  const call=modules[name].functions.f,count=iterations[name];const start=performance.now();
  for(let i=0;i<count;i++)sink^=Number(call(xs,n,cut)&0xffffffffn);
  samples[name].push((performance.now()-start)*1e6/count);
 }
 assert.equal(JSON.stringify(xs),before);for(const module of Object.values(modules))assert.equal(module.functions.f(xs,n,cut),expected);
 results.push({cohort,size:xs.length,fraction,expected:expected.toString(),samples_ns:samples,median_ns:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,median(v)]))});
}
console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,rounds:11,boundary:'Complete trusted scalar calls, input conversion and scalar consumption; input construction outside timing.',results,sink}));
