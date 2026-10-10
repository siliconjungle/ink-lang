// CPU and GPU prior/current use separate checked same-store policy selections.
// Shared Node and browser protocol. Timers include host capture, Wasm input
// copies, scheduling, result conversion, and GPU upload/dispatch/readback.
import * as literal from './literal.mjs';
import {createExpert} from './expert.mjs';
const require = (condition, message) => { if (!condition) throw Error(message); };
function gpuEvidence(r,input,caseName){
 if(r.backend!=='gpu')return;
 const c=r.counters,n=input.xs.length,contract=r.counter_contract;let expected;
 if(contract.schema===2)expected={dispatches:1,upload_bytes:n*4+24,readback_bytes:(Array.isArray(input.expected[caseName])?input.expected[caseName].length:1)*4};
 else{
   let dispatches=contract.stages.reduce((s,x)=>s+(x.kind==='map'?1:3),0),cap=Math.max(1,n);
   if(contract.aggregate==='count')dispatches++;else do{dispatches++;cap=Math.ceil(cap/256);}while(cap>1);
   expected={dispatches,upload_bytes:n*4+4+4*contract.parameters,readback_bytes:4};
 }
 for(const key of Object.keys(expected))require(c&&c[key]===expected[key],`GPU actual ${key}: ${c?.[key]} vs ${expected[key]}`);
}
const clock = () => performance.now();
function random(seed) { let x = seed >>> 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; }; }
function shuffle(xs, rng) { xs = [...xs]; for(let i=xs.length-1;i>0;i--) {const j=rng()%(i+1); [xs[i],xs[j]]=[xs[j],xs[i]];} return xs; }
const list=value=>Array.isArray(value)||(ArrayBuffer.isView(value)&&typeof value.length==='number');
function observation(value) {
  if(!list(value))return {single:String(value),code:BigInt(value)};
  let sum=0,weighted=0;
  for(let i=0;i<value.length;i++){sum=(sum+value[i])>>>0;weighted=(weighted+Math.imul(value[i],i+1))>>>0;}
  return {single:`array:${value.length}:${sum}:${weighted}`,code:BigInt.asUintN(64,BigInt(sum)+(BigInt(weighted)<<32n)+BigInt(value.length))};
}
export async function runBenchmark(base, { browser=false, validateOnly=false, progress=()=>{} }={}) {
  const config = await (await fetch(new URL('fixtures.json', base))).json();
  const spec = await (await fetch(new URL('spec.json',base))).json();
  const cases=config.cases, tasks=Object.fromEntries(spec.tasks.map(t=>[t.name,t]));
  const start = clock(), startup = {}, variants = {}, engines = {}, gpuEngines = {};
  const inputs=config.inputs.map(x=>({...x,xs:new Uint32Array(x.xs),ys:new Uint32Array(x.ys),originalWords:x.xs,originalSecond:x.ys}));
  const maxSize=Math.max(2,...inputs.flatMap(x=>[x.xs.length,x.ys.length])), expert=createExpert(maxSize);
  const capturedArgs=(task,args)=>args.map((v,i)=>i<task.list_inputs.length?v.slice():v);
  const fullArgs=(input)=>[input.xs,input.ys,input.seed,input.factor];
  const inkArgs=(task,args)=>task.list_inputs.length===2?args:[args[0],args[2],args[3]];
  for(const kind of ['baseline','prior','checked']) {
    engines[kind]={};gpuEngines[kind]={};const direct={};const t=clock();
    for(const name of cases){
      const url=new URL(`${kind}/${name}/`,base),{loadInk}=await import(new URL('ink-gpu.mjs',url));
      engines[kind][name]=await loadInk(url,{gpu:false});
      if(browser){const gpuUrl=new URL(`${kind==='baseline'?kind:'gpu-'+kind}/${name}/`,base),gpuHost=await import(new URL('ink-gpu.mjs',gpuUrl));gpuEngines[kind][name]=await gpuHost.loadInk(gpuUrl,{gpu:true});}
      direct[name]=await import(new URL('program.mjs',url));
      require(direct[name].metadata.abi==='ink-javascript-trusted-values-v2','trusted generated JS required');
    }
    startup[kind]=clock()-t;
    for(const backend of ['javascript','cpu',...(browser?['gpu']:[])]){
      const label=backend==='cpu'?'wasm':backend==='javascript'?'js':'gpu';
      variants[`ink_${kind}_${label}`]={backend,memory:backend==='cpu'?(name)=>engines[kind][name].benchmarkMemoryBytes():null,
        run(name,args){const task=tasks[name],engine=(backend==='gpu'?gpuEngines:engines)[kind][name];let actual=inkArgs(task,args);
          if(backend==='javascript')actual=capturedArgs(task,actual);
          const result=engine.manifest.schema===2?engine.call(name,actual,{backend}):engine.run(name,actual,backend);
          if(backend!=='gpu')return result;
          const f=engine.manifest.functions.find(f=>f.name===name);return Promise.resolve(result).then(r=>r.backend==='gpu'?{...r,counter_contract:engine.manifest.schema===2?{schema:2}:{schema:1,stages:f.gpu?.stages,aggregate:f.gpu?.aggregate,parameters:actual.length}}:r);
        }};
    }
    if(kind==='checked')variants.ink_checked_borrowed_js={backend:'javascript',memory:null,
      async run(name,args){return {value:direct[name].functions[name](...inkArgs(tasks[name],args)),backend:'javascript'};}};
  }
  const rustEngines=[];
  for(const mode of ['literal','expert']){
    const variant=`rust_${mode}_wasm`,t=clock();
    const {instance:rust}=await WebAssembly.instantiate(await(await fetch(new URL(`rust-${mode}.wasm`,base))).arrayBuffer(),{});
    const xp=rust.exports.bench_alloc(maxSize),yp=rust.exports.bench_alloc(maxSize),out=rust.exports.bench_alloc(maxSize);
    rustEngines.push({rust,xp,yp,out});startup[variant]=clock()-t;
    variants[variant]={backend:'rust-wasm',memory:()=>rust.exports.memory.buffer.byteLength,
      async run(name,args){const task=tasks[name],xs=args[0].slice(),ys=task.list_inputs.length===2?args[1].slice():args[1];
        new Uint32Array(rust.exports.memory.buffer,xp,xs.length).set(xs);if(task.list_inputs.length===2)new Uint32Array(rust.exports.memory.buffer,yp,ys.length).set(ys);
        const n=rust.exports.bench_eval(task.index,xp,xs.length,yp,ys.length,args[2],args[3],out),values=new Uint32Array(rust.exports.memory.buffer,out,n);
        require(n===(task.output_kind==='list_u32'?xs.length:task.scalar_words),'Rust result ABI');
        return {value:task.output_kind==='u64'?BigInt(values[0])+(BigInt(values[1])<<32n):task.scalar?values[0]:Array.from(values),backend:'rust-wasm'};
      }};
  }
  const closeRust=()=>{for(const {rust,xp,yp,out} of rustEngines){for(const p of [xp,yp,out])rust.exports.bench_free(p,maxSize);}};
  for(const mode of ['literal','expert']){
    const control=mode==='literal'?literal:expert;
    variants[`js_${mode}`]={backend:'javascript',memory:null,async run(name,args){const task=tasks[name],captured=[args[0].slice(),task.list_inputs.length===2?args[1].slice():args[1],args[2],args[3]];return {value:control.call(name,captured),backend:'javascript'};}};
  }
  variants.js_expert_borrowed={backend:'javascript',memory:null,async run(name,args){return {value:expert.call(name,args),backend:'javascript'};}};
  const result={schema:1,status:'running',host:browser?navigator.userAgent:globalThis.process.version,
    browser,webgpu:browser&&!!navigator.gpu,parameters:config.parameters,startup_ms:startup,
    validation:{comparisons:0,fixtures:config.inputs.length,oracle:'independent Python word-ring and exact ordered state oracle, modulo 2^32'},
    first_validation_call_ms:{},
    samples:[],warmups:[],calibration:[],availability:[],peak_linear_memory_bytes:{},scope:config.scope};
  if(browser&&navigator.gpu) {
    try {const adapter=await navigator.gpu.requestAdapter();result.gpu_adapter=adapter?{...Object.fromEntries(['vendor','architecture','device','description'].map(k=>[k,adapter.info?.[k]??null])),features:[...adapter.features]}:null;}
    catch(error){result.gpu_adapter_error=String(error);}
  }
  const expected=(input,name)=>observation(input.expected[name]);
  function check(r,input,name,variant,allowFallback=false) {
    gpuEvidence(r,input,name);
    const golden=input.expected[name];
    const correct=Array.isArray(golden)?list(r.value)&&r.value.length===golden.length&&r.value.every((v,i)=>v===golden[i]):String(r.value)===String(golden);
    require(correct,`${variant}/${name}/${input.id}: oracle mismatch`);
    require(input.xs.length===input.originalWords.length&&input.xs.every((v,i)=>v===input.originalWords[i])&&input.ys.length===input.originalSecond.length&&input.ys.every((v,i)=>v===input.originalSecond[i]),`${variant}/${name}/${input.id}: source input mutated`);
    if(!allowFallback)require(r.backend===variants[variant].backend,`${variant}: unexpected backend ${r.backend}: ${r.reason}`);
    if(variants[variant].memory)result.peak_linear_memory_bytes[variant]=Math.max(result.peak_linear_memory_bytes[variant]??0,variants[variant].memory(name));
  }
  // Validation before timing, including boundary words and empty vectors. GPU
  // validation below uses every measured cell, avoiding repeated shader setup.
  for(const input of inputs)for(const name of Object.keys(input.expected))for(const [v,entry] of Object.entries(variants)) {
    if(entry.backend==='gpu')continue;
    const t=clock(),r=await entry.run(name,fullArgs(input));
    if(!(v in result.first_validation_call_ms))result.first_validation_call_ms[v]=clock()-t;
    check(r,input,name,v); result.validation.comparisons++;
  }
  if(validateOnly) {
    result.status='validation-passed';
    closeRust();
    for(const byTask of Object.values({...engines,...Object.fromEntries(Object.entries(gpuEngines).map(([k,v])=>['gpu-'+k,v]))}))for(const engine of Object.values(byTask))await engine.close();
    return result;
  }
  const rng=random(config.parameters.seed);
  for(const cell of config.cells) {
    const input=inputs[cell.input], name=cell.case, args=fullArgs(input);
    const eligible=[];
    for(const [v,entry] of Object.entries(variants)) {
      const t=clock(), r=await entry.run(name,args), ms=clock()-t;
      check(r,input,name,v,entry.backend==='gpu'); result.validation.comparisons++;
      if(browser&&entry.backend==='gpu'&&(gpuEngines[v.split('_')[1]][name].manifest.functions.find(f=>f.name===name)?.shader||gpuEngines[v.split('_')[1]][name].manifest.functions.find(f=>f.name===name)?.gpu)) {
        require(r.backend==='gpu',`eligible shader must execute on GPU for ${v}/${name}/${input.id}: ${r.reason}`);
      }
      result.availability.push({case:name,input:input.id,variant:v,actual_backend:r.backend,reason:r.reason??r.fallback_reason??null,first_call_ms:ms,counters:r.counters??null});
      if(entry.backend!=='gpu'||r.backend==='gpu')eligible.push(v);
    }
    async function sample(v,iterations) {
      const entry=variants[v]; let checksum=0n; const counters={dispatches:0,upload_bytes:0,readback_bytes:0}; const t=clock();
      for(let i=0;i<iterations;i++) {
        const r=await entry.run(name,args); // boundary promises are identical across rounds
        if(r.backend!==entry.backend)throw Error(`${v}/${name}: backend changed during timing: ${r.reason}`);
        if(entry.backend==='gpu'){gpuEvidence(r,input,name);for(const key of Object.keys(counters))counters[key]+=r.counters[key];}
        checksum=BigInt.asUintN(64,checksum+observation(r.value).code);
      }
      const elapsed=clock()-t;
      require(checksum===BigInt.asUintN(64,expected(input,name).code*BigInt(iterations)),`checksum ${v}/${name}`);
      return {case:name,input:input.id,variant:v,iterations,seconds:elapsed/1000,
        ns_per_call:elapsed*1e6/iterations,checksum:String(checksum),single:expected(input,name).single,
        linear_memory_bytes:entry.memory?entry.memory(name):null,gpu_counters:entry.backend==='gpu'?counters:null};
    }
    const iterations={};
    for(const v of shuffle(eligible,rng)) {
      let n=1, r;
      do {r=await sample(v,n);if(r.seconds*1000>=config.parameters.seconds*1000/3||n>=1000000)break;n*=4;}while(true);
      iterations[v]=Math.max(1,Math.min(1000000,Math.ceil(config.parameters.seconds/(r.seconds/r.iterations))));
      result.calibration.push(r);
    }
    for(let w=0;w<config.parameters.warmup;w++)for(const v of shuffle(eligible,rng))result.warmups.push({...await sample(v,iterations[v]),warmup:w});
    for(let round=0;round<config.parameters.repeats;round++)for(const v of shuffle(eligible,rng)) {
      const r=await sample(v,iterations[v]);result.samples.push({...r,round});
      if(r.linear_memory_bytes!==null)result.peak_linear_memory_bytes[v]=Math.max(result.peak_linear_memory_bytes[v]??0,r.linear_memory_bytes);
    }
    progress(`${name}: ${input.id} (${eligible.length} variants)`);
  }
  result.status='passed';result.elapsed_seconds=(clock()-start)/1000;
  closeRust(); for(const byTask of Object.values({...engines,...Object.fromEntries(Object.entries(gpuEngines).map(([k,v])=>['gpu-'+k,v]))}))for(const engine of Object.values(byTask))await engine.close();
  return result;
}
