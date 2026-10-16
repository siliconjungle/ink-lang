// Complete bound queries over the same learned checkpoint and runtime history.
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';

const [baselinePath,selectedPath,order='baseline,selected']=process.argv.slice(2);
if(!baselinePath||!selectedPath||!['baseline,selected','selected,baseline'].includes(order))
 throw Error('Usage: sample.mjs BASELINE_ARTIFACT SELECTED_ARTIFACT [baseline,selected|selected,baseline]');
const paths={baseline:resolve(baselinePath),selected:resolve(selectedPath)},modules={},results={},images={};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex'),now=()=>process.hrtime.bigint();
for(const name of order.split(',')){
 const begin=now(),folder=paths[name];modules[name]=await import(pathToFileURL(join(folder,'program.mjs')));
 const imported=now(),state=await modules[name].createState(),created=now();
 const serve=state.bind('serve',{resultOnly:true});assert.equal(typeof serve(0.375),'number');const called=now();
 const manifest=JSON.parse(await readFile(join(folder,'artifact.json')));
 results[name]={importUs:Number(imported-begin)/1000,createUs:Number(created-imported)/1000,
  firstBoundCallUs:Number(called-created)/1000,sourceBytes:(await stat(join(folder,'program.mjs.source.mjs'))).size,
  artifactBytes:Object.values(manifest.files).reduce((n,x)=>n+x.bytes,0),phases:{}};
 images[name]={sourceCore:manifest.source_core_sha256,compiledCore:manifest.compiled_core_sha256,
  selectedCore:manifest.selected_core_sha256??manifest.compiled_core_sha256,
  deployment:manifest.snapshot_sha256??digest(await readFile(join(folder,'deployment.snapshot'))),
  sourceModule:digest(await readFile(join(folder,'program.mjs.source.mjs')))};
 state.dispose?.();
}
const samples=5,phases=[
 {name:'serve',reads:25000,warmup:2500,query:'serve',retune:0,retarget:0},
 {name:'serve-retune-16',reads:25000,warmup:2500,query:'serve',retune:16,retarget:0},
 {name:'loss',reads:5000,warmup:500,query:'loss',retune:0,retarget:0},
 {name:'loss-retarget-64',reads:5000,warmup:500,query:'loss',retune:0,retarget:64},
];
for(const phase of phases){
 const checks={};
 for(const name of order.split(',')){
  const state=await modules[name].createState(),query=state.bind(phase.query,{resultOnly:true});
  const retune=state.bind('retune',{resultOnly:true}),retarget=state.bind('retarget',{resultOnly:true});
  let updates=0,goalVersion=1;
  const run=count=>{
   let sum=0;
   for(let i=0;i<count;i++){
    if(phase.retune&&i%phase.retune===0){
     const flip=(updates++&1)!==0;
     assert.deepEqual(retune({scale:flip?0.75:0.5,bias:flip?0.25:0.125},false),{Ok:null});
     state.acknowledgeThrough(state.version,0n);
    }
    if(phase.retarget&&i%phase.retarget===0){
     const target=(updates++&1)?0.75:0.5;
     const value=retarget([{input:-1,target:0.5},{input:1,target}],0.000001,goalVersion);
     assert.equal(value.Ok,++goalVersion);state.acknowledgeThrough(state.version,0n);
    }
    const value=phase.query==='serve'?query(((i%31)-15)/8):query();
    if(phase.query==='loss'){assert.equal(typeof value.Ok,'number');sum+=value.Ok;}else sum+=value;
   }
   return sum;
  };
  run(phase.warmup);const times=[],sums=[];
  for(let sample=0;sample<samples;sample++){
   const start=now();sums.push(run(phase.reads));times.push(Number(now()-start)/phase.reads);
  }
  checks[name]={sums,snapshot:digest(await state.checkpoint())};
  results[name].phases[phase.name]={nsPerRequest:times,medianNs:[...times].sort((a,b)=>a-b)[2],
   checksums:sums,checkpoint:checks[name].snapshot};state.dispose?.();
 }
 assert.deepEqual(checks.baseline,checks.selected,phase.name+': complete outputs/checkpoints');
}
console.log(JSON.stringify({schema:1,node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,
 processId:process.pid,order:order.split(','),samples,phases,typedBoundCalls:true,resultOnly:true,
 eventAcknowledgementIncluded:true,completeChecksumsAndCheckpointsAgree:true,images,results,
 scope:'Paired complete bound query calls on one finite learned program. Warm samples include the stated weight/goal changes; startup is separate. Instruction count is not a latency model; no automatic profitable selection or upstream parity follows.'}));
