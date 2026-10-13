import assert from 'node:assert/strict';import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import{fileURLToPath}from'node:url';
import {privateLayout} from './private-layout.mjs';
const file=fileURLToPath(import.meta.url),arg=k=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3),id=Number(process.argv[2]);
if(!Number.isSafeInteger(id))throw Error('id required');
const base=new URL('../frontier-json/compact-stream-release.mjs',import.meta.url),lanes=['native','logical','tuple','tagged','flat'];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files=[file,new URL('./private-layout.mjs',import.meta.url),base],hashes=()=>files.map(p=>[String(p),hash(p)]);
if(!process.argv.includes('--child')){
 const before=hashes(),reports=[];for(const scenario of ['json','rows'])for(const lane of id%2?lanes.toReversed():lanes){
  const r=spawnSync(process.execPath,['--expose-gc',file,String(id),'--child',`--scenario=${scenario}`,`--lane=${lane}`],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout);reports.push(JSON.parse(r.stdout));
 }
 assert.deepEqual(hashes(),before);const out=`reports/frontier-json-2026-10-13/private-layout-probe-${id}.json`;fs.writeFileSync(out,JSON.stringify({schema:1,experimental:true,id,hashes:before,reports,scope:'Private layout-only probe, not a compiled implementation or admission certificate. Prepared stable canonical inputs, copied into independent owned carriers. Native retains ordinary JSON values. Parsing/import/setup excluded from retention timing; input graphs retained before the measured delta. No actions/transactions/whole-program speed claim. Exact logical reconstruction and wire bytes validated outside measured retention phase.'},null,2)+'\n',{flag:'wx'});console.log(out);process.exit(0);
}
const lane=arg('lane'),scenario=arg('scenario');if(!lanes.includes(lane)||!['json','rows'].includes(scenario))throw Error('lane/scenario');
const ink=lane==='native'?null:await import(base.href),json=ink?new ink.JsonCodec(ink.valueCodecs.identity.result):null;
const text=JSON.stringify({...Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),i])),unknown:{nested:['雪',true,null,3],enabled:false}});
let inputs,codec,make,verify,size;
if(scenario==='json'){
 inputs=lane==='native'?JSON.parse(text):json.parse(text);codec=json?.values;size=32;
 const layout=lane==='native'||lane==='logical'?null:privateLayout(codec,ink.createValueCaptureBudget,{tagged:lane!=='tuple',flatRows:lane==='flat'});
 make=()=>lane==='native'?JSON.parse(text):layout?layout.pack(inputs):codec.copy(inputs);
 verify=v=>assert.equal(lane==='native'?JSON.stringify(v):json.stringify(layout?layout.unpack(v):v),text);
}else{
 const nativeInputs=Array.from({length:4096},(_,i)=>({value:i,active:i%2===0,metadata:{label:'row'+i,items:[i%11,true],unknown:false}}));
 inputs=lane==='native'?nativeInputs:nativeInputs.map(v=>({...v,metadata:json.parse(JSON.stringify(v.metadata))}));size=4096;
 if(ink)codec=await ink.createValueCodec(ink.metadata.state.roots[0].value,ink.valueCodecs.identity.result.descriptor.named);
 const layout=lane==='native'||lane==='logical'?null:privateLayout(codec,ink.createValueCaptureBudget,{tagged:lane!=='tuple',flatRows:lane==='flat'});
 make=i=>lane==='native'?structuredClone(inputs[i]):layout?layout.pack(inputs[i]):codec.copy(inputs[i]);
 verify=(v,i)=>{const out=layout?layout.unpack(v):v;if(ink)assert.deepEqual(codec.encode(out),codec.encode(inputs[i]));else assert.deepEqual(out,inputs[i]);};
}
for(let i=0;i<100;i++)verify(make(i%size),i%size);
const memory=()=>{global.gc();return process.memoryUsage();};
const before=memory(),held=scenario==='json'?[]:new Map();const start=process.hrtime.bigint();
for(let i=0;i<size;i++){const v=make(i);if(scenario==='json')held.push(v);else held.set('r'+i,v);}
const ns=String(process.hrtime.bigint()-start),after=memory(),peak=process.resourceUsage().maxRSS*1024;
for(let i=0;i<size;i++)verify(scenario==='json'?held[i]:held.get('r'+i),i);
const inputObjects=new Set(),heldObjects=new Set();
const collect=(v,s)=>{if(v&&typeof v==='object'&&!s.has(v)){s.add(v);Object.values(v).forEach(x=>collect(x,s));}};collect(inputs,inputObjects);
for(const v of held.values()){const own=new Set();collect(v,own);for(const x of own){assert.equal(inputObjects.has(x),false);assert.equal(heldObjects.has(x),false);heldObjects.add(x);}}
if(scenario==='json')held.length=0;else held.clear();const released=memory();
console.log(JSON.stringify({scenario,lane,retain_ns:ns,size,before,after,release:released,retained_heap_delta:after.heapUsed-before.heapUsed,peak_before_verify:peak,private_container_count:heldObjects.size,verified:true}));
