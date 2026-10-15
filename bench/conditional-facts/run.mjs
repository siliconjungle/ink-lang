// Designed mechanism workloads, not an application or broad-domain benchmark.
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [beforePath,afterPath,seedText='18421']=process.argv.slice(2);
if(!beforePath||!afterPath)throw Error('usage: node run.mjs baseline.mjs selected.mjs [seed]');
const before=(await import(pathToFileURL(beforePath))).functions;
const after=(await import(pathToFileURL(afterPath))).functions;
let state=Number(seedText)>>>0;
const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const rows=[];let sink=0;
for(const count of [0,16,4096,65536])for(const distribution of ['small','boundary','random']){
 const boundaries=[0,1,4,255,256,257,2147483652,4294967294,4294967295];
 const xs=Array.from({length:count},(_,i)=>distribution==='small'?random()%256:distribution==='boundary'?boundaries[i%boundaries.length]:random());
 const ys=Array.from({length:count},()=>random()%512);
 const wide=xs.map((x,i)=>BigInt(x)|(BigInt(xs[(i+1)%count])<<32n));
 const repeats=count<32?1000:count<8192?4:1;
 for(const name of ['bounded','excluded','wrap64','reversed','collision','mapped']){
  const invoke=(f,i)=>name==='bounded'?f(xs[i],ys[i]):name==='wrap64'||name==='reversed'?f(wide[i]):f(xs[i]);
  const oracle=i=>name==='bounded'?xs[i]:name==='collision'?(xs[i]===4||Math.imul(xs[i],2)!==8):true;
  const check=f=>{
   if(name==='mapped')assert.deepEqual(Array.from(f(xs)),xs.map(x=>(x+1)>>>0));
   else for(let i=0;i<count;i++)assert.equal(invoke(f,i),oracle(i));
  };
  const run=f=>{
   let h=0;
   for(let r=0;r<repeats;r++){
    if(name==='mapped'){const values=f(xs);for(const x of values)h=(Math.imul(h,31)^x)>>>0;}
    else for(let i=0;i<count;i++){const value=invoke(f,i);h=(Math.imul(h,31)^Number(value))>>>0;}
   }
   return h;
  };
  const lanes=[before[name],after[name]],samples=[[],[]];
  for(const lane of lanes){check(lane);run(lane);run(lane);}
  for(let round=0;round<11;round++){
   const order=random()&1?[0,1]:[1,0];const digests=[];
   for(const index of order){
    const lane=lanes[index];check(lane);
    const start=process.hrtime.bigint(),digest=run(lane);
    samples[index].push(Number(process.hrtime.bigint()-start)/repeats);
    sink^=digest;digests[index]=digest;check(lane);
   }
   assert.equal(digests[0],digests[1]);
  }
  rows.push({function:name,count,distribution,repeats,samplesBeforeNs:samples[0],samplesAfterNs:samples[1],beforeNs:median(samples[0]),afterNs:median(samples[1])});
 }
}
const hashes={};for(const path of [beforePath,afterPath])hashes[path.split('/').pop()]=createHash('sha256').update(await fs.readFile(path)).digest('hex');
console.log(JSON.stringify({schema:1,seed:Number(seedText),node:process.version,cpu:os.cpus()[0].model,platform:process.platform,arch:process.arch,date:new Date().toISOString(),hashes,sink,rows,scope:'Trusted pure JS calls. Complete outputs checked before and after each sample; every timed output consumed. Scalar rows are batches of count calls; mapped rows are one list call. Nanoseconds per batch, paired random lane order. Zero-length scalar rows contain no Ink calls. Designed mechanism inputs, not application generalisation or a profitability decision.'}));
