import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
const root=process.argv[2];
const labels=['direct','refresh','access'];
const modules=await Promise.all(labels.map(label=>import(pathToFileURL(join(root,label+'.mjs')))));
const counted=await Promise.all(labels.map(label=>import(pathToFileURL(join(root,label+'-counted.mjs')))));
async function prepared(module){
  const state=module.createState();
  for(let key=0;key<32;key++)await state.invoke_json('put',[key,key]);
  return state;
}
async function writes(state){
  for(let i=0;i<128;i++)await state.invoke_json('put',[1+i%31,i]);
}
async function workload(state){
  await writes(state);
  for(let i=0;i<512;i++)await state.invoke_json('watched',[]);
}
const mechanism={};
for(let i=0;i<labels.length;i++){
  const state=await prepared(counted[i]);counted[i].resetLookups();await writes(state);
  mechanism[labels[i]]={unrelated_writes:128,watched_lookups:counted[i].lookups()};
}
// Alternate order after warmup. Construction and checkpointing are outside the
// hot samples and are separately measured. Every sample executes identical calls.
const timing_ns=Object.fromEntries(labels.map(label=>[label,[]]));
const construction_ns=Object.fromEntries(labels.map(label=>[label,[]]));
const checkpoint_ns=Object.fromEntries(labels.map(label=>[label,[]]));
for(const module of modules)await workload(await prepared(module));
for(let sample=0;sample<7;sample++){
  for(const i of sample%2?[2,1,0]:[0,1,2]){
    let start=performance.now();const state=await prepared(modules[i]);
    construction_ns[labels[i]].push(Math.round((performance.now()-start)*1e6));
    start=performance.now();await workload(state);
    timing_ns[labels[i]].push(Math.round((performance.now()-start)*1e6));
    start=performance.now();await state.checkpoint();
    checkpoint_ns[labels[i]].push(Math.round((performance.now()-start)*1e6));
  }
}
console.log(JSON.stringify({scope:'Local Node JS literal output; 32 rows, 128 unrelated writes and 512 point reads; seven warm samples. No universal speed or profitability claim.',
  target:{node:process.version,platform:process.platform,architecture:process.arch},
  mechanism,timing_ns,construction_ns,checkpoint_ns}));
