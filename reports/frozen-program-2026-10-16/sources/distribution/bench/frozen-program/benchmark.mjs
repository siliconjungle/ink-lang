// Complete bound state-query calls; neither variant receives a cached result.
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';

const [baselinePath,selectedPath,order='baseline,selected']=process.argv.slice(2);
const paths={baseline:resolve(baselinePath),selected:resolve(selectedPath)};
const modules={},results={},images={};
const digest=b=>createHash('sha256').update(b).digest('hex');
const now=()=>process.hrtime.bigint();
for(const name of order.split(',')){
 const started=now(),folder=paths[name];
 modules[name]=await import(pathToFileURL(join(folder,'program.mjs')));
 const imported=now(),state=await modules[name].createState(),created=now();
 const serve=state.bind('serve',{resultOnly:true}),answer=serve(-0.5),called=now();
 assert.equal(typeof answer,'number');
 const manifest=JSON.parse(await readFile(join(folder,'artifact.json')));
 results[name]={importUs:Number(imported-started)/1000,createUs:Number(created-imported)/1000,
  firstBoundCallUs:Number(called-created)/1000,sourceBytes:(await stat(join(folder,'program.mjs.source.mjs'))).size,
  artifactBytes:Object.values(manifest.files).reduce((n,f)=>n+f.bytes,0),phases:{}};
 images[name]={sourceCore:manifest.source_core_sha256,compiledCore:manifest.compiled_core_sha256,
  selectedCore:manifest.selected_core_sha256??manifest.compiled_core_sha256,sourceModule:digest(await readFile(join(folder,'program.mjs.source.mjs')))};
 state.dispose?.();
}
const sampleCount=5,reads=25000,warmup=2500;
for(const stride of [0,1,16,256]){
 const phase=String(stride),checks={};
 for(const name of order.split(',')){
  const state=await modules[name].createState(),serve=state.bind('serve',{resultOnly:true}),retune=state.bind('retune',{resultOnly:true});
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
  run(warmup);
  const times=[],sums=[];
  for(let i=0;i<sampleCount;i++){
   const start=now();sums.push(run(reads));times.push(Number(now()-start)/reads);
  }
  checks[name]={sums,snapshot:digest(await state.checkpoint())};
  results[name].phases[phase]={nsPerRequest:times,medianNs:[...times].sort((a,b)=>a-b)[Math.floor(times.length/2)],
   checksum:sums,checkpoint:checks[name].snapshot};
  state.dispose?.();
 }
 assert.deepEqual(checks.baseline,checks.selected,`full result/state mismatch at update stride ${stride}`);
}
console.log(JSON.stringify({schema:1,processId:process.pid,node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,
 order:order.split(','),readsPerSample:reads,samples:sampleCount,warmupReads:warmup,
 updateStrides:[0,1,16,256],typedBoundCalls:true,resultOnly:true,eventAcknowledgementIncluded:true,
 completeChecksumsAndCheckpointsAgree:true,images,results}));
