// Same compiled independent state machines, either switched uniformly as a whole
// or independently. Composition is explicit; no invented cross-state transaction.
import{createHash}from'node:crypto';import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';
import{createAdaptiveState}from'../../runtime/hosts/adaptive-state.mjs';import{createAdaptiveCollections}from'../../runtime/hosts/adaptive-collections.mjs';
const [rootArg,profileArg,out]=process.argv.slice(2),root=path.resolve(rootArg),bundle=JSON.parse(fs.readFileSync(path.join(root,'bundle.json'))),fit=JSON.parse(fs.readFileSync(profileArg));
const mods=Object.fromEntries(await Promise.all(bundle.artifacts.map(async a=>[a.id,await import(pathToFileURL(path.join(root,a.file)))])));
const rows=128,count=16,names=Array.from({length:count},(_,i)=>'c'+i),encoder=new TextEncoder(),decoder=new TextDecoder();
const seed=mods.direct.createState();for(let i=0;i<rows;i++)seed.bind('put')(BigInt(i),BigInt(i));const initial=await seed.checkpoint();
let restoredBytes=0,restoredStates=0;
const variants=Object.fromEntries(Object.entries(mods).map(([id,m])=>[id,{create:async()=>{const s=m.createState();await s.restore(initial);return s;},restore:async b=>{restoredBytes+=b.length;restoredStates++;const s=m.createState();await s.restore(b);return s;}}]));
const whole=Object.fromEntries(Object.keys(mods).map(id=>[id,{create:async()=>wrap(await Promise.all(names.map(()=>variants[id].create()))),restore:async b=>{const parts=JSON.parse(decoder.decode(b));return wrap(await Promise.all(parts.map(b=>variants[id].restore(Uint8Array.from(b)))));}}]));
function wrap(states){const bound=states.map(()=>new Map());return{bind:name=>(collection,...args)=>{const id=Number(collection);if(!bound[id].has(name))bound[id].set(name,states[id].bind(name));return bound[id].get(name)(...args);},checkpoint:async()=>encoder.encode(JSON.stringify(await Promise.all(states.map(async s=>Array.from(await s.checkpoint()))))),dispose(){}};}
const profile=structuredClone(fit.profile);
// Measure the actual whole-group transition cost; no assumed linear multiplier.
const wholeBinding={...bundle.binding,boundary:'owned-independent-collections-v1',variants:Object.fromEntries(Object.entries(bundle.binding.variants).map(([id,hash])=>[id,createHash('sha256').update(hash+String(count)+fs.readFileSync(new URL(import.meta.url))).digest('hex')]))};
const wholeProfile=structuredClone(profile);wholeProfile.binding=wholeBinding;
for(const [id,v]of Object.entries(wholeProfile.variants)){
 v.cells={};
 for(const [name,args]of [['zero',[0]],['replace_zero',[1,17n,false]]]){
  const samples=[];for(let r=0;r<5;r++){const h=await whole[id].create(),f=h.bind(name);for(let i=0;i<32;i++)await f(...args);const t=performance.now();for(let i=0;i<256;i++)await f(...args);samples.push((performance.now()-t)*1e6/256);}
  v.cells['action:'+name+'@rows128']={low_ns:Math.min(...samples),high_ns:Math.max(...samples)};
 }
 v.peak_bytes=process.memoryUsage().rss;
}
for(const m of wholeProfile.migrations){const ns=[];for(let i=0;i<3;i++){const a=await whole[m.from].create(),t=performance.now(),b=await a.checkpoint(),next=await whole[m.to].restore(b);assert.deepEqual(await next.checkpoint(),b);ns.push((performance.now()-t)*1e6);}m.high_ns=Math.max(...ns);m.max_pause_ns=m.high_ns;m.peak_bytes=process.memoryUsage().rss;m.min_state_elements=rows*count;m.max_state_elements=rows*count;}
const policy={...fit.policy,horizon_calls:32768,min_residence_calls:1024,stable_windows:3,max_pause_ns:1e9,memory_limit_bytes:1073741824,max_switches:32};
const configs=()=>Object.fromEntries(names.map(id=>[id,{binding:bundle.binding,profile,variants,baseline:'direct',policy,recording:{windowCalls:256,sampleEvery:32}}]));
const modes=['fixed','whole','local_fixed','local'],rotation=Number(process.env.BENCH_ROTATION??0)%4,results=[];
for(const mode of [...modes.slice(rotation),...modes.slice(0,rotation)]){
 const start=performance.now();let h;
 if(mode.startsWith('local'))h=await createAdaptiveCollections(Object.fromEntries(Object.entries(configs()).map(([id,c])=>[id,mode==='local_fixed'?{...c,enabled:false,recording:false}:c])));
 else h=await createAdaptiveState({binding:wholeBinding,profile:wholeProfile,variants:whole,baseline:'direct',policy,enabled:mode==='whole',recording:mode==='fixed'?false:{windowCalls:256,sampleEvery:32}});
 restoredBytes=0;restoredStates=0;
 // c0 is hot/read-only; c1 changes occasionally; the other 14 remain cold.
 for(let i=0;i<8192;i++){
  const id=i%16===0?1:0,name=id?'replace_zero':'zero',args=id?[BigInt(i),false]:[],f={shape:'rows128',state_elements:mode.startsWith('local')?rows:rows*count};
  if(mode.startsWith('local'))await h.call('c'+id,name,args,f);else await h.call(name,[id,...args],f);
 }
 const elapsed_ns=(performance.now()-start)*1e6,states=mode.startsWith('local')?await Promise.all(names.map(id=>h.checkpoint(id))):JSON.parse(decoder.decode(await h.checkpoint())).map(b=>Uint8Array.from(b));
 const status=h.status();results.push({mode,elapsed_ns,restored_bytes:restoredBytes,restored_states:restoredStates,status:mode.startsWith('local')?Object.fromEntries(Object.entries(status).map(([id,s])=>[id,s.current])):status.current,snapshots:states.map(b=>Buffer.from(b).toString('base64'))});await h.close();
}
assert.ok(results.every(r=>JSON.stringify(r.snapshots)===JSON.stringify(results[0].snapshots)));
fs.writeFileSync(out,JSON.stringify({binding:bundle.binding,collections:count,rows_per_collection:rows,whole_profile:wholeProfile,scope:'Independent compiled states; whole mode switches all states, local mode only selected collection. Local mode has a richer candidate space. Timings include construction and transitions.',results:results.map(({snapshots,...r})=>r)},null,2));console.log(JSON.stringify(results.map(({snapshots,...r})=>r)));
