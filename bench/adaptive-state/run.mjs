// Actual emitted Ink programs; development acquisition is separate from evaluation.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2]),compiler=path.resolve(process.argv[3]),repo=path.resolve(process.argv[4]),out=process.argv[5];
const bundle=JSON.parse(fs.readFileSync(path.join(root,'bundle.json')));
const {createAdaptiveState}=await import(pathToFileURL(path.join(root,'adaptive-state.mjs')));
const modules=Object.fromEntries(await Promise.all(bundle.artifacts.map(async a=>[a.id,await import(pathToFileURL(path.join(root,a.file)))])));
const variants=Object.fromEntries(Object.entries(modules).map(([id,m])=>[id,{create:()=>m.createState(),restore:async bytes=>{const state=m.createState();await state.restore(bytes);return state;}}]));
const policy={horizon_calls:32768,min_residence_calls:1024,stable_windows:3,min_gain:.15,migration_margin:2,memory_limit_bytes:1024*1024*1024,max_pause_ns:1e9,max_switches:16};
const rows=128,shape='rows128',features={shape,state_elements:rows};
async function seed(factory){const s=await factory.create();for(let i=0;i<rows;i++)s.bind('put')(BigInt(i),BigInt(i));return s;}
const initial=await (await seed(variants.direct)).checkpoint();
const samples={},migrations=[];
for(const [id,factory]of Object.entries(variants)){
 const cells={};let peak=0;
 for(const [name,args]of [['zero',[]],['replace_zero',[17n,false]],['replace_zero',[17n,true]]]){
  const key='action:'+name+'@'+shape;cells[key]??=[];
  for(let round=0;round<7;round++){
   const s=await factory.restore(initial),control=await variants.direct.restore(initial),call=s.bind(name),oracle=control.bind(name);
   for(let i=0;i<100;i++)assert.deepEqual(call(...args),oracle(...args));
   const start=performance.now();for(let i=0;i<512;i++)call(...args);const ns=(performance.now()-start)*1e6/512;
   for(let i=0;i<512;i++)oracle(...args);
   assert.deepEqual(await s.checkpoint(),await control.checkpoint());
   if(round>1)cells[key].push(ns);peak=Math.max(peak,process.memoryUsage().rss);
  }
 }
 samples[id]={cells,peak_bytes:peak};
}
for(const from of Object.keys(variants))for(const to of Object.keys(variants))if(from!==to){
 const ns=[];let peak=0;
 for(let i=0;i<5;i++){const s=await variants[from].restore(initial),t=performance.now(),checkpoint=await s.checkpoint(),next=await variants[to].restore(checkpoint);assert.deepEqual(await next.checkpoint(),checkpoint);ns.push((performance.now()-t)*1e6);peak=Math.max(peak,process.memoryUsage().rss);}
 migrations.push({from,to,samples_ns:ns,peak_bytes:peak,min_state_elements:rows,max_state_elements:rows});
}
const observed={binding:bundle.binding,variants:samples,migrations};fs.writeFileSync(out+'.observations.json',JSON.stringify(observed,null,2));
execFileSync('python3',['-m','ink_planner.adaptive_state','fit','--bundle',path.join(root,'bundle.json'),'--observations',out+'.observations.json','-o',out+'.fitted.json'],{env:{...process.env,PYTHONPATH:path.join(repo,'planner')}});
const fitted=JSON.parse(fs.readFileSync(out+'.fitted.json'));
const normalize=x=>JSON.parse(JSON.stringify(x,(_,v)=>typeof v==='bigint'?Number(v):v));
// Independently executed reference history crosses a forced switch in a separate
// conformance cohort. Those fixture prices are NOT performance evidence.
const forced=structuredClone(fitted.profile);for(const [id,v]of Object.entries(forced.variants))v.cells={['action:zero@'+shape]:{low_ns:id==='direct'?1000:1,high_ns:id==='direct'?1000:1}};
for(const m of forced.migrations){m.high_ns=1;m.max_pause_ns=1;m.min_state_elements=0;m.max_state_elements=1000;}
const check=await createAdaptiveState({binding:bundle.binding,profile:forced,variants,baseline:'direct',policy:{...policy,min_residence_calls:1,stable_windows:1},recording:{windowCalls:1}});
const calls=[{call:'put',args:[0,9]},{call:'zero',args:[]},{call:'replace_zero',args:[12,true]},{call:'zero',args:[]},{call:'replace_zero',args:[17,false]},{call:'get',args:[0]},{call:'erase_zero',args:[true]},{call:'zero',args:[]}];
const script=out+'.calls.json',snapshot=out+'.snapshot';fs.writeFileSync(script,JSON.stringify(calls));
const oracle=JSON.parse(execFileSync(compiler,['execute',process.env.BENCH_SOURCE??path.join(repo,'examples/point-query-delta.ink'),script,'--portable','--snapshot-out',snapshot],{encoding:'utf8'}));
for(let i=0;i<calls.length;i++){const c=calls[i];assert.deepEqual(normalize(await check.call(c.call,c.args.map(v=>typeof v==='number'?BigInt(v):v),features)),oracle[i]);}
assert.equal(check.status().current,'cached');assert.deepEqual(Buffer.from(await check.checkpoint()),fs.readFileSync(snapshot));await check.close();
const traces={read_heavy:[['read',8192]],write_heavy:[['write',8192]],phase_change:[['write',4096],['read',16384]],read_then_write:[['read',8192],['write',8192]],oscillating:Array.from({length:16},(_,i)=>[i%2?'read':'write',128]),unknown:[['unknown',4096]]};
const results=[];
const modes=['raw_direct','direct','cached','profile_once','adaptive'];const rotation=Number(process.env.BENCH_ROTATION??0)%modes.length;
for(const [trace,parts]of Object.entries(traces))for(const mode of [...modes.slice(rotation),...modes.slice(0,rotation)]){
 const events=[];const start=performance.now();
 // Profile-once uses the first declared phase and the same saved cost evidence;
 // records migration/setup in the complete session if it chooses cached.
 let baseline=mode==='cached'?'cached':'direct';
 if(mode==='profile_once'&&parts[0][0]==='read'){
  const d=samples.direct.cells['action:zero@'+shape],c=samples.cached.cells['action:zero@'+shape];if(Math.max(...c)<Math.min(...d)*.85)baseline='cached';
 }
 const seeded=Object.fromEntries(Object.entries(variants).map(([id,v])=>[id,{...v,create:()=>v.restore(initial)}]));
 let host;
 if(mode==='raw_direct'){const s=await seeded.direct.create(),bind=new Map();host={call:async(n,a)=>{if(!bind.has(n))bind.set(n,s.bind(n));return bind.get(n)(...a);},checkpoint:()=>s.checkpoint(),status:()=>({current:'direct'}),close:async()=>{}};}
 else host=await createAdaptiveState({binding:bundle.binding,profile:fitted.profile,variants:seeded,baseline,policy,enabled:mode==='adaptive',recording:{windowCalls:256,sampleEvery:32},onDiagnostic:e=>{if(e.kind==='switched'||e.kind==='adaptation-disabled')events.push(e);}});
 const expected=await variants.direct.restore(initial);
 let last;for(const [kind,count]of parts){for(let i=0;i<count;i++){
  const name=kind==='write'?'replace_zero':'zero',args=kind==='write'?[BigInt(i),false]:[];
  last=await host.call(name,args,kind==='unknown'?{shape:'unmeasured',state_elements:rows}:features);
 }}
 const elapsed_ns=(performance.now()-start)*1e6;
 for(const [kind,count]of parts)for(let i=0;i<count;i++)expected.bind(kind==='write'?'replace_zero':'zero')(...(kind==='write'?[BigInt(i),false]:[]));
 assert.deepEqual(await host.checkpoint(),await expected.checkpoint());
 results.push({trace,mode,elapsed_ns,events,selected:host.status().current,calls:parts.reduce((s,p)=>s+p[1],0),peak_rss:process.memoryUsage().rss});await host.close();
}
fs.writeFileSync(out,JSON.stringify({binding:bundle.binding,scope:'Shared host, complete serialized sessions; setup included, output validation outside timings. Empirical model extrema, not universal bounds.',results},null,2));
console.log(JSON.stringify(results.map(({trace,mode,elapsed_ns,selected,events})=>({trace,mode,ms:elapsed_ns/1e6,selected,switches:events.filter(e=>e.kind==='switched').length}))));
