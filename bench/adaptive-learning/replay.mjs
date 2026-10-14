// Frozen histories, all candidate windows replayed from the SAME source snapshot.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
const [rootArg,repoArg,out]=process.argv.slice(2),root=path.resolve(rootArg),repo=path.resolve(repoArg);
const bundle=JSON.parse(fs.readFileSync(path.join(root,'bundle.json'))),fitted=JSON.parse(fs.readFileSync(process.env.PROFILE));
assert.deepEqual(bundle.binding,fitted.binding);
const {createAdaptiveState}=await import(pathToFileURL(path.join(repo,'runtime/hosts/adaptive-state.mjs')));
const mods=Object.fromEntries(await Promise.all(bundle.artifacts.map(async a=>[a.id,await import(pathToFileURL(path.join(root,a.file)))])));
const ids=Object.keys(mods),rotation=Number(process.env.BENCH_ROTATION??0)%ids.length,order=[...ids.slice(rotation),...ids.slice(0,rotation)];
const restore=async(id,b)=>{const s=mods[id].createState();await s.restore(b);return s;};
const initialState=mods.direct.createState();for(let i=0;i<128;i++)initialState.bind('put')(BigInt(i),BigInt(i));const initial=await initialState.checkpoint();
const variants=Object.fromEntries(ids.map(id=>[id,{create:()=>restore(id,initial),restore:b=>restore(id,b)}]));
const block=512,features={shape:'rows128',state_elements:128};
const policy={...fitted.policy,horizon_calls:32768,min_residence_calls:1024,stable_windows:3,max_pause_ns:1e9,memory_limit_bytes:1073741824,max_switches:32};
// Declared evaluation histories; independent from acquisition's homogeneous calls.
const traces={steady_read:Array(12).fill('read'),steady_write:Array(12).fill('write'),write_read:[...Array(4).fill('write'),...Array(12).fill('read')],read_write:[...Array(8).fill('read'),...Array(8).fill('write')],short_bursts:Array.from({length:16},(_,i)=>i%2?'read':'write'),sparse_updates:Array.from({length:16},(_,i)=>i%5?'read':'write')};
function calls(kind,t){return Array.from({length:block},(_,i)=>kind==='read'?['zero',[]]:['replace_zero',[BigInt((i*17+t*31)%10007),false]]);}
async function execute(state,cs){const bound=new Map();for(const [name,args]of cs){if(!bound.has(name))bound.set(name,state.bind(name));await bound.get(name)(...args);}}
const results=[];
for(const [trace,kinds]of Object.entries(traces)){
 const data={schema:1,kind:'ink-lifecycle-replay-v1',binding:bundle.binding,trace,setup_ns:Object.fromEntries(ids.map(id=>[id,[]])),windows:[]};
 for(let r=0;r<3;r++)for(const id of order){const t=performance.now();const s=await restore(id,initial);data.setup_ns[id].push((performance.now()-t)*1e6);assert.deepEqual(await s.checkpoint(),initial);}
 let prefix=initial;
 for(let t=0;t<kinds.length;t++){
  const cs=calls(kinds[t],t),w={calls:block,snapshot_sha256:createHash('sha256').update(prefix).digest('hex'),costs_ns:Object.fromEntries(ids.map(id=>[id,[]])),migrations:[]};
  const control=await restore('direct',prefix);await execute(control,cs);const expected=await control.checkpoint();
  for(let r=0;r<3;r++)for(const id of order){const s=await restore(id,prefix),start=performance.now();await execute(s,cs);w.costs_ns[id].push((performance.now()-start)*1e6);assert.deepEqual(await s.checkpoint(),expected);}
  for(const from of ids)for(const to of ids)if(from!==to){const samples_ns=[];for(let r=0;r<3;r++){
   const s=await restore(from,prefix),start=performance.now(),snap=await s.checkpoint(),next=await restore(to,snap),bytes=await next.checkpoint();assert.deepEqual(bytes,snap);samples_ns.push((performance.now()-start)*1e6);
  }w.migrations.push({from,to,samples_ns});}
  data.windows.push(w);prefix=expected;
 }
 const controls={};
 const modes=['raw','fixed','recording','adaptive','adaptive_short'],offset=Number(process.env.BENCH_ROTATION??0)%5;
 for(const mode of [...modes.slice(offset),...modes.slice(0,offset)]){
  const times=[],schedules=[],usage=[];
  for(let r=0;r<3;r++){
   const start=performance.now();let h;
   if(mode==='raw'){const s=await restore('direct',initial),bound=new Map();h={call:async(n,a)=>{if(!bound.has(n))bound.set(n,s.bind(n));return bound.get(n)(...a);},checkpoint:()=>s.checkpoint(),status:()=>({current:'direct'}),close:async()=>{}};}
   else h=await createAdaptiveState({binding:bundle.binding,profile:fitted.profile,policy,variants,baseline:'direct',enabled:mode.startsWith('adaptive'),recording:mode==='fixed'?false:{windowCalls:mode==='adaptive_short'?64:block,sampleEvery:32},usage:mode==='recording'?{windowCalls:mode==='adaptive_short'?64:block,sampleEvery:32}:null});
   const schedule=[];
   for(let t=0;t<kinds.length;t++){
    schedule.push(h.status().current);
    for(const [name,args]of calls(kinds[t],t))await h.call(name,args,{...features,usage:{kind:kinds[t],key:kinds[t]==='write'?0:1,size:128,touched:kinds[t]==='write'?1:0,scanned:kinds[t]==='read'?128:0}});
   }
   times.push((performance.now()-start)*1e6);assert.deepEqual(await h.checkpoint(),prefix);schedules.push(schedule);if(mode==='recording')usage.push(h.status().access);await h.close();
  }
  controls[mode]={elapsed_ns:times,schedules,...(usage.length?{usage}: {})};
 }
 assert.ok(controls.adaptive.schedules.every(s=>JSON.stringify(s)===JSON.stringify(controls.adaptive.schedules[0])));
 data.controller={elapsed_ns:controls.adaptive.elapsed_ns,schedule:controls.adaptive.schedules[0]};
 const file=out+'.'+trace+'.json';fs.writeFileSync(file,JSON.stringify(data,null,2));
 execFileSync('python3',['-m','ink_planner.lifecycle_analysis',file,'-o',file+'.analysis.json'],{env:{...process.env,PYTHONPATH:path.join(repo,'planner')}});
 const analysis=JSON.parse(fs.readFileSync(file+'.analysis.json'));results.push({trace,controls,analysis});
 console.log(JSON.stringify({trace,best_fixed:analysis.best_fixed,available_gain:analysis.available_switching_gain_ns,choice_gap:analysis.controller_choice_gap_ns}));
}
fs.writeFileSync(out,JSON.stringify({binding:bundle.binding,block_calls:block,rotation,results},null,2));
