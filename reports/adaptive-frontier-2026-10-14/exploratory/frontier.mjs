// Matched retained-state sessions. Run acquisition separately from evaluation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createAdaptiveState} from '../../runtime/hosts/adaptive-state.mjs';
import {applyPatch} from '../../build/adaptive-frontier-core/dist/apply.js';
import {OP_SET, OP_REMOVE} from '../../build/adaptive-frontier-core/dist/constants.js';
import {createStateEngine} from '../../build/adaptive-frontier-state/dist/index.js';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [command,outArg,indexArg='0']=process.argv.slice(2),out=path.resolve(outArg),processIndex=Number(indexArg);
fs.mkdirSync(out,{recursive:true});
const bundleDir=path.join(repo,'build/adaptive-learning-aggregate/bundle');
const bundle=JSON.parse(fs.readFileSync(path.join(bundleDir,'bundle.json')));
const sha=b=>createHash('sha256').update(b).digest('hex');
const mods=Object.fromEntries(await Promise.all(bundle.artifacts.map(async a=>{
 assert.equal(sha(fs.readFileSync(path.join(bundleDir,a.file))),bundle.binding.variants[a.id]);
 return [a.id,await import(pathToFileURL(path.join(bundleDir,a.file)))];
})));
const normalize=x=>JSON.parse(JSON.stringify(x,(_,v)=>typeof v==='bigint'?Number(v):v));
const policy={horizon_calls:4096,min_residence_calls:1024,stable_windows:3,min_gain:.15,migration_margin:2,memory_limit_bytes:268435456,max_pause_ns:50000000,max_switches:32};
const sizes=[128,4096],lanes=['frontier_core','frontier_state','ink_direct','ink_cached','ink_fixed_host','ink_adaptive'];
const empty=[],mask=0xffffffffffffffffn;
async function restored(id,snapshot){const s=mods[id].createState();await s.restore(snapshot);return s;}
async function initial(rows){const s=mods.direct.createState(),put=s.bind('put');for(let i=0;i<rows;i++)put(BigInt(i),BigInt(i));return s.checkpoint();}
function provenance(){
 const hashes={};for(const dir of ['runtime/hosts','abi/hosts','build/adaptive-learning-aggregate/bundle','build/adaptive-frontier-core/dist','build/adaptive-frontier-engine/dist','build/adaptive-frontier-state/dist']){
  if(!fs.existsSync(path.join(repo,dir)))continue;
  for(const name of fs.readdirSync(path.join(repo,dir)))if(/\.(mjs|js|wasm|json)$/.test(name))hashes[dir+'/'+name]=sha(fs.readFileSync(path.join(repo,dir,name)));
 }
 hashes['bench/adaptive-learning/frontier.mjs']=sha(fs.readFileSync(fileURLToPath(import.meta.url)));
 return {ink_revision:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),frontier:Object.fromEntries(['core','engine','state'].map(n=>[n,execFileSync('git',['rev-parse','HEAD'],{cwd:path.join(repo,'build/adaptive-frontier-'+n),encoding:'utf8'}).trim()])),binding:bundle.binding,hashes,node:process.version,cpu:os.cpus()[0].model,platform:os.platform(),policy};
}

if(command==='acquire'){
 const profiles={};
 for(const rows of sizes){
  const snapshot=await initial(rows),variants={},migrations=[];
  for(const id of ['direct','cached']){
   const cells={},samples={};
   for(const name of ['zero','replace_zero']){
    const times=[];
    for(let r=0;r<7;r++){
     const s=await restored(id,snapshot),call=s.bind(name),ack=(s.acknowledgeThrough??s.acknowledge_through).bind(s);
     for(let i=0;i<64;i++){call(...(name==='zero'?[]:[BigInt(i),false]));if(name!=='zero')ack(mask,mask);}
     const t=performance.now();for(let i=0;i<128;i++){call(...(name==='zero'?[]:[BigInt(i*13),false]));if(name!=='zero')ack(mask,mask);}
     if(r>=2)times.push((performance.now()-t)*1e6/128);
    }
    const key='action:'+name+'@rows'+rows;samples[key]=times;cells[key]={low_ns:Math.min(...times),high_ns:Math.max(...times)};
   }
   variants[id]={cells,peak_bytes:process.memoryUsage().rss};variants[id].samples=samples;
  }
  for(const from of ['direct','cached'])for(const to of ['direct','cached'])if(from!==to){
   const samples=[];for(let i=0;i<5;i++){const s=await restored(from,snapshot),t=performance.now(),bytes=await s.checkpoint(),next=await restored(to,bytes);assert.deepEqual(await next.checkpoint(),bytes);samples.push((performance.now()-t)*1e6);}
   migrations.push({from,to,high_ns:Math.max(...samples),max_pause_ns:Math.max(...samples),peak_bytes:process.memoryUsage().rss,min_state_elements:rows,max_state_elements:rows,samples_ns:samples});
  }
  profiles[rows]={binding:bundle.binding,variants,migrations};console.error('acquired',rows);
 }
 fs.writeFileSync(path.join(out,'profiles.json'),JSON.stringify({provenance:provenance(),profiles},null,2),{flag:'wx'});
 process.exit(0);
}
assert.equal(command,'run');
const acquired=JSON.parse(fs.readFileSync(path.join(out,'profiles.json')));
assert.deepEqual(acquired.provenance.binding,bundle.binding);

