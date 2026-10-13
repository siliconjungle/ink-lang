// State-only controls: identical U64 arithmetic, inputs and observation windows.
// Raw signals controls omit Ink's versions/events. A separate manual control
// matches the hot action's domain failure, commit and ordered event contract.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
const cfg=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const require=createRequire(cfg.dependency_root+'/package.json');
const {signal,computed,batch,effect}=require('@preact/signals-core');
const svelte=await import(pathToFileURL(cfg.svelte_module));
const word=n=>BigInt.asUintN(64,n);
const modules=await Promise.all(cfg.ink_artifacts.map(async a=>({...a,module:await import(pathToFileURL(a.path)),sha256:createHash('sha256').update(fs.readFileSync(a.path)).digest('hex')})));
function delta(init){
 const rows=new Map(init.map((r,i)=>[BigInt(i),{...r}]));
 const total=signal(init.reduce((s,r)=>r.active?word(s+r.value):s,0n)),count=signal(BigInt(init.filter(r=>r.active).length));
 return {put(k,v,a){const old=rows.get(k);batch(()=>{total.value=word(total.value-(old.active?old.value:0n)+(a?v:0n));count.value+=BigInt(a)-BigInt(old.active);rows.set(k,{value:v,active:a});});},total:()=>total.value,count:()=>count.value,
         connect(cb){return effect(()=>cb(total.value,count.value));}};
}
function derived(init){
 const rows=init.map(r=>signal({...r}));
 const total=computed(()=>rows.reduce((s,r)=>r.value.active?word(s+r.value.value):s,0n));
 const count=computed(()=>BigInt(rows.filter(r=>r.value.active).length));
 return {put(k,v,a){rows[Number(k)].value={value:v,active:a};},total:()=>total.value,count:()=>count.value,
         connect(cb){return effect(()=>cb(total.value,count.value));}};
}
function committedDelta(init){
 const rows=new Map(init.map((r,i)=>[BigInt(i),{...r}]));
 const total=signal(init.reduce((s,r)=>r.active?word(s+r.value):s,0n)),count=signal(BigInt(init.filter(r=>r.active).length));
 let version=BigInt(init.length),outbox=[];
 return {put(k,v,a,fail=false){
  if(fail)return {Err:'Error.Failed'};
  if(version===word(-1n))throw Error('commit sequence exhausted');
  const old=rows.get(k),next=version+1n;
  const sum=word(total.value-(old?.active?old.value:0n)+(a?v:0n));
  const size=word(count.value+BigInt(a)-BigInt(old?.active??false));
  batch(()=>{rows.set(k,{value:v,active:a});total.value=sum;count.value=size;version=next;outbox.push({commit:next,position:0n,channel:'seen',value:v});});
  return {Ok:null};
 },total:()=>total.value,count:()=>count.value,clear(){outbox=[];},
 contracts(){return {version,outbox:outbox.map(e=>({...e}))};},
 connect(cb){return effect(()=>cb(total.value,count.value));}};
}
async function ink(artifact,init){
 const state=artifact.module.createState(),put=state.bind('put',{resultOnly:true}),total=state.bind('total_query',{resultOnly:true}),count=state.bind('count_query',{resultOnly:true});
 // Seed ordinary state and restore every candidate through the same portable ABI.
 const seed=modules[0].module.createState(),seedPut=seed.bind('put',{resultOnly:true});
 for(let i=0;i<init.length;i++)seedPut(BigInt(i),init[i].value,init[i].active,false);
 (seed.acknowledgeThrough??seed.acknowledge_through).call(seed,word(-1n),word(-1n));
 await state.restore(await seed.checkpoint());
 return {put(k,v,a,fail=false){return put(k,v,a,fail);},total,count,
  contracts(){return {version:state.version,outbox:state.outbox};},
  clear(){(state.acknowledgeThrough??state.acknowledge_through).call(state,word(-1n),word(-1n));},
  connect(cb){const a=state.subscribe('total_query',[],v=>cb(v,count())),b=state.subscribe('count_query',[],v=>cb(total(),v));return ()=>{a();b();};}};
}
let sink=0n;
const samples=[],validations=[];
const factories=[
 ...modules.map(a=>({label:a.label,create:init=>ink(a,init),baseline:a.baseline??a.label==='Ink baseline'})),
 {label:'Preact manual delta',create:init=>delta(init)},
 {label:'Preact delta + commits/events',create:init=>committedDelta(init)},
 {label:'Svelte manual delta',create:init=>svelte.deltaRows(init)},
 {label:'Preact computed',create:init=>derived(init),baseline:true}
];
const phases=['sync-update-and-aggregate','awaited-update-and-aggregate','sync-unchanged-read','sync-burst32','sync-observed-update'];
// Warm shared generated bodies on a small state before comparing table sizes.
// Otherwise the first (smallest) size also pays for evolving V8 optimisation.
const warmInitial=Array.from({length:8},(_,i)=>({value:BigInt(i),active:i%2===0}));
for(const f of factories){
 const m=await f.create(warmInitial);let close=null;
 for(let i=0;i<20000;i++){
  if(i===10000)close=m.connect?.(()=>{});
  m.put(BigInt(i%8),i%19===0?word(-1n):BigInt(i),i%3===0);
  sink^=m.total()^m.count();
  if(i%2048===2047)m.clear?.();
 }
 close?.();m.clear?.();
}
for(const n of cfg.rows??[256,4096,16384]){
 const initial=Array.from({length:n},(_,i)=>({value:BigInt(i),active:i%2===0}));
 const reference=await ink(modules[0],initial),manual=committedDelta(initial);
 for(let j=0;j<32;j++){
  const args=[BigInt(j%5===0?n+j:(j*37)%n),word(-BigInt(j+1)),j%3===0,j%7===0];
  assert.deepEqual(manual.put(...args),reference.put(...args));
  assert.equal(manual.total(),reference.total());assert.equal(manual.count(),reference.count());
  assert.deepEqual(manual.contracts(),reference.contracts());
 }
 const exposed=manual.contracts();exposed.outbox[0].value=0n;
 assert.deepEqual(manual.contracts(),reference.contracts());
 validations.push({label:'Preact delta + commits/events',rows:n,domainFailuresVersionsEventsOwnership:true});
 // Full-width and history checks are independent of all timing.
 for(const f of factories){
  const m=await f.create(initial),rows=initial.map(r=>({...r}));
  for(let j=0;j<64;j++){
   const k=(j*37)%n,v=j%7===0?word(-1n):BigInt(999+j),a=j%3===0;
   m.put(BigInt(k),v,a);rows[k]={value:v,active:a};
   assert.equal(m.total(),rows.reduce((s,r)=>r.active?word(s+r.value):s,0n),f.label+' full-width sum');
   assert.equal(m.count(),BigInt(rows.filter(r=>r.active).length),f.label+' count');
  }
  validations.push({label:f.label,rows:n,fullWidthHistory:true});m.clear?.();
 }
 for(const phase of phases){
  const eligible=factories.filter(f=>phase!=='sync-observed-update'||!f.label.startsWith('Svelte'));
  const lanes=[];
  for(const f of eligible){
   const m=await f.create(initial);let publications=0;
   const close=phase==='sync-observed-update'?m.connect(()=>{publications++;}):null;
   lanes.push({...f,m,close,publications:()=>publications});
  }
  const roundOrder=lanes.map((_,i)=>i);
  for(let round=-3;round<7;round++){
   const order=(round+cfg.process_index)%2?[...roundOrder].reverse():roundOrder;
   for(const index of order){
    const lane=lanes[index],m=lane.m,units=lane.baseline?128:2048,burst=phase==='sync-burst32'?32:1;
    const inputs=Array.from({length:units*burst},(_,i)=>[BigInt((i*37+(round+4)*19)%n),i%19===0?word(-1n):BigInt((round+4)*100000000+i),i%3===0]);
    const before=lane.publications();let total,count;
    const start=performance.now();
    if(phase==='awaited-update-and-aggregate'){
     for(const [k,v,a]of inputs){await m.put(k,v,a);total=await m.total();count=await m.count();}
    }else if(phase==='sync-unchanged-read'){
     for(let i=0;i<units;i++){total=m.total();count=m.count();}
    }else{
     for(let i=0;i<units;i++){for(let j=0;j<burst;j++){const [k,v,a]=inputs[i*burst+j];m.put(k,v,a);}total=m.total();count=m.count();}
    }
    const ns=(performance.now()-start)*1e6;sink^=total^count;
    if(round>=0)samples.push({label:lane.label,rows:n,phase,round,units,writesPerUnit:phase==='sync-unchanged-read'?0:burst,nsPerUnit:ns/units,publications:lane.publications()-before});
    m.clear?.();
   }
  }
  for(const lane of lanes)lane.close?.();
 }
}
const median=v=>{const x=[...v].sort((a,b)=>a-b);return x[Math.floor(x.length/2)];};
const summary=[];
for(const label of factories.map(f=>f.label))for(const rows of cfg.rows??[256,4096,16384])for(const phase of phases){
 const items=samples.filter(s=>s.label===label&&s.rows===rows&&s.phase===phase);
 if(items.length)summary.push({label,rows,phase,medianNs:median(items.map(s=>s.nsPerUnit)),minNs:Math.min(...items.map(s=>s.nsPerUnit)),maxNs:Math.max(...items.map(s=>s.nsPerUnit))});
}
console.log(JSON.stringify({schema:1,date:new Date().toISOString(),process_index:cfg.process_index,node:process.version,hardware:cpus()[0].model,
 artifacts:modules.map(({label,path,sha256})=>({label,path,sha256})),validations,samples,summary,sink:String(sink),
 warmup:{sharedBodyCallsPerLane:20000,rows:8,connectedCalls:10000,phaseRounds:3},
 scope:'State-only; synchronous prebound result-only Ink retains versions/events/atomic failures. Raw controls omit them; separate commits/events control matches this hot action only, without portable restore or general source transactions. Matched synchronous and awaited windows; full-width U64 controls; no DOM; cold setup/restore excluded here and measured separately by planner lifecycles; connected Ink has two independently owned query subscriptions versus one batched signals effect'}));
