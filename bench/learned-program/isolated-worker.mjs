// One artifact and one workload per fresh VM: no cross-artifact call-site feedback.
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';
const [directory,phaseName,scaleText='10']=process.argv.slice(2),scale=Number(scaleText);
const settings={serve:{reads:25000,query:'serve',retune:0,retarget:0},
 'serve-retune-16':{reads:25000,query:'serve',retune:16,retarget:0},
 loss:{reads:5000,query:'loss',retune:0,retarget:0},
 'loss-retarget-64':{reads:5000,query:'loss',retune:0,retarget:64}};
if(!directory||!Object.hasOwn(settings,phaseName)||!Number.isInteger(scale)||scale<1||scale>32)
 throw Error('Usage: isolated-worker.mjs ARTIFACT PHASE [SCALE_1_TO_32]');
const folder=resolve(directory),phase={name:phaseName,...settings[phaseName]},samples=5;
phase.reads*=scale;phase.warmup=phase.reads;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex'),now=()=>process.hrtime.bigint();
const begin=now(),module=await import(pathToFileURL(join(folder,'program.mjs'))),imported=now();
const state=await module.createState(),created=now(),query=state.bind(phase.query,{resultOnly:true});
const first=phase.query==='serve'?query(0.375):query(),called=now();
assert.equal(typeof(phase.query==='serve'?first:first.Ok),'number');
const retune=state.bind('retune',{resultOnly:true}),retarget=state.bind('retarget',{resultOnly:true});
let updates=0,goalVersion=1;
function run(count){
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
}
const warming=now();run(phase.warmup);const warmed=now(),times=[],sums=[];
for(let i=0;i<samples;i++){const start=now();sums.push(run(phase.reads));times.push(Number(now()-start)/phase.reads);}
const checkpoint=digest(await state.checkpoint()),manifest=JSON.parse(await readFile(join(folder,'artifact.json')));
state.dispose?.();
console.log(JSON.stringify({schema:1,node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,
 processId:process.pid,phase,samples,scale,typedBoundCalls:true,resultOnly:true,eventAcknowledgementIncluded:true,
 importUs:Number(imported-begin)/1000,createUs:Number(created-imported)/1000,firstBoundCallUs:Number(called-created)/1000,
 warmupUs:Number(warmed-warming)/1000,sourceBytes:(await stat(join(folder,'program.mjs.source.mjs'))).size,
 artifactBytes:Object.values(manifest.files).reduce((n,x)=>n+x.bytes,0),
 images:{sourceCore:manifest.source_core_sha256,compiledCore:manifest.compiled_core_sha256,
 selectedCore:manifest.selected_core_sha256??manifest.compiled_core_sha256,
 deployment:manifest.snapshot_sha256??digest(await readFile(join(folder,'deployment.snapshot'))),
 sourceModule:digest(await readFile(join(folder,'program.mjs.source.mjs')))},
 result:{nsPerRequest:times,medianNs:[...times].sort((a,b)=>a-b)[2],checksums:sums,checkpoint},
 scope:'One generated module and one workload per fresh Node process. Full warmup block and five measured blocks, complete bound calls with stated updates and event acknowledgement. Startup and warmup are separate; no cross-artifact VM feedback.'}));
