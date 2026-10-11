// Same frozen emitter, checked proof alternatives. Distinct boundaries remain
// distinct cohorts; resident transport setup is never counted as a full call.
import {expert} from './expert.mjs';
const need=(x,m)=>{if(!x)throw Error(m)};
const list=x=>Array.isArray(x)||(ArrayBuffer.isView(x)&&typeof x.length==='number');
const equal=(a,b)=>Array.isArray(b)?list(a)&&a.length===b.length&&b.every((v,i)=>a[i]===v):String(a)===String(b);
const random=s=>()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return s>>>0};
function shuffle(a,r){a=[...a];for(let i=a.length-1;i;i--){const j=r()%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
const json=async u=>{const r=await fetch(u);need(r.ok,'fetch '+u);return r.json()};
async function sha(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function contract(f,args,expected){
 const words=args.reduce((s,a)=>s+(ArrayBuffer.isView(a)?a.length:1),0),lists=f.params.filter(p=>p.type.kind==='list').length,output=Array.isArray(expected)?expected.length:f.result.kind==='u64'?2:1;
 if(f.graph_required)return {dispatches:f.graph.nodes.length,upload_bytes:4*(words+lists),readback_bytes:4*(output+(Array.isArray(expected)?1:0))};
 need(f.shader,'GPU missing emitted shader');
 const counts=args.map(a=>ArrayBuffer.isView(a)?a.length:1),capacity=Math.max(0,...f.lengths.map(i=>counts[i]));
 return {dispatches:capacity?1:0,upload_bytes:4*(words+lists+f.params.length+1),readback_bytes:4*(capacity+1)};
}
export async function run(base,{browser=false,validateOnly=false,tasks=null,progress=()=>{}}={}){
 const response=await fetch(new URL('metadata.json',base)),bytes=await response.arrayBuffer(),meta=JSON.parse(new TextDecoder().decode(bytes));
 for(const [p,h]of Object.entries(meta.bindings)){const r=await fetch(new URL(p,base));need(r.ok&&await sha(await r.arrayBuffer())===h,'frozen drift '+p)}
 const spec=await json(new URL('spec.json',base)),fixtures=await json(new URL('fixtures.json',base)),selected=tasks===null?spec.tasks:spec.tasks.filter(t=>tasks.includes(t.name));
 if(!validateOnly){const gate=await json(new URL('serial-gate.json',base));need(gate.authorized===true&&gate.metadata_sha256===await sha(bytes),'timing requires bound serial gate')}
 if(tasks!==null)need(selected.length===tasks.length,'unknown requested task');
 const out={status:'running',validate_only:validateOnly,metadata_sha256:await sha(bytes),host:browser?navigator.userAgent:process.version,selected_tasks:selected.map(t=>t.name),protocol:meta.protocol,startup:[],validation:[],availability:[],unsupported:[],warmups:[],calibration:[],samples:[],complete_output_checks:0};
 const rng=random(meta.protocol.seed);let observable=0;
 const max=Math.max(2,...fixtures.frames.map(f=>f.xs.length+f.ys.length)),{instance:{exports:rust}}=await WebAssembly.instantiate(await(await fetch(new URL('rust-expert.wasm',base))).arrayBuffer(),{});
 const xp=rust.bench_alloc(max),yp=rust.bench_alloc(max),op=rust.bench_alloc(max);
 for(const t of selected){
  const variantsByCore={},engines={};
  for(const version of ['baseline','candidate']){
   const url=new URL(`targets/${t.name}/${version}/`,base),start=performance.now();
   const direct=await import(new URL('program.mjs',url)),{loadInk}=await import(new URL('ink-gpu.mjs',url));
   engines[version]=await loadInk(url,{gpu:browser});const {graphCapacity}=await import(new URL('ink-device.mjs',url));variantsByCore[version]={direct,url,graphCapacity,fn:engines[version].manifest.functions.find(f=>f.name===t.name)};
   need(variantsByCore[version].fn&&engines[version].manifest.schema===2,'schema2 ABI required');out.startup.push({name:t.name,version,load_ms:performance.now()-start});
  }
  try{for(const f of fixtures.frames.filter(f=>f.task===t.name)){
   const xs=Uint32Array.from(f.xs),ys=Uint32Array.from(f.ys),args=t.list_inputs===2?[xs,ys,f.seed,f.k]:[xs,f.seed,f.k],capture=()=>args.map(a=>ArrayBuffer.isView(a)?a.slice():a),expected=f.expected;
   const variants={},prepared=[],captures={},setup=[];
   for(const version of ['baseline','candidate']){
    const e=engines[version],d=variantsByCore[version];
    variants[version+'_js_owned']={boundary:t.output_kind==='list_u32'?'captured-js-owned':'captured-js-value',run:()=>{const a=capture();captures[version+'_js_owned']=a;return d.direct.functions[t.name](...a)}};
    variants[version+'_wasm_full']={boundary:t.output_kind==='list_u32'?'captured-wasm-owned':'captured-wasm-value',async:true,run:async()=> (await e.call(t.name,args,{backend:'cpu'})).value,memory:()=>e.benchmarkMemoryBytes()};
    {
     const start=performance.now(),{instance:{exports:cpu}}=await WebAssembly.instantiate(await(await fetch(new URL('cpu.wasm',d.url))).arrayBuffer(),{}),{createPackedCall}=await import(new URL('prepared-wasm.mjs',d.url));
     let p;
     if(t.output_kind==='list_u32')p=createPackedCall(cpu,d.fn.index,args.map(a=>ArrayBuffer.isView(a)?{words:a,count:a.length}:{words:Uint32Array.of(a),count:1}),Math.max(1,xs.length+ys.length));
     else {cpu.ink_compute_reset();const ptrs=cpu.ink_alloc(args.length,4),lengths=cpu.ink_alloc(args.length,4);for(let i=0;i<args.length;i++){const a=args[i],words=ArrayBuffer.isView(a)?a:Uint32Array.of(a),ptr=cpu.ink_alloc(Math.max(1,words.length),4);new Uint32Array(cpu.memory.buffer,ptr,words.length).set(words);const view=new DataView(cpu.memory.buffer);view.setUint32(ptrs+4*i,ptr,true);view.setUint32(lengths+4*i,ArrayBuffer.isView(a)?a.length:1,true)}const mark=cpu.ink_compute_mark();p={run(){try{return d.fn.result.kind==='u64'?BigInt.asUintN(64,cpu.ink_compute_scalar64(d.fn.index,ptrs,lengths)):cpu.ink_compute_scalar32(d.fn.index,ptrs,lengths)>>>0}finally{cpu.ink_compute_rewind(mark)}},close(){cpu.ink_compute_reset()}};}
     prepared.push(p);setup.push({version,milliseconds:performance.now()-start,memory_bytes:cpu.memory.buffer.byteLength});
     variants[version+'_wasm_prepared']={boundary:t.output_kind==='list_u32'?'resident-wasm-destination':'resident-wasm-scalar',run:()=>p.run(),memory:()=>cpu.memory.buffer.byteLength};
    }
    if(browser)variants[version+'_gpu_requested']={boundary:'instrumented-full-gpu-request',async:true,gpu:true,run:()=>e.call(t.name,args,{backend:'gpu'})};
    if(browser){
     if(typeof e.prepareGpuPipeline==='function'&&(d.fn.shader||d.fn.graph_required)){
      const start=performance.now(),session=await e.prepareGpuPipeline({steps:[{id:'result',call:t.name,args}],outputs:['result'],iterations:1});
      need(session&&typeof session.run==='function'&&typeof session.close==='function','real GPU session API');prepared.push(session);
      setup.push({version,boundary:'resident-gpu-input-owned-readback',milliseconds:performance.now()-start,counters:session.setup??null});
      variants[version+'_gpu_resident']={boundary:'resident-gpu-input-owned-readback',async:true,gpu:true,resident:true,run:async()=>{const r=await session.run();return {...r,value:r.value??r.values?.result}}};
     }else out.unsupported.push({name:t.name,frame:f.id,version,path:'resident-gpu-input-owned-readback',reason:typeof e.prepareGpuPipeline!=='function'?'prepared device session API absent':'no eligible emitted GPU route'});
    }

   }
   variants.expert_js_owned={boundary:t.output_kind==='list_u32'?'captured-js-owned':'captured-js-value',run:()=>{const a=capture();captures.expert_js_owned=a;return expert[t.name](...a)}};
   const index=spec.tasks.findIndex(x=>x.name===t.name),ingress=(copied)=>{const a=copied?capture():args;new Uint32Array(rust.memory.buffer,xp,xs.length).set(a[0]);if(t.list_inputs===2)new Uint32Array(rust.memory.buffer,yp,ys.length).set(a[1])};
   const rustRun=()=>{if(t.output_kind!=='list_u32')return rust.bench_eval_scalar32(index,xp,xs.length,yp,ys.length,f.seed,f.k)>>>0;const count=rust.bench_eval(index,xp,xs.length,yp,ys.length,f.seed,f.k,op);return new Uint32Array(rust.memory.buffer,op,count)};
   ingress(false);variants.rust_wasm_prepared={boundary:t.output_kind==='list_u32'?'resident-wasm-destination':'resident-wasm-scalar',run:rustRun,memory:()=>rust.memory.buffer.byteLength};
   variants.rust_wasm_full={boundary:t.output_kind==='list_u32'?'captured-wasm-owned':'captured-wasm-value',run:()=>{ingress(true);const value=rustRun();return t.output_kind==='list_u32'?Array.from(value):value},memory:()=>rust.memory.buffer.byteLength};
   const unchanged=()=>{need(equal(xs,f.xs)&&equal(ys,f.ys),f.id+' input mutation');for(const a of Object.values(captures))need(a.every((x,i)=>!ArrayBuffer.isView(x)||equal(x,args[i])),f.id+' capture mutation')};
   const contracts={},actual={},capacities={};for(const [version,d]of Object.entries(variantsByCore))capacities[version]=d.fn.graph_required?d.graphCapacity(d.fn.graph,args.map(a=>ArrayBuffer.isView(a)?a.length:1)):null;
   function check(value,v){let result=value;if(variants[v].gpu){result=value.value;actual[v]=value.backend;if(value.backend==='gpu'){contracts[v]??=contract(variantsByCore[v.split('_')[0]].fn,args,expected);if(variants[v].resident)contracts[v].upload_bytes=0;for(const[k,n]of Object.entries(contracts[v]))need(value.counters[k]===n,`${f.id}/${v}/${k}`)}else need(['cpu','javascript'].includes(value.backend),'unknown fallback')}
    need(equal(result,expected),`${f.id}/${v} complete output`);unchanged();out.complete_output_checks++;return result;
   }
   for(const[v,x]of Object.entries(variants)){
    let residentInputCapture=null;
    if(x.resident){const oldX=xs[0],oldY=ys[0],oldSeed=args[args.length-2];try{if(xs.length)xs[0]=(oldX^0xffffffff)>>>0;if(ys.length)ys[0]=(oldY^0xffffffff)>>>0;args[args.length-2]=(oldSeed^0x80000000)>>>0;const captured=await x.run();need(equal(captured.value,expected)&&captured.backend==='gpu'&&captured.counters.upload_bytes===0,'resident input capture/residency');residentInputCapture=true;}finally{if(xs.length)xs[0]=oldX;if(ys.length)ys[0]=oldY;args[args.length-2]=oldSeed}}
    const start=performance.now(),a=await x.run(),va=check(a,v),saved=list(va)?Array.from(va):va,b=await x.run();check(b,v);need(equal(va,saved),'first output invalidated');
    let changedInputLifetime=null;
    if(!v.endsWith('_wasm_prepared')){
     const alt=args.map(a=>ArrayBuffer.isView(a)?(a.length?Uint32Array.from(a,x=>(x^0xa5a5a5a5)>>>0):Uint32Array.of(1)):a);alt[alt.length-2]=(f.seed^0x40000000)>>>0;
     const altGolden=expert[t.name](...alt);let changed;
     if(v.endsWith('_js_owned'))changed=v==='expert_js_owned'?expert[t.name](...alt):variantsByCore[v.split('_')[0]].direct.functions[t.name](...alt);
     else if(v==='rust_wasm_full'){new Uint32Array(rust.memory.buffer,xp,alt[0].length).set(alt[0]);if(t.list_inputs===2)new Uint32Array(rust.memory.buffer,yp,alt[1].length).set(alt[1]);const count=rust.bench_eval(index,xp,alt[0].length,yp,t.list_inputs===2?alt[1].length:0,alt[alt.length-2],alt[alt.length-1],op);changed=t.output_kind==='list_u32'?Array.from(new Uint32Array(rust.memory.buffer,op,count)):new Uint32Array(rust.memory.buffer,op,1)[0];ingress(false)}
     else if(x.resident){const altSession=await engines[v.split('_')[0]].prepareGpuPipeline({steps:[{id:'result',call:t.name,args:alt}],outputs:['result'],iterations:1});try{const r=await altSession.run();changed=r.value??r.values?.result}finally{await altSession.close()}}
     else {const version=v.split('_')[0],result=await engines[version].call(t.name,alt,{backend:v.endsWith('_gpu_requested')?'gpu':'cpu'});changed=result.value}
     need(equal(changed,altGolden)&&equal(va,saved),f.id+'/'+v+' changed-input owned lifetime');changedInputLifetime=true;out.complete_output_checks++;
    }
    out.validation.push({name:t.name,frame:f.id,variant:v,passed:true,nonmutation:true,resident_input_capture:residentInputCapture,changed_input_lifetime:changedInputLifetime,output_lifetime:t.output_kind!=='list_u32'?'scalar-value':x.boundary==='resident-wasm-destination'?'borrowed-until-next-run':'owned',first_call_ms:performance.now()-start,setup});
    if(x.gpu)out.availability.push({name:t.name,frame:f.id,variant:v,actual_backend:actual[v],reason:a.reason??a.fallback_reason??null,counters:a.counters??null,contract:contracts[v]??null,stage_capacity_model:capacities[v.split('_')[0]],capacity_scope:'Emitted graph bounds, not allocation savings; actual device live_buffer_bytes is recorded independently'});
   }
   if(!validateOnly&&f.timed){progress(f.id);const iterations={};
    async function batch(v,n,calibrating){const x=variants[v],memoryBefore=x.memory?.(),observableBefore=observable,counts={},totals={dispatches:0,upload_bytes:0,readback_bytes:0};let value,liveBytes=null;
     const consume=value=>{const a=x.gpu?value.value:value;let code;if(Array.isArray(expected)){code=a.length>>>0;for(let i=0;i<a.length;i++)code=(code+Math.imul((i+1)>>>0,a[i]))>>>0}else code=Number(a)>>>0;observable=(observable+code)>>>0};
     const account=value=>{if(x.gpu){counts[value.backend]=(counts[value.backend]??0)+1;if(value.backend==='gpu'){need(Number.isSafeInteger(value.counters.live_buffer_bytes)&&value.counters.live_buffer_bytes>=0,'GPU live memory accounting');liveBytes=Math.max(liveBytes??0,value.counters.live_buffer_bytes);for(const[k,c]of Object.entries(contracts[v]))need(value.counters[k]===c,'GPU call counter changed');for(const k of Object.keys(totals))totals[k]+=value.counters[k]}}};
     const start=performance.now();if(x.async){for(let i=0;i<n;i++){value=await x.run();consume(value);account(value)}}else{for(let i=0;i<n;i++){value=x.run();consume(value)}}
     const elapsed=performance.now()-start;need(Number.isFinite(elapsed)&&(calibrating?elapsed>=0:elapsed>0),'invalid elapsed');check(value,v);
     return {iterations:n,elapsed_ms:elapsed,ns_per_call:elapsed*1e6/n,checksum:String((observable-observableBefore)>>>0),checksum_semantics:'length + sum((index+1)*word) modulo2^32; every returned vector word read inside timer',consumed_elements_per_call:Array.isArray(expected)?expected.length:1,consumed_elements:(Array.isArray(expected)?expected.length:1)*n,memory_before:memoryBefore??null,memory_after:x.memory?.()??null,...(x.gpu?{actual_backend_counts:counts,counters_total:totals,gpu_live_buffer_bytes_max:liveBytes,contract:contracts[v]??null,stage_capacity_model:capacities[v.split('_')[0]]}:{})};
    }
    for(const[v,x]of Object.entries(variants)){for(let i=0;i<2;i++){check(await x.run(),v);out.warmups.push({name:t.name,frame:f.id,variant:v,iteration:i,passed:true})}let n=1,row;for(;;){row=await batch(v,n,true);out.calibration.push({name:t.name,frame:f.id,variant:v,...row});if(row.elapsed_ms>=meta.protocol.target_ms||n===meta.protocol.max_iterations)break;n*=2}iterations[v]=n}
    for(let round=0;round<meta.protocol.rounds;round++)for(const v of shuffle(Object.keys(variants),rng)){check(await variants[v].run(),v);const row=await batch(v,iterations[v],false);check(await variants[v].run(),v);out.samples.push({name:t.name,frame:f.id,size:xs.length,mode:f.mode,split:f.split,dimensions:f.dimensions,acceptance:f.acceptance,input_shape:f.input_shape,algorithmic_work:f.algorithmic_work,variant:v,boundary:variants[v].boundary,round,...row})}
   }
   for(const p of prepared)await p.close();
  }}finally{for(const e of Object.values(engines))await e.close()}
 }
 for(const ptr of [xp,yp,op])rust.bench_free(ptr,max);out.observable=observable;out.status='passed';return out;
}