// Frontier owns ordinary JSON Numbers. This fixture keeps every value and sum
// exact within Number's safe range; Ink retains its compiled u64 arithmetic.
function frontier(rows,useState){
 let data=Object.fromEntries(Array.from({length:rows},(_,i)=>[String(i),i]));
 const engine=useState?createStateEngine(data):null;let version=BigInt(rows),outbox=[];
 if(engine)data=engine.get();
 function patch(p){if(engine){engine.commitPatch(p);data=engine.get();}else data=applyPatch(data,p);}
 function call(name,args){
  if(name==='zero'){let sum=0;for(const value of Object.values(data))sum+=value;return{result:sum,committed:false,version,events:[]};}
  if(name==='get'){const key=String(args[0]);return{result:Object.hasOwn(data,key)?{Some:data[key]}:{None:null},committed:false,version,events:[]};}
  const fail=args.at(-1),old=data['0'],had=Object.hasOwn(data,'0');
  if(name==='replace_zero'&&!had)return{result:{Err:'Error.Failed'},committed:false,version,events:[]};
  assert.ok(name==='replace_zero'||name==='erase_zero');
  patch(name==='replace_zero'?[[OP_SET,['0'],Number(args[0])]]:[[OP_REMOVE,['0']]]);
  if(fail){patch(had?[[OP_SET,['0'],old]]:[[OP_REMOVE,['0']]]);return{result:{Err:'Error.Failed'},committed:false,version,events:[]};}
  version++;const event={commit:version,position:0n,channel:'seen',value:name==='replace_zero'?Number(args[0]):0};outbox.push(event);
  return{result:{Ok:null},committed:true,version,events:[{...event}]};
 }
 return{call,acknowledge(){outbox.length=0;},get rows(){return data;},get outbox(){return outbox;},get version(){return version;},close(){engine?.clear();}};
}

