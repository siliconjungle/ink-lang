import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const list={kind:'list',element:{kind:'u32'}},word={kind:'u32'};
const specs=[['inc',[list],list],['double',[list],list],['sum',[list],word],['identity',[list],list],['filter',[list],list]];
const functions=specs.map(([name,params,result],index)=>({name,index,params:params.map(type=>({type})),result,shader:name+'.wgsl',lengths:[0]}));
const source="export const functions={inc:x=>Array.from(x,v=>(v+1)>>>0),double:x=>Array.from(x,v=>Math.imul(v,2)>>>0),sum:x=>x.reduce((n,v)=>(n+v)>>>0,0),identity:x=>x,filter:x=>Array.from(x).filter(v=>v%2===0)};";
const operations={inc:x=>Array.from(x,v=>(v+1)>>>0),double:x=>Array.from(x,v=>Math.imul(v,2)>>>0),sum:x=>x.reduce((n,v)=>(n+v)>>>0,0),identity:x=>x,filter:x=>Array.from(x).filter(v=>v%2===0)};
async function fixture(fn,{workerFailure=false,gpuFailure=false,plannerSelection=null}={}) {
 const dir=await mkdtemp(join(tmpdir(),'ink-placement-')),old={fetch:globalThis.fetch,instantiate:WebAssembly.instantiate,Worker:globalThis.Worker,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator')};
 const trace={cpu:0,gpu:0,workers:0,active:0,peak:0};
 for(const file of ['ink-compute.mjs','backend-selection.mjs','prepared-wasm.mjs','pipeline-contract.mjs','pipeline-workers.mjs'])await copyFile(new URL('../../runtime/hosts/'+file,import.meta.url),join(dir,file));
 await copyFile(new URL('../../planner/browser/pipeline-selection.mjs',import.meta.url),join(dir,'pipeline-selection.mjs'));
 if(plannerSelection)await writeFile(join(dir,'pipeline-selection.mjs'),`export const createPipelineSelector=()=>({clear(){},choose(){return ${JSON.stringify(plannerSelection)}}});`);
 await writeFile(join(dir,'program.mjs'),source);
 await writeFile(join(dir,'ink-device.mjs'),`export const createDevice=()=>({close(){},prepare(){},async run(p){globalThis.placementTrace.gpu++;if(globalThis.placementGpuFailure)throw Error('device lost');const vals=[];for(const s of p.steps){const args=s.args.map(a=>a.kind==='step'?vals[a.index]:Array.from(p.constants[a.index].words));vals.push(globalThis.placementOps[s.f.name](...args));}return {values:Object.fromEntries(p.outputs.map(id=>[id,vals[p.ids.get(id)]])),counters:{upload_bytes:p.constants.reduce((n,c)=>n+c.words.byteLength,0),readback_bytes:p.outputs.reduce((n,id)=>{const v=vals[p.ids.get(id)];return n+4*(Array.isArray(v)?v.length:1)},0),dispatches:p.steps.length}}}});`);
 globalThis.placementTrace=trace;globalThis.placementOps=operations;globalThis.placementGpuFailure=gpuFailure;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:{}}});
 const manifest={schema:2,core_sha256:'compiled',cpu_c_sha256:'cpu',javascript_sha256:'js',shaders:{map:'hash'},functions};
 globalThis.fetch=async url=>String(url).endsWith('manifest.json')?{json:async()=>manifest}:{arrayBuffer:async()=>new ArrayBuffer(0)};
 WebAssembly.instantiate=async()=>{
  const memory=new WebAssembly.Memory({initial:1});let top=64;
  const cpu={memory,ink_compute_reset(){new Uint32Array(memory.buffer).fill(0xdeadbeef);top=64},ink_alloc(n){const p=top;top+=Math.max(1,n)*4;return p},ink_compute_call(index,ptrs,lengths,hp,hc){
   trace.cpu++;const view=new DataView(memory.buffer),ptr=view.getUint32(ptrs,true),count=view.getUint32(lengths,true),input=Array.from(new Uint32Array(memory.buffer,ptr,count));
   const value=operations[functions[index].name](input),words=Array.isArray(value)?value:[value],out=cpu.ink_alloc(words.length);new Uint32Array(memory.buffer,out,words.length).set(words);view.setUint32(hp,out,true);view.setUint32(hc,words.length,true);
  }};return {instance:{exports:cpu}};
 };
 globalThis.Worker=class {
  postMessage(data){const copied=structuredClone(data);trace.workers++;trace.active++;trace.peak=Math.max(trace.peak,trace.active);this.timer=setTimeout(()=>{
   trace.active--;if(workerFailure){this.onerror?.({message:'worker failed'});return;}
   const values={},plan=copied.plan;for(const s of plan.steps)values[s.id]=operations[s.call](...s.args.map(a=>a&&Object.hasOwn(a,'step')?values[a.step]:a&&Object.hasOwn(a,'input')?plan.inputs[a.input]:a));
   this.onmessage?.({data:{id:copied.id,result:{values:Object.fromEntries(plan.outputs.map(id=>[id,values[id]])),backend:copied.backend,counters:{}}}});
  },5)}
  terminate(){clearTimeout(this.timer)}
 };
 try{const {loadInk}=await import(pathToFileURL(join(dir,'ink-compute.mjs')));await fn(options=>loadInk(pathToFileURL(dir+'/'),options),trace)}
 finally{globalThis.fetch=old.fetch;WebAssembly.instantiate=old.instantiate;globalThis.Worker=old.Worker;if(old.navigator)Object.defineProperty(globalThis,'navigator',old.navigator);else delete globalThis.navigator;delete globalThis.placementTrace;delete globalThis.placementOps;delete globalThis.placementGpuFailure;await rm(dir,{recursive:true,force:true})}
}
const chain=xs=>({inputs:{xs},steps:[{id:'a',call:'inc',args:[{input:'xs'}]},{id:'b',call:'double',args:[{step:'a'}]},{id:'total',call:'sum',args:[{step:'b'}]}],outputs:['b','total']});
test('mixed JS/GPU/Wasm execution preserves captured inputs, complete output ownership and resident groups',async()=>fixture(async(load,trace)=>{
 const engine=await load(),xs=Uint32Array.of(0,4294967295,3),p=chain(xs);
 const pending=engine.pipeline(p,{placements:[{end:2,backend:'gpu'},{end:3,backend:'cpu'}]});xs.fill(99);
 const r=await pending;assert.deepEqual(r.values,{b:[2,0,8],total:10});assert.equal(r.backend,'mixed');assert.equal(trace.gpu,1);assert.equal(trace.cpu,1);
 assert.equal(r.counters.upload_bytes,12);assert.equal(r.counters.readback_bytes,12,'only group boundary is read back');assert.equal(r.counters.dispatches,2);
 await engine.pipeline(chain([7]),{placements:[{end:1,backend:'javascript'},{end:3,backend:'cpu'}]});assert.deepEqual(r.values.b,[2,0,8]);await engine.close();assert.deepEqual(r.values.b,[2,0,8]);
}));
test('saved placement selects segments once, without trial execution, and privately binds profile data',async()=>fixture(async(load,trace)=>{
 const initial=await load(),p=chain([1,4]),contexts=await initial.describePipeline(p);await initial.close();
 const rows=contexts.filter(c=>(c.start===0&&c.end===3)||(c.start===0&&c.end===2)||(c.start===2&&c.end===3));
 const profile={schema:1,target_key:'test',setup_ns:{gpu:0},models:Object.fromEntries(rows.map(c=>[c.scope,{boundary:c.boundary,domains:{input_elements:[0,100]},backends:{cpu:{intercept_ns:c.end-c.start===3?1000:100,terms:{}},...(c.end===2?{gpu:{intercept_ns:10,terms:{}}}:{}),...(c.start===2?{javascript:{intercept_ns:10,terms:{}}}:{})}}]))};
 const engine=await load({placementProfile:profile,targetKey:'test'});for(const model of Object.values(profile.models))if(model.backends.gpu)model.backends.gpu.intercept_ns=1e12;
 for(let i=0;i<3;i++){const r=await engine.pipeline(p);assert.deepEqual(r.values,{b:[4,10],total:14});assert.deepEqual(r.placement.segments.map(s=>s.backend),['gpu','javascript']);}
 assert.equal(trace.gpu,3);assert.equal(trace.cpu,0);await engine.close();
}));
test('worker branches overlap, join deterministically and cannot detach or mutate caller storage',async()=>fixture(async(load,trace)=>{
 const engine=await load({parallelism:2}),xs=Uint32Array.of(1,2,3),plan={steps:[{id:'a',call:'inc',args:[xs]},{id:'b',call:'double',args:[xs]}],outputs:['b','a']};
 const placements=[{end:1,backend:'javascript-worker'},{end:2,backend:'cpu-worker'}],pending=engine.pipeline(plan,{placements});xs.fill(7);placements[0].backend='cpu';
 const r=await pending;assert.deepEqual(r.values,{b:[2,4,6],a:[2,3,4]});assert.equal(trace.peak,2);assert.equal(trace.cpu,0);assert.deepEqual([...xs],[7,7,7]);await engine.close();
}));
test('mixed feedback uses simultaneous snapshots including alias swaps and shrinking lists',async()=>fixture(async load=>{
 const engine=await load({parallelism:2});
 for(const iterations of [1,2,3]){
  const p={inputs:{a:[1,2],b:[7,9]},steps:[{id:'a',call:'identity',args:[{input:'a'}]},{id:'b',call:'identity',args:[{input:'b'}]}],feedback:{a:'b',b:'a'},iterations,outputs:['a','b']};
  const r=await engine.pipeline(p,{placements:[{end:1,backend:'javascript-worker'},{end:2,backend:'cpu'}]});assert.deepEqual(r.values,iterations%2?{a:[1,2],b:[7,9]}:{a:[7,9],b:[1,2]});
 }
 const r=await engine.pipeline({inputs:{xs:[0,1,2,3]},steps:[{id:'f',call:'filter',args:[{input:'xs'}]},{id:'i',call:'inc',args:[{step:'f'}]}],feedback:{xs:'i'},iterations:3,outputs:['i']},{placements:[{end:1,backend:'cpu'},{end:2,backend:'gpu'}]});
 assert.deepEqual(r.values.i,[]);await engine.close();
}));
test('failed workers and GPU replay only their pure segments on CPU',async()=>fixture(async(load,trace)=>{
 const engine=await load({parallelism:2}),r=await engine.pipeline(chain([1,2]),{placements:[{end:1,backend:'javascript-worker'},{end:3,backend:'gpu'}]});
 assert.deepEqual(r.values,{b:[4,6],total:10});assert.equal(r.backend,'cpu');assert.equal(trace.cpu,3);assert.match(r.stages[0].reason,/fallback/);assert.match(r.stages[1].reason,/fallback/);await engine.close();
},{workerFailure:true,gpuFailure:true}));
test('malformed placements fail before execution and close drains in-flight workers',async()=>fixture(async(load,trace)=>{
 const engine=await load({parallelism:1});
 for(const placements of [[],[{end:2,backend:'bad'}],[{end:1,backend:'cpu'}],[{end:3,backend:'cpu'},{end:2,backend:'gpu'}]])await assert.rejects(engine.pipeline(chain([1]),{placements}),/placement/);
 assert.equal(trace.cpu,0);assert.equal(trace.gpu,0);
 const pending=engine.pipeline(chain([1]),{placements:[{end:3,backend:'javascript-worker'}]}),closed=engine.close();assert.deepEqual((await pending).values,{b:[4],total:4});await closed;
 await assert.rejects(engine.pipeline(chain([1])),/closed/);
}));

test('malformed physical proposals cannot omit, duplicate, reorder or invent source stages',async()=>{
 for(const segments of [[{start:1,end:3,backend:'javascript'}],[{start:0,end:2,backend:'javascript'}],[{start:0,end:2,backend:'javascript'},{start:1,end:3,backend:'gpu'}],[{start:0,end:3,backend:'invented'}]])await fixture(async(load,trace)=>{
  const e=await load({placementProfile:{schema:1,target_key:'test',models:{}},targetKey:'test'}),r=await e.pipeline(chain([1,2]));assert.deepEqual(r.values,{b:[4,6],total:10});assert.equal(r.backend,'cpu');assert.match(r.reason,/invalid physical proposal/);assert.equal(trace.gpu,0);assert.equal(trace.workers,0);await e.close();
 },{plannerSelection:{segments}});
});
