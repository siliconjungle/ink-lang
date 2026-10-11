// Shared Node and browser protocol. Timers include host capture, Wasm input
// copies, scheduling, result conversion, and GPU upload/dispatch/readback.
import * as literal from './literal.mjs';
export const cases = ['geometric_prefix8', 'geometric_prefix16', 'geometric_prefix32', 'bounded_right_prefix', 'bounded_mapped_right', 'bounded_mapped_product'];
const scalarCases=new Set();
const require = (condition, message) => { if (!condition) throw Error(message); };
function gpuEvidence(r,input,caseName){
 if(r.backend!=='gpu')return;
 const c=r.counters,output=input.expected[caseName];
 require(input.xs.length>0,'nonempty GPU case required');
 require(c&&c.dispatches===1,'GPU must report one actual dispatch');
 require(c.upload_bytes===input.xs.length*4+24,'GPU upload must include input, two scalars and length metadata');
 require(c.readback_bytes===(Array.isArray(output)?output.length:1)*4,'GPU readback must match consumed U32 result');
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
  const start = clock(), startup = {}, variants = {}, engines = {};
  const inputs = config.inputs.map(x=>({...x, xs:new Uint32Array(x.xs), originalWords:x.xs}));
  for(const kind of ['baseline','prior','checked']) {
    const url=new URL(`${kind}/`,base), t=clock();
    const {loadInk}=await import(new URL('ink-gpu.mjs',url));
    const engine=await loadInk(url,{gpu:browser});
    require([1,2].includes(engine.manifest.schema),'expected word bundle'); engines[kind]=engine;
    startup[kind]=clock()-t;
    for(const backend of ['javascript','cpu',...(browser?['gpu']:[])]) {
      const name=`ink_${kind}_${backend==='cpu'?'wasm':backend==='javascript'?'js':'gpu'}`;
      variants[name]={backend, engine, memory:backend==='cpu'?()=>engine.benchmarkMemoryBytes():null,
        run:(name,args)=>{
          // Trusted explicit JS borrows values. The common driver supplies the
          // same single snapshot paid by handwritten and direct controls.
          const captured=backend==='javascript'&&engine.manifest.javascript?.abi==='ink-javascript-trusted-values-v2'?[args[0].slice(),...args.slice(1)]:args;
          return engine.manifest.schema===2?engine.call(name,captured,{backend}):engine.run(name,captured,backend);
        }};
    }
    const program=await import(new URL('program.mjs',url));
    require(program.metadata.abi==='ink-javascript-trusted-values-v2','trusted generated JS required');
    variants[`ink_${kind}_direct_js`]={backend:'javascript',memory:null,
      async run(name,args){return {value:program.functions[name](args[0].slice(),...args.slice(1)),backend:'javascript'};}};
  }
  const maxSize=Math.max(...inputs.map(x=>x.xs.length)), rustEngines=[];
  for(const [variant,artifact] of [['rust_literal_wasm','rust-literal.wasm']]) {
  const wasmStart=clock();
  const {instance:rust}=await WebAssembly.instantiate(await(await fetch(new URL(artifact,base))).arrayBuffer(),{});
  const rustPtr=rust.exports.bench_alloc(maxSize),rustOut=rust.exports.bench_alloc(maxSize);
  rustEngines.push({rust,rustPtr,rustOut}); startup[variant]=clock()-wasmStart;
  variants[variant]={backend:'rust-wasm', memory:()=>rust.exports.memory.buffer.byteLength,
    async run(name,args) {
      // Match Ink's captured typed input and host-to-Wasm copy. Resident input
      // allocation, module/JIT startup and shader preparation are separate.
      const [original,seed,factor]=args, xs=original.slice();
      new Uint32Array(rust.exports.memory.buffer,rustPtr,xs.length).set(xs);
      const n=rust.exports.bench_map(cases.indexOf(name),rustPtr,xs.length,seed,factor,rustOut);
      const output=new Uint32Array(rust.exports.memory.buffer,rustOut,n);
      return {value:scalarCases.has(name)?output[0]:Array.from(output),backend:'rust-wasm'};
    }};
  }
  const closeRust=()=>{for(const {rust,rustPtr,rustOut} of rustEngines){rust.exports.bench_free(rustPtr,maxSize);rust.exports.bench_free(rustOut,maxSize);}};
  variants.js_literal={backend:'javascript',memory:null,
    async run(name,args){return {value:literal.call(name,[args[0].slice(),args[1],args[2]]),backend:'javascript'};}};
  const result={schema:1,status:'running',host:browser?navigator.userAgent:globalThis.process.version,
    browser,webgpu:browser&&!!navigator.gpu,parameters:config.parameters,startup_ms:startup,
    validation:{comparisons:0,fixtures:config.inputs.length,oracle:'independent Python, modulo 2^32'},
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
    require(input.xs.length===input.originalWords.length&&input.xs.every((v,i)=>v===input.originalWords[i]),`${variant}/${name}/${input.id}: source input mutated`);
    if(!allowFallback)require(r.backend===variants[variant].backend,`${variant}: unexpected backend ${r.backend}: ${r.reason}`);
    if(variants[variant].memory)result.peak_linear_memory_bytes[variant]=Math.max(result.peak_linear_memory_bytes[variant]??0,variants[variant].memory());
  }
  // Validation before timing, including boundary words and empty vectors. GPU
  // validation below uses every measured cell, avoiding repeated shader setup.
  for(const input of inputs)for(const name of config.cases)for(const [v,entry] of Object.entries(variants)) {
    if(entry.backend==='gpu')continue;
    const t=clock(),r=await entry.run(name,[input.xs,input.seed,input.factor]);
    if(!(v in result.first_validation_call_ms))result.first_validation_call_ms[v]=clock()-t;
    check(r,input,name,v); result.validation.comparisons++;
  }
  if(validateOnly) {
    result.status='validation-passed';
    closeRust();
    for(const engine of Object.values(engines))await engine.close();
    return result;
  }
  const rng=random(config.parameters.seed);
  for(const cell of config.cells) {
    const input=inputs[cell.input], name=cell.case, args=[input.xs,input.seed,input.factor];
    const eligible=[];
    for(const [v,entry] of Object.entries(variants)) {
      const t=clock(), r=await entry.run(name,args), ms=clock()-t;
      check(r,input,name,v,entry.backend==='gpu'); result.validation.comparisons++;
      if(browser&&entry.backend==='gpu'&&entry.engine.manifest.functions.find(f=>f.name===name)?.shader) {
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
        linear_memory_bytes:entry.memory?entry.memory():null,gpu_counters:entry.backend==='gpu'?counters:null};
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
  closeRust(); for(const engine of Object.values(engines))await engine.close();
  return result;
}