function history(kind){
 return Array.from({length:4096},(_,i)=>{
  const write=kind==='steady_write'||kind==='write_read'&&i<2048||kind==='read_write'&&i>=2048||kind==='alternating'&&Math.floor(i/256)%2===0||kind==='mixed'&&i%2===0||kind==='sparse_updates'&&i%32===0;
  return {name:write?'replace_zero':'zero',args:write?[BigInt((i*17+31)%10007),false]:empty};
 });
}
const histories=Object.fromEntries(['steady_read','steady_write','write_read','read_write','alternating','mixed','sparse_updates'].map(n=>[n,history(n)]));
function digest(h,r){let value=typeof r.result==='number'||typeof r.result==='bigint'?Number(r.result):r.result.Err?0xbad:0;for(const e of r.events)value+=Number(e.value)+Number(e.commit)+Number(e.position);return(Math.imul(h,1664525)+Number(r.version)+value+(r.committed?65537:0))>>>0;}
async function host(lane,rows,snapshot){
 if(lane.startsWith('frontier'))return frontier(rows,lane==='frontier_state');
 if(lane==='ink_direct'||lane==='ink_cached'){
  const s=await restored(lane==='ink_cached'?'cached':'direct',snapshot),bound=new Map();
  return{call(n,a){if(!bound.has(n))bound.set(n,s.bind(n));return bound.get(n)(...a);},acknowledge:()=>(s.acknowledgeThrough??s.acknowledge_through).call(s,mask,mask),checkpoint:()=>s.checkpoint(),get outbox(){return s.outbox;},close(){}};
 }
 const profile=structuredClone(acquired.profiles[rows]);
 for(const v of Object.values(profile.variants))delete v.samples;for(const m of profile.migrations)delete m.samples_ns;
 const events=[];
 const h=await createAdaptiveState({binding:bundle.binding,profile,policy,variants:Object.fromEntries(['direct','cached'].map(id=>[id,{create:()=>restored(id,snapshot),restore:b=>restored(id,b)}])),baseline:'direct',enabled:lane==='ink_adaptive',recording:lane==='ink_adaptive'?{}:false,onDiagnostic:e=>{if(e.kind==='switched'||e.kind==='adaptation-disabled')events.push(e);}});
 return {...h,call:(n,a)=>h.call(n,a,{shape:'rows'+rows,state_elements:rows}),acknowledge:()=>h.acknowledge(mask,mask),events};
}
async function execute(lane,rows,snapshot,script,capture=false){
 const startSetup=performance.now(),h=await host(lane,rows,snapshot),setup_ns=(performance.now()-startSetup)*1e6;
 let checksum=0;const replies=[],start=performance.now();
 for(const s of script){const r=await h.call(s.name,s.args);checksum=digest(checksum,r);if(capture)replies.push(normalize(r));if(r.committed)await h.acknowledge();}
 const elapsed_ns=(performance.now()-start)*1e6,status=h.status?.()??null,events=h.events??[];
 const checkpoint=h.checkpoint?Buffer.from(await h.checkpoint()):null;
 const values=[];for(let i=0;i<rows;i++)values.push(normalize(await h.call('get',[BigInt(i)])).result);
 if(h.outbox)assert.deepEqual(h.outbox,[]);
 await h.close();return{elapsed_ns,setup_ns,checksum,replies,checkpoint,values,status,events};
}
const measurements=[],validation=[],provenanceBefore=provenance();
for(const rows of sizes){
 const snapshot=await initial(rows);
 // Error/rollback/delete controls are outside performance traces.
 const edge=[{name:'replace_zero',args:[17n,true]},{name:'zero',args:[]},{name:'erase_zero',args:[true]},{name:'get',args:[0n]},{name:'erase_zero',args:[false]},{name:'replace_zero',args:[99n,false]},{name:'zero',args:[]}];
 const edgeOracle=await execute('ink_direct',rows,snapshot,edge,true);
 for(const lane of lanes){const x=await execute(lane,rows,snapshot,edge,true);assert.deepEqual(x.replies,edgeOracle.replies,lane+' edge replies');assert.deepEqual(x.values,edgeOracle.values,lane+' edge state');if(x.checkpoint)assert.deepEqual(x.checkpoint,edgeOracle.checkpoint);}
 for(const [trace,script]of Object.entries(histories)){
  const oracle=await execute('ink_direct',rows,snapshot,script,true);
  for(const lane of lanes){const x=await execute(lane,rows,snapshot,script,true);assert.deepEqual(x.replies,oracle.replies,lane+' replies');assert.deepEqual(x.values,oracle.values,lane+' state');assert.equal(x.checksum,oracle.checksum);if(x.checkpoint)assert.deepEqual(x.checkpoint,oracle.checkpoint);assert.ok(!x.events.some(e=>e.kind==='adaptation-disabled'));}
  validation.push({rows,trace,calls:script.length,full_replies:true,all_rows:true,exact_ink_snapshots:true,checksum:oracle.checksum});
  for(let round=0;round<3;round++){
   const shift=(processIndex*3+round)%lanes.length,order=[...lanes.slice(shift),...lanes.slice(0,shift)];
   for(const lane of order){global.gc?.();const x=await execute(lane,rows,snapshot,script);assert.equal(x.checksum,oracle.checksum);assert.deepEqual(x.values,oracle.values);if(x.checkpoint)assert.deepEqual(x.checkpoint,oracle.checkpoint);assert.ok(!x.events.some(e=>e.kind==='adaptation-disabled'));measurements.push({rows,trace,lane,round,calls:script.length,elapsed_ns:x.elapsed_ns,setup_ns:x.setup_ns,checksum:x.checksum,current:x.status?.current,switches:x.events});}
  }
  console.error('completed',processIndex,rows,trace);
 }
}
assert.deepEqual(provenance().hashes,provenanceBefore.hashes,'inputs changed during run');
fs.writeFileSync(path.join(out,'process-'+processIndex+'.json'),JSON.stringify({provenance:provenanceBefore,profile_sha256:sha(fs.readFileSync(path.join(out,'profiles.json'))),processIndex,boundary:'Retained state; sequential awaited calls and complete reply digest; event acknowledgement on successful writes. Setup measured separately; migrations/recording inside session. No watches, persistence, diff or wire transport.',validation,measurements},null,2),{flag:'wx'});
