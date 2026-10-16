// Complete serving calls with the same restored state and live weight updates.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';

const [directory,order='baseline,selected',count='25000']=process.argv.slice(2);
const root=resolve(directory),reads=Number(count),names=order.split(',');
assert(Number.isSafeInteger(reads)&&reads>=1000&&reads<=1000000);
assert.deepEqual([...names].sort(),['baseline','selected']);
const digest=b=>createHash('sha256').update(b).digest('hex');
const seed=new Uint8Array(await readFile(join(root,'initial.snapshot')));
const modules={},images={},results={};
const now=()=>process.hrtime.bigint();
for(const name of names){
 const file=join(root,name==='baseline'?'baseline.mjs':'program.mjs'),bytes=await readFile(file);
 const start=now();modules[name]=await import(pathToFileURL(file));const imported=now();
 const state=modules[name].createState();await state.restore(seed);const restored=now();
 assert.deepEqual(new Uint8Array(await state.checkpoint()),seed);
 const binding=now(),serve=state.bind('serve',{resultOnly:true});assert.equal(typeof serve(-0.5),'number');const called=now();
 images[name]={module:digest(bytes),bytes:bytes.length};
 results[name]={importUs:Number(imported-start)/1000,createRestoreUs:Number(restored-imported)/1000,
  firstBindCallUs:Number(called-binding)/1000,phases:{}};
 state.dispose?.();
}
const samples=5,warmup=2500;
for(const stride of [0,1,16,256]){
 const checks={};
 for(const name of names){
  const state=modules[name].createState();await state.restore(seed);
  const serve=state.bind('serve',{resultOnly:true}),retune=state.bind('retune',{resultOnly:true});
  const run=count=>{
   let sum=0,updates=0;
   for(let i=0;i<count;i++){
    if(stride&&i%stride===0){
     const flip=(updates++&1)!==0;
     retune({scale:flip?0.5:0.25,bias:flip?0.25:-0.125},false);
     state.acknowledgeThrough(state.version,0n);
    }
    sum+=serve(((i%31)-15)/8);
   }
   return sum;
  };
  run(warmup);const times=[],sums=[];
  for(let i=0;i<samples;i++){
   const started=now();sums.push(run(reads));times.push(Number(now()-started)/reads);
  }
  checks[name]={sums,snapshot:digest(await state.checkpoint())};
  results[name].phases[stride]={nsPerRequest:times,medianNs:[...times].sort((a,b)=>a-b)[2],...checks[name]};
  state.dispose?.();
 }
 assert.deepEqual(checks.baseline,checks.selected,`complete output/checkpoint mismatch at stride ${stride}`);
}
console.log(JSON.stringify({schema:1,processId:process.pid,node:process.version,platform:process.platform,
 arch:process.arch,cpu:os.cpus()[0].model,order:names,readsPerSample:reads,samples,warmupReads:warmup,
 updateStrides:[0,1,16,256],typedBoundCalls:true,resultOnly:true,eventAcknowledgementIncluded:true,
 completeChecksumsAndCheckpointsAgree:true,seed:digest(seed),images,results,
 scope:'Paired complete warm query calls; update and acknowledgement costs included. Source/proof construction, import, create/restore and first binding are outside warm samples.'}));
