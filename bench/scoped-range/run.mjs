// Interleaved whole calls. Setup is outside timing, output consumption inside.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const file=process.argv[2],module=await import(pathToFileURL(file));
const now=()=>process.hrtime.bigint();
const hand=(items,start,count,windows)=>{let total=0;const begin=Math.min(start,items.length),end=begin+Math.min(count,items.length-begin);for(let w=0;w<windows;w++)for(let i=begin;i<end;i++)total=(total+items[i])>>>0;return total;};
let consumed=0;const rows=[];
const inputCodec=module.valueCodecs.borrowed.arguments,resultCodec=module.valueCodecs.borrowed.result;
for(const n of [0,16,256,4096,16384])for(const shape of ['small','half','empty']){
 const items=Array.from({length:n},(_,i)=>i%17===0?0xffffffff:i);
 const start=shape==='empty'?0xffffffff:Math.floor(n/4),count=shape==='small'?8:shape==='empty'?0xffffffff:Math.floor(n/2),windows=16;
 const args=[items,start,count,windows],object={items,start,count,windows};
 const encodeBegin=now(),bytes=inputCodec.encode(object),inputEncodingNs=Number(now()-encodeBegin);
 const expected=hand(...args),original=JSON.stringify(items),repetitions=8;
 for(const boundary of ['typed-values','checked-value-wire']){
  const methods=boundary==='typed-values'?[()=>module.call('copied',args),()=>module.call('borrowed',args),()=>hand(...args)]:
   [()=>module.callBinary('copied',bytes),()=>module.callBinary('borrowed',bytes),()=>resultCodec.encode(hand(...Object.values(inputCodec.decode(bytes))))];
  const want=boundary==='typed-values'?expected:resultCodec.encode(expected);
  for(const method of methods){assert.deepEqual(method(),want);for(let i=0;i<12;i++)method();}
  const samples=methods.map(()=>[]);
  for(let round=0;round<11;round++)for(let offset=0;offset<methods.length;offset++){
   const lane=(round+offset)%methods.length,begin=now();
   for(let i=0;i<repetitions;i++){const value=methods[lane]();if(boundary==='typed-values')consumed=(consumed+value)>>>0;else for(const byte of value)consumed=(consumed+byte)>>>0;}
   samples[lane].push(Number(now()-begin)/repetitions);
  }
  assert.equal(JSON.stringify(items),original);
  const medians=samples.map(xs=>[...xs].sort((a,b)=>a-b)[5]);
  rows.push({n,shape,start,count,windows,boundary,repetitions,inputEncodingNs,samplesNs:samples,medianNs:medians,borrowedOverCopied:medians[1]/medians[0],borrowedOverHandwritten:medians[1]/medians[2]});
 }
}
console.log(JSON.stringify({schema:1,scope:'One repeated clipped u32 window workload; every result checked; no planner profitability conclusion',lanes:['copied-source','borrowed-source','handwritten'],node:process.version,platform:process.platform,architecture:process.arch,moduleSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),setup:'Input construction and argument encoding outside call timing; encoding recorded separately; result consumption inside',consumed,rows},null,2));
