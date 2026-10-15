import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [previousPath,modulePath,seedText='72131']=process.argv.slice(2);
if(!modulePath)throw Error('usage: node run.mjs PREVIOUS_MODULE CURRENT_MODULE [SEED]');
const previous=await import(pathToFileURL(previousPath));
const current=await import(pathToFileURL(modulePath));
const functions={previous:previous.functions.prepared,batched:current.functions.prepared,repeated:current.functions.repeated,handwritten:current.functions.handwritten};
const fr=Math.fround,median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
let state=Number(seedText)>>>0,sink=0;
const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
const weights={a:0.25,b:-0.5,c:0.125,d:0.25},rows=[];
for(const count of [0,16,4096,32768]){
 const xs=Array.from({length:count},()=>((random()%49)-24)/64);
 const expected={a:count,b:0,c:0,d:0};
 for(const x of xs){expected.b=fr(expected.b+x);expected.c=fr(expected.c+fr(x*x));expected.d=fr(expected.d+fr(fr(x*x)*x));}
 const names=['previous','batched','repeated','handwritten'];const samples=names.map(()=>[]);
 const repeats=Math.min(128,Math.max(1,Math.ceil(2048/Math.max(1,count))));
 const run=f=>{let h=0;for(let i=0;i<repeats;i++){const v=f(weights,xs);h+=v.a+v.b+v.c+v.d;}return h;};
 for(const n of names){assert.deepEqual(functions[n](weights,xs),expected);run(functions[n]);run(functions[n]);}
 for(let round=0;round<11;round++){
  const order=[0,1,2,3];for(let i=3;i>0;i--){const j=random()%(i+1);[order[i],order[j]]=[order[j],order[i]];}
  for(const lane of order){const f=functions[names[lane]];assert.deepEqual(f(weights,xs),expected);const t=process.hrtime.bigint();sink+=run(f);samples[lane].push(Number(process.hrtime.bigint()-t)/repeats);assert.deepEqual(f(weights,xs),expected);}
 }
 rows.push({count,repeats,lanes:Object.fromEntries(names.map((n,i)=>[n,{samplesNs:samples[i],medianNs:median(samples[i])}]))});
}
console.log(JSON.stringify({schema:1,seed:Number(seedText),date:new Date().toISOString(),node:process.version,cpu:os.cpus()[0].model,platform:process.platform,arch:process.arch,moduleSha256:createHash('sha256').update(await fs.readFile(modulePath)).digest('hex'),previousSha256:createHash('sha256').update(await fs.readFile(previousPath)).digest('hex'),rows,sink,scope:'Warm complete trusted JS calls, including per-call context preparation and full output consumption. Previous scalar-pass gradient and current batched gradient, with repeated scalar JVP and authored derivative controls. Independent dyadic polynomial oracle before and after every sample. No compilation, first-call, memory, GPU-training or upstream-comparison claim.'}));
