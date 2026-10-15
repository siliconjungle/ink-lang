import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [beforePath,afterPath,seedText='21431']=process.argv.slice(2);
if(!beforePath||!afterPath)throw Error('usage: node run.mjs baseline.mjs selected.mjs [seed]');
const before=(await import(pathToFileURL(beforePath))).functions,after=(await import(pathToFileURL(afterPath))).functions;
let state=Number(seedText)>>>0,sink=0;
const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const digest=xs=>{let h=0;for(const x of xs)h=(Math.imul(h,31)^x)>>>0;return h;};
const rows=[];
for(const count of [0,1,32,512])for(const width of [0,16,256]){
 const xs=Array.from({length:count},(_,i)=>i%4===0?4294967295:random()%(width+1));
 const ys=Array.from({length:width},()=>random());
 const repeats=Math.min(1024,Math.max(1,Math.ceil(8192/Math.max(1,count*width))));
 for(const name of ['prepared','prepared_dependent']){
  // Direct lookup is the oracle; it does not construct an intermediate table.
  const expected=xs.map(i=>i>=ys.length?999:name==='prepared'?
   Math.imul((Math.imul(ys[i],3)+7)>>>0,5)>>>0:
   (Math.imul((ys[i]+i)>>>0,3)+7)>>>0);
  const lanes=[before[name],after[name]],samples=[[],[]];
  const run=f=>{let h=0;for(let r=0;r<repeats;r++)h^=digest(f(xs,ys));return h;};
  for(const lane of lanes){assert.deepEqual(lane(xs,ys),expected);run(lane);run(lane);}
  for(let round=0;round<11;round++){
   const order=random()&1?[0,1]:[1,0],digests=[];
   for(const index of order){const lane=lanes[index];assert.deepEqual(lane(xs,ys),expected);
    const t=process.hrtime.bigint(),d=run(lane);samples[index].push(Number(process.hrtime.bigint()-t)/repeats);sink^=d;digests[index]=d;
    assert.deepEqual(lane(xs,ys),expected);
   }
   assert.equal(digests[0],digests[1]);
  }
  rows.push({function:name,count,width,repeats,samplesBeforeNs:samples[0],samplesAfterNs:samples[1],beforeNs:median(samples[0]),afterNs:median(samples[1])});
 }
}
const hashes={};for(const p of [beforePath,afterPath])hashes[p.split('/').pop()]=createHash('sha256').update(await fs.readFile(p)).digest('hex');
console.log(JSON.stringify({schema:1,seed:Number(seedText),node:process.version,cpu:os.cpus()[0].model,platform:process.platform,arch:process.arch,date:new Date().toISOString(),hashes,sink,rows,scope:'One complete trusted JS call per repetition, including table construction and full output consumption. Independent direct oracle before and after every sample. No retained cache across calls. Prepared-dependent is unchanged. Designed preparation mechanism, not browser layout or application parity.'}));
