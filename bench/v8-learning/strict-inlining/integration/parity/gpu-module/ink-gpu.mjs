import {width,pack,unpack} from "./ink-abi.mjs";
import * as deviceLowering from "./ink-device.mjs";
const {createDevice,dispatchCount,fieldPath,reducible,decodeComponents,combineWords,lanes} = deviceLowering;
import {createSelector,profileScope,workloadFeatures,sessionWorkload,sessionContext} from "./backend-selection.mjs";
import {pipelineScope,segmentOutputs,segmentContexts,placementBackends} from './pipeline-contract.mjs';
import {createPackedCall} from "./prepared-wasm.mjs";
import {completeSession} from './complete-session.mjs';
export {prepareCostProfile} from './backend-selection.mjs';
const ENGINE_LIFETIME=Symbol('owned complete engine');
export function executeSession(base,plan,options){
  return completeSession((url,settings)=>loadInk(url,settings,ENGINE_LIFETIME),base,plan,options);
}
// Trusted values ABI: caller supplies correctly typed, stable arguments.
// Packing is transport for Wasm/GPU, never the JavaScript execution representation.
const MAX_BYTES = 256 * 1024 * 1024,
  MAX_STEPS = 64,
  MAX_ITERATIONS = 1_000_000,
  MAX_DISPATCHES = 64 * 1024 * 1024;
const fail = (s) => {
  throw Error(s);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);


function compilePlan(plan, functions, native = false) {
  if (
    !plan ||
    !Array.isArray(plan.steps) ||
    !plan.steps.length ||
    plan.steps.length > MAX_STEPS
  )
    fail("pipeline requires 1..64 steps");
  const iterations = plan.iterations ?? 1;
  if (
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > MAX_ITERATIONS ||
    iterations * plan.steps.length > MAX_DISPATCHES
  )
    fail("pipeline iteration/dispatch limit");
  const constants = [],
    inputs = new Map(),
    steps = [],
    ids = new Map();
  let reason = null;
  const constant = (v, t) => {
    const a = native ? {javascript: v, type: t, count: t.kind === "list" ? v.length : 1, finite: true} : pack(v, t);
    constants.push(a);
    return {
      kind: "constant",
      index: constants.length - 1,
      type: t,
      count: a.count,
    };
  };
  for (const step of plan.steps) {
    if (typeof step.id !== "string" || !step.id || ids.has(step.id))
      fail("duplicate or invalid step id");
    const f = functions.get(step.call);
    if (!f) fail(`unknown function ${step.call}`);
    if (!Array.isArray(step.args) || step.args.length !== f.params.length)
      fail("argument count mismatch");
    const args = step.args.map((v, i) => {
      const t = f.params[i].type;
      if (
        v &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        Object.hasOwn(v, "step") &&
        Object.keys(v).length === 1
      ) {
        const previous = ids.get(v.step);
        if (previous === undefined)
          fail("step reference must name an earlier step");
        const s = steps[previous];
        if (!same(t, s.f.result)) fail("step reference type mismatch");
        return { kind: "step", index: previous, type: t, count: s.count };
      }
      if (
        v &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        Object.hasOwn(v, "input") &&
        Object.keys(v).length === 1
      ) {
        if (
          typeof v.input !== "string" ||
          !Object.hasOwn(plan.inputs ?? {}, v.input)
        )
          fail("unknown pipeline input");
        if (!inputs.has(v.input))
          inputs.set(v.input, constant(plan.inputs[v.input], t));
        const ref = inputs.get(v.input);
        if (!same(t, ref.type))
          fail("pipeline input used with different types");
        return { ...ref, input: v.input };
      }
      return constant(v, t);
    });
    const graphShape = f.graph_required
      ? deviceLowering.graphCapacity(f.graph,args.map(a=>a.count ?? 0)) : null;
    const count = graphShape ? graphShape.outputCount : f.shader
      ? Math.max(...f.lengths.map((i) => args[i].count ?? 0))
      : null;
    if (!f.shader && !f.graph_required) reason ??= f.fallback_reason ?? "CPU-only function";
    if(!f.graph_required && f.gpu_max_elements && args.some(a=>(a.count??0)>f.gpu_max_elements))reason??="literal GPU collection work limit; compiled CPU fallback";
    ids.set(step.id, steps.length);
    steps.push({ id: step.id, f, args, count, graphShape });
  }
  let outputs = plan.outputs ?? [steps.at(-1).id];
  if (
    !Array.isArray(outputs) ||
    !outputs.length ||
    new Set(outputs).size !== outputs.length ||
    outputs.some((x) => !ids.has(x))
  )
    fail("invalid pipeline outputs");
  outputs = outputs.slice();
  const feedback = new Map();
  const graphExecution=steps.some(s=>s.f.graph_required);
  if(iterations*dispatchCount({steps})>MAX_DISPATCHES)
    fail("pipeline iteration/dispatch limit");
  if(graphExecution && steps.some(s=>!s.f.graph))
    reason ??= "mixed GPU graph requires a graph descriptor for every function";
  for (const [input, id] of Object.entries(plan.feedback ?? {})) {
    if (!inputs.has(input) || !ids.has(id))
      fail("unknown feedback input or step");
    const ref = inputs.get(input),
      step = steps[ids.get(id)];
    if (!same(ref.type, step.f.result)) fail("feedback type mismatch");
    if (ref.count !== step.count)
      reason ??= "feedback changes array shape; compiled CPU pipeline";
    feedback.set(input, ids.get(id));
  }

  let bytes = native ? 0 : constants.reduce(
    (n, c) => n + Math.max(4, c.words.byteLength+(c.type.kind==="list"?4:0)),
    0,
  );
  bytes += steps.reduce(
    (n, s) =>
      n +
      (s.graphShape
        ? s.graphShape.capacities.reduce((bytes,n,i)=>bytes+Math.max(4,n*width(s.f.graph.nodes[i].result)*4)+(s.f.graph.nodes[i].result.kind === 'list' ? 4 : 0),0)
        : 2 * Math.max(4, (1+(s.count ?? 0) * width(s.f.result)) * 4)) +
      4 * (s.args.length + 1),
    0,
  );
  bytes += outputs.reduce(
    (n, id) =>
      n +
      Math.max(
        4,
        (1+(steps[ids.get(id)].count ?? 0) *
          width(steps[ids.get(id)].f.result)) *
          4,
      ),
    0,
  );
  if(graphExecution) for(const name of feedback.keys()) {
    const c=constants[inputs.get(name).index];
    bytes+=Math.max(4,c.count*width(c.type)*4+(c.type.kind==='list'?4:0));
  }
  if (bytes > MAX_BYTES) reason ??= "GPU live-buffer budget exceeds 256 MiB";
  return {
    native,
    constants,
    inputs,
    steps,
    outputs,
    ids,
    feedback,
    iterations,
    reason,
    bytes,
  };
}
export async function loadInk(
  base,
  { gpu = true, device = null, backend: defaultBackend = "auto", expectedCalls=32, policy="adaptive", staticBackend="cpu", costProfile=null, placementProfile=null, targetKey="", parallelism=0, workerTimeoutMs=30000 } = {},
  lifetime=null,
) {
  const costObjective=lifetime===ENGINE_LIFETIME?'engine':'session';
  const root = new URL(base, globalThis.location?.href ?? "http://localhost/");
  if (!root.pathname.endsWith("/")) root.pathname += "/";
  const manifest = await (await fetch(new URL("manifest.json", root))).json();
  const freezeMetadata=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeMetadata);Object.freeze(value);}return value};
  freezeMetadata(manifest);
  if (manifest.schema !== 2) fail("expected schema 2 compute bundle");
  if(!Number.isInteger(parallelism)||parallelism<0||parallelism>16)fail('parallelism must be 0..16');
  if(!Number.isInteger(workerTimeoutMs)||workerTimeoutMs<1||workerTimeoutMs>60000)fail('worker timeout must be 1..60000 ms');
  let cpu=null,cpuStartup=0, wasmBytes=null;
  async function instantiateCpu() {
    wasmBytes ??= await (await fetch(new URL('cpu.wasm',root))).arrayBuffer();
    return (await WebAssembly.instantiate(wasmBytes,{})).instance.exports;
  }
  async function ensureCpu() {
    if(cpu) return;
    const start=performance.now();
    cpu=await instantiateCpu();
    cpuStartup=performance.now()-start;
  }
  let tail=Promise.resolve(), closed=false;
  const selector=createSelector({policy,staticBackend,costProfile,targetKey});
  const staticChoice=policy==='static' ? (await selector.choose(['cpu','javascript',...(gpu?['gpu']:[])])).backend : null;
  // Resolve only the native JS transport boundary early. Other static choices
  // stay automatic until the shared contract sees actual device eligibility.
  const resolveBackend=requested=>requested==='auto' && staticChoice==='javascript' ? 'javascript' : requested;
  const jsStart=performance.now();
  const javascript=await import(new URL("program.mjs",root));
  const jsStartup=performance.now()-jsStart;
  const functions=new Map(manifest.functions.map(f=>[f.name,{...f,parallel:javascript.metadata.functions.find(m=>m.name===f.name)?.parallel??false,javascript:javascript.functions[f.name],output:compileJavascriptOutput(f.result)}]));
  let placement=null,placementReady=null,workers=null,gpuFailed=false,gpuWarm=false;
  async function ensurePlacement() {
    placementReady??=(async()=>{
      let module;try{module=await import('./pipeline-selection.mjs')}catch(error){throw Error('saved placement requires the distribution planner asset',{cause:error})}
      placement={selector:module.createPipelineSelector({placementProfile,targetKey,parallelism,expectedCalls})};
      return placement;
    })();
    return placementReady;
  }
  // Bind caller-supplied observations before returning the engine.
  if(placementProfile!==null)await ensurePlacement();
  async function ensureWorkers() {
    if(workers||!parallelism||typeof Worker==='undefined')return workers;
    const {createWorkerPool}=await import('./pipeline-workers.mjs');
    try{workers=createWorkerPool(root,parallelism,{timeoutMs:workerTimeoutMs});}catch{return null}
    return workers;
  }
  const adapter=createDevice({root, enabled:gpu, device, onLost:()=>{if(closed)return;gpuFailed=true;selector.clear();placement?.selector.clear()},fail,width,unpack,MAX_BYTES});
  function cpuCall(f, args, consume) {
    if(f.precondition && !cpuCall(f.precondition,args,data=>data.words[0]===1))fail('contract precondition failed');
    cpu.ink_compute_reset();
    try {
      const ptrs = cpu.ink_alloc(args.length, 4),
        lengths = cpu.ink_alloc(args.length, 4);
      for (let i = 0; i < args.length; i++) {
        const a = args[i],
          ptr = cpu.ink_alloc(Math.max(1, a.words.length), 4);
        new Uint32Array(cpu.memory.buffer, ptr, a.words.length).set(a.words);
        new DataView(cpu.memory.buffer).setUint32(ptrs + 4 * i, ptr, true);
        new DataView(cpu.memory.buffer).setUint32(
          lengths + 4 * i,
          a.count,
          true,
        );
      }
      // The declared result type selects a machine-word result ABI when the
      // module exports it. Arguments retain the same captured packed ABI.
      // Scalar returns need neither an output header nor an arena allocation.
      const kind = f.result.kind;
      const direct = kind === 'u64' ? cpu.ink_compute_scalar64
        : ['u32', 'i32', 'bool', 'f32'].includes(kind) ? cpu.ink_compute_scalar32 : null;
      if (direct) {
        const result = direct(f.index, ptrs, lengths);
        const words = kind === 'u64'
          ? Uint32Array.of(Number(result & 4294967295n), Number((result >> 32n) & 4294967295n))
          : Uint32Array.of(result);
        return consume({ words, type: f.result, count: 1 }, false);
      }
      const header = cpu.ink_alloc(2, 4);
      cpu.ink_compute_call(f.index, ptrs, lengths, header, header + 4);
      const view = new DataView(cpu.memory.buffer),
        ptr = view.getUint32(header, true),
        count = view.getUint32(header + 4, true);
      if (count * 4 > MAX_BYTES) fail("CPU output exceeds 256 MiB budget");
      const words = new Uint32Array(cpu.memory.buffer, ptr, count);
      // Decode terminal owned values while arena storage is still alive.
      // Only packed intermediates that cross a reset need a transport copy.
      return consume({
        words,
        type: f.result,
        count: f.result.kind === "list" ? count / width(f.result.element) : 1,
      }, true);
    } finally {
      cpu.ink_compute_reset();
    }
  }
  function runCpu(p) {
    const inputs = new Map(p.inputs),
      values = [], outputs = new Map();
    const used = new Set(p.steps.flatMap(s=>s.args.filter(a=>a.kind==='step').map(a=>a.index)));
    const feedback = new Set(p.feedback.values());
    const outputIds = new Map(p.outputs.map(id=>[p.ids.get(id),id]));
    for (let iteration = 0; iteration < p.iterations; iteration++) {
      for (let i = 0; i < p.steps.length; i++) {
        const s = p.steps[i];
        const args = s.args.map((a) =>
          a.input ? resolve(inputs.get(a.input)) : resolve(a),
        );
        const final=iteration===p.iterations-1;
        values[i] = cpuCall(s.f, args, (data,borrowed)=>{
          if(final && outputIds.has(i)) outputs.set(outputIds.get(i),unpack(data.words,s.f.result));
          return used.has(i) || (!final && feedback.has(i))
            ? (borrowed ? {...data,words:data.words.slice()} : data) : null;
        });
      }
      for (const [input, step] of p.feedback)
        inputs.set(input, { kind: "value", value: values[step] });
    }
    function resolve(a) {
      return a.kind === "constant"
        ? p.constants[a.index]
        : a.kind === "value"
          ? a.value
          : values[a.index];
    }
    return {
      values: Object.fromEntries(p.outputs.map(id=>[id,outputs.get(id)])),
      counters: { upload_bytes: 0, readback_bytes: 0, dispatches: 0 },
    };
  }
  function compileJavascriptOutput(type) {
    // Bind result conversion once. Ordinary word/Bool values stay native.
    if(type.kind === 'u64') return value=>value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
    if((type.kind === 'list' || type.kind === 'vector') && hasU64(type.element)) {
      const element=compileJavascriptOutput(type.element);
      return value=>Array.from(value, element);
    }
    if(type.kind === 'record' && hasU64(type)) {
      const fields=type.fields.map(f=>[f.name,compileJavascriptOutput(f.type)]);
      return value=>Object.fromEntries(fields.map(([name,output])=>[name,output(value[name])]));
    }
    return value=>value;
  }
  function hasU64(type) {
    return type.kind === 'u64' || ((type.kind === 'list' || type.kind === 'vector') && hasU64(type.element)) || (type.kind === 'record' && type.fields.some(f=>hasU64(f.type)));
  }
  function javascriptInput(words, type) {
    // Decode native BigInt in one pass instead of JSON U64 then reconversion.
    if(type.kind === 'list' && type.element.kind === 'u32') return words;
    return unpack(words,type,true);
  }
  async function runJavascript(p) {
    const inputs=new Map(p.inputs),values=[];
    const constants=p.constants.map(c=>Object.hasOwn(c,'javascript') ? c.javascript : (c.javascript=javascriptInput(c.words,c.type)));
    const resolve=a=>a.kind==='constant'?constants[a.index]:a.kind==='value'?a.value:values[a.index];
    for(let iteration=0;iteration<p.iterations;iteration++) {
      for(let i=0;i<p.steps.length;i++) {
        const s=p.steps[i];
        const args=s.args.map(a=>a.input?resolve(inputs.get(a.input)):resolve(a));
        values[i]=s.f.parallel ? await javascript.callAsync(s.f.name,args) : s.f.javascript(...args);
      }
      for(const [input,stage] of p.feedback)inputs.set(input,{kind:'value',value:values[stage]});
    }
    return {values:Object.fromEntries(p.outputs.map(id=>{
      const i=p.ids.get(id),f=p.steps[i].f,value=f.output(values[i]);
      // Packed requests retain their owned Array output convention even when
      // an identity returns the private captured U32 transport directly.
      return [id,!p.native && f.result.kind==='list' && f.result.element.kind==='u32' && value instanceof Uint32Array ? Array.from(value) : value];
    })),counters:{upload_bytes:0,readback_bytes:0,dispatches:0}};
  }
  function nativeResult(value,type) {
    if(type.kind==='u64')return BigInt(value);
    if((type.kind==='list'||type.kind==='vector')&&hasU64(type.element))return Array.from(value,v=>nativeResult(v,type.element));
    if(type.kind==='record'&&hasU64(type))return Object.fromEntries(type.fields.map(f=>[f.name,nativeResult(value[f.name],f.type)]));
    return value;
  }
  async function executePlaced(p, explicit) {
    const placement=explicit?null:await ensurePlacement();
    const available=['cpu','javascript'];
    if(gpu&&!gpuFailed&&(device||globalThis.navigator?.gpu))available.push('gpu');
    // Worker construction is lazy: saved profiles cannot justify setup work
    // unless a worker segment is actually selected.
    if(parallelism&&typeof Worker!=='undefined'&&(!workers||workers.available))available.push('cpu-worker','javascript-worker');
    let selected=explicit?{
      scope:pipelineScope(manifest,p),segments:explicit,reason:'explicit pure pipeline placement',
    }:placement.selector.choose(manifest,p,available,workers?.capacity??parallelism,['javascript',...(cpu?['cpu']:[]),...(gpuWarm?['gpu']:[]),...(workers?.warmBackends??[])]);
    // Search output cannot add/drop/reorder source stages or invent targets.
    // Malformed physical proposals retain the same complete CPU computation.
    let covered=0,valid=Array.isArray(selected?.segments)&&selected.segments.length>0&&selected.segments.length<=p.steps.length;
    if(valid)for(const s of selected.segments){if(!s||s.start!==covered||!Number.isInteger(s.end)||s.end<=covered||s.end>p.steps.length||!placementBackends.includes(s.backend)){valid=false;break;}covered=s.end;}
    if(!valid||covered!==p.steps.length)selected={scope:pipelineScope(manifest,p),segments:[{start:0,end:p.steps.length,backend:'cpu'}],reason:'invalid physical proposal; compiled CPU baseline'};
    if(selected.segments.length===1&&selected.segments[0].backend==='cpu') {
      await ensureCpu();return {...runCpu(p),backend:'cpu',reason:selected.reason,placement:selected};
    }
    if(selected.segments.length===1&&selected.segments[0].backend==='javascript') {
      return {...await runJavascript(p),backend:'javascript',reason:selected.reason,placement:selected};
    }
    if(selected.segments.length===1&&selected.segments[0].backend==='gpu'&&!p.reason&&gpu&&!gpuFailed) {
      // Preserve the device adapter's complete resident feedback/batch path.
      // Splitting a whole-GPU choice into host passes would reupload state.
      try {
        await adapter.prepare(p);gpuWarm=true;const result=await adapter.run(p);
        return {...result,backend:'gpu',reason:selected.reason,placement:selected,stages:[{iteration:0,iterations:p.iterations,start:0,end:p.steps.length,requested:'gpu',backend:'gpu',outputs:p.outputs,reason:selected.reason,counters:result.counters}]};
      }catch(error) {
        if(!/limit|budget|shape|non-finite/i.test(String(error)))gpuFailed=true;
        placement?.selector.clear();await ensureCpu();const result=runCpu(p),reason=`gpu fallback: ${error.message??error}`;
        return {...result,backend:'cpu',reason,placement:selected,stages:[{iteration:0,iterations:p.iterations,start:0,end:p.steps.length,requested:'gpu',backend:'cpu',outputs:p.outputs,reason,counters:result.counters}]};
      }
    }
    const constants=p.constants.map(c=>Object.hasOwn(c,'javascript')?c.javascript:(c.javascript=javascriptInput(c.words,c.type)));
    let inputs=new Map([...p.inputs].map(([name,ref])=>[name,constants[ref.index]]));
    const values=[],receipts=[],counters={upload_bytes:0,readback_bytes:0,dispatches:0,live_buffer_bytes:0,resident_copy_bytes:0};
    const identity=JSON.stringify([manifest.core_sha256,manifest.cpu_rust_sha256,manifest.javascript_sha256]);
    for(let iteration=0;iteration<p.iterations;iteration++) {
      // The partition covers source order, while independent partitions may
      // run concurrently on workers. Shared main Wasm/device adapters retain
      // their exclusive arena and error-scope ownership.
      const owners=[];selected.segments.forEach((s,i)=>{for(let j=s.start;j<s.end;j++)owners[j]=i});
      const tasks=[];let cpuLane=Promise.resolve(),gpuLane=Promise.resolve();
      const runSegment=async s=>{
        const outputs=segmentOutputs(p,s.start,s.end);
        const ports={};
        const resolve=a=>{
          if(!a.input&&a.kind==='step'&&a.index>=s.start)return {step:p.steps[a.index].id};
          const key=a.input?`i:${a.input}`:`${a.kind}:${a.index}`;
          ports[key]=a.input?inputs.get(a.input):a.kind==='constant'?constants[a.index]:values[a.index];
          return {input:key};
        };
        const plan={inputs:ports,steps:p.steps.slice(s.start,s.end).map(step=>({id:step.id,call:step.f.name,args:step.args.map(resolve)})),outputs};
        let backend=s.backend,result,reason=selected.reason,stageRejected=false;
        const runCpuSegment=async()=>{await ensureCpu();return runCpu(compilePlan(plan,functions,false))};
        const action=async()=>{
          try {
            if(backend.endsWith('-worker')) {
              const pool=await ensureWorkers();if(!pool?.available)throw Error('pure workers unavailable');
              result=await pool.run(plan,backend.slice(0,-7),identity);
            } else if(backend==='javascript')result=await runJavascript(compilePlan(plan,functions,true));
            else if(backend==='cpu')result=await runCpuSegment();
            else {
              const packed=compilePlan(plan,functions,false);
              if(packed.reason){stageRejected=true;throw Error(packed.reason);}
              if(!gpu||gpuFailed)throw Error('GPU unavailable');
              await adapter.prepare(packed);gpuWarm=true;result=await adapter.run(packed);
            }
          }catch(error) {
            if(backend==='cpu')throw error;
            if(backend==='gpu'&&!stageRejected&&!/limit|budget|shape|non-finite/i.test(String(error)))gpuFailed=true;
            placement?.selector.clear();reason=`${backend} fallback: ${error.message??error}`;
            backend='cpu';const fallback=cpuLane.then(runCpuSegment);cpuLane=fallback.catch(()=>{});result=await fallback;
          }
          for(const id of outputs)values[p.ids.get(id)]=nativeResult(result.values[id],p.steps[p.ids.get(id)].f.result);
          const c=result.counters??{};
          for(const key of Object.keys(counters))if(key==='live_buffer_bytes')counters[key]=Math.max(counters[key],c[key]??0);else counters[key]+=c[key]??0;
          receipts.push({iteration,start:s.start,end:s.end,requested:s.backend,backend,outputs,reason,counters:c});
        };
        if(backend==='cpu'){const task=cpuLane.then(action);cpuLane=task.catch(()=>{});await task;}
        else if(backend==='gpu'){const task=gpuLane.then(action);gpuLane=task.catch(()=>{});await task;}
        else await action();
      };
      const deferred=selected.segments.map(()=>Promise.withResolvers());
      tasks.push(...deferred.map(t=>t.promise));
      // Launch independent worker/device work before blocking main-thread JS.
      const order=selected.segments.map((s,index)=>({s,index})).sort((a,b)=>(a.s.backend.endsWith('-worker')?0:a.s.backend==='gpu'?1:2)-(b.s.backend.endsWith('-worker')?0:b.s.backend==='gpu'?1:2));
      order.forEach(({s,index})=>{
        const dependencies=new Set();
        for(let j=s.start;j<s.end;j++)for(const a of p.steps[j].args)if(a.kind==='step'&&a.index<s.start)dependencies.add(owners[a.index]);
        Promise.all([...dependencies].map(i=>tasks[i])).then(()=>runSegment(s)).then(deferred[index].resolve,deferred[index].reject);
      });
      // Drain every outstanding pure task even on failure before the next
      // public request can reuse arenas/devices or close workers.
      const settled=await Promise.allSettled(tasks),failed=settled.find(r=>r.status==='rejected');
      if(failed)throw failed.reason;
      if(iteration+1<p.iterations)inputs=new Map([...inputs].map(([name,value])=>[name,p.feedback.has(name)?values[p.feedback.get(name)]:value]));
    }
    const actual=new Set(receipts.map(r=>r.backend));
    return {values:Object.fromEntries(p.outputs.map(id=>{
      const i=p.ids.get(id),f=p.steps[i].f,value=f.output(values[i]);
      return [id,f.result.kind==='list'&&f.result.element.kind==='u32'&&value instanceof Uint32Array?Array.from(value):value];
    })),backend:actual.size===1?[...actual][0]:'mixed',reason:selected.reason,placement:selected,stages:receipts.sort((a,b)=>a.iteration-b.iteration||a.start-b.start),counters};
  }
  async function execute(p, { backend = defaultBackend, placement: placementPolicy='adaptive', placements } = {}) {
    if(closed) fail('Ink runtime is closed');
    if(!['adaptive','whole'].includes(placementPolicy))fail('placement must be adaptive or whole');
    if(placements) {
      if(backend!=='auto')fail('explicit placements require backend auto');
      let start=0;
      if(!Array.isArray(placements)||!placements.length||placements.length>p.steps.length)fail('invalid pipeline placements');
      const segments=placements.map(s=>{
        if(!s||!Number.isInteger(s.end)||s.end<=start||s.end>p.steps.length||!placementBackends.includes(s.backend))fail('invalid pipeline placement');
        const segment={start,end:s.end,backend:s.backend};start=s.end;return segment;
      });
      if(start!==p.steps.length)fail('placements must cover the complete pipeline');
      return executePlaced(p,segments);
    }
    if(backend==='auto'&&policy==='adaptive'&&placementPolicy==='adaptive'&&placementProfile)return executePlaced(p);
    if(backend === 'javascript') return {...await runJavascript(p),backend,reason:'explicit backend selection'};
    if(backend === 'gpu-required' && p.reason)fail(p.reason);
    if(backend === 'cpu'){await ensureCpu();return {...runCpu(p),backend,reason:'explicit backend selection'};}
    if(backend === 'gpu' && p.reason){await ensureCpu();return {...runCpu(p),backend:'cpu',reason:p.reason};}
    const scope=profileScope(manifest,p.steps.map(s=>s.f.name).join('|'));
    const graphMode=p.steps.some(s=>s.f.graph_required);
    const features=await workloadFeatures({inputs:p.constants.map(c=>({list:c.type.kind==='list',count:c.count,bytes:c.words.byteLength})),outputs:p.outputs.map(id=>p.steps[p.ids.get(id)].count??0),stages:p.steps.map(s=>({dispatches:dispatchCount({steps:[{...s,f:{...s.f,graph_required:graphMode}}]})})),iterations:p.iterations});
    const key=scope;

    const candidates=[{name:'cpu',startupMs:cpuStartup,prepare:ensureCpu,run:()=>runCpu(p)},{name:'javascript',async:true,startupMs:jsStartup,run:()=>runJavascript(p)}];
    if(!p.reason && gpu) candidates.push({name:'gpu',async:true,prepare:async()=>{await adapter.prepare(p);gpuWarm=true;},run:()=>adapter.run(p)});
    const outcome=await selector.run(key,candidates,backend,{scope,boundary:'captured-owned',features});
    return {...outcome.result,backend:outcome.backend,reason:outcome.reason,profile:outcome.profile};
  }
  function serial(fn) {
    const task = tail.then(fn);
    tail = task.catch(() => {});
    return task;
  }
  function submit(plan, options) {
    let prepared;
    try {
      if(closed) fail('Ink runtime is closed');
      if(options)options={...options,placements:Array.isArray(options.placements)?options.placements.map(s=>({...s})):options.placements};
      prepared = compilePlan(plan, functions, resolveBackend(options?.backend ?? defaultBackend) === 'javascript');
    } catch (e) {
      return Promise.reject(e);
    }
    return serial(() => execute(prepared, { ...options,backend:resolveBackend(options?.backend??defaultBackend) }));
  }

  // Host twin of a resident GPU session, with identical semantics: values
  // stay packed, feedback replaces inputs, and reads decode only what is
  // asked for.
  function cpuOpen(p) {
    return {inputs:new Map([...p.inputs].map(([name,ref])=>[name,p.constants[ref.index]])),values:p.steps.map(()=>null),iteration:0};
  }
  function cpuStep(p, s, iterations) {
    for(let k=0;k<iterations;k++) {
      for(let i=0;i<p.steps.length;i++) {
        const step=p.steps[i];
        const args=step.args.map(a=>a.input?s.inputs.get(a.input):a.kind==='step'?s.values[a.index]:p.constants[a.index]);
        s.values[i]=cpuCall(step.f,args,(data,borrowed)=>borrowed?{...data,words:data.words.slice()}:data);
      }
      for(const [name,i] of p.feedback)s.inputs.set(name,s.values[i]);
      s.iteration++;
    }
  }
  // Element-wise sessions keep every input length; graph sessions accept
  // list lengths up to the opened capacity.
  function checkWrite(p, input, d) {
    const r=p.inputs.get(input);if(!r)fail('unknown pipeline input');
    if(p.steps.some(s=>s.f.graph_required)){if(d.count>r.count||(r.type.kind!=='list'&&d.count!==1))fail('written input exceeds the session capacity');}
    else if(d.count!==r.count)fail('steps sessions keep input shapes; reopen to change a length');
  }
  function cpuWrite(p, s, input, d) {
    checkWrite(p,input,d);
    if(p.feedback.has(input)&&s.iteration>0)s.values[p.feedback.get(input)]=d;
    s.inputs.set(input,d);
    return {counters:{upload_bytes:d.words.byteLength}};
  }
  function cpuRead(p, s, q) {
    if(!s.iteration)fail('session has not run an iteration');
    const index=id=>{if(typeof id!=='string')fail('read requires a step id');const i=p.ids.get(id);if(i===undefined)fail('unknown step');return i;};
    if(q?.outputs!==undefined) {
      if(!Array.isArray(q.outputs))fail('outputs must be an array');
      return {values:Object.fromEntries(q.outputs.map(id=>{const i=index(id);return [p.steps[i].id,unpack(s.values[i].words,p.steps[i].f.result)];})),counters:{readback_bytes:0}};
    }
    const i=index(q?.step),d=s.values[i],type=p.steps[i].f.result,list=type.kind==='list';
    const element=list?type.element:type,w=width(element),n=d.count;
    if(q.length===true)return {length:n,counters:{readback_bytes:0}};
    if(q.slice!==undefined) {
      if(!Array.isArray(q.slice)||q.slice.length!==2)fail('slice must be [start, count]');
      if(!q.slice.every(x=>Number.isSafeInteger(x)&&x>=0))fail('slice bounds must be naturals');
      if(!list)fail('slice requires a list value');
      const start=Math.min(q.slice[0],n),take=Math.min(q.slice[1],n-start);
      return {value:unpack(d.words.subarray(start*w,(start+take)*w),type),length:n,start,counters:{readback_bytes:0}};
    }
    if(typeof q.reduce==='string') {
      const {offset,type:field}=fieldPath(element,q.field,width),{kind,components}=reducible(field),l=lanes(kind);
      const reduce=op=>{
        const acc=Array.from({length:components},()=>null);
        for(let e=0;e<n;e++)for(let c=0;c<components;c++){const at=e*w+offset+c*l,v=Array.from(d.words.subarray(at,at+l));acc[c]=acc[c]===null?v:combineWords(kind,op,acc[c],v);}
        if(n===0&&op!=='sum')return null;
        return decodeComponents(kind,components,acc.flatMap(a=>a??Array(l).fill(0)));
      };
      const value=['sum','min','max'].includes(q.reduce)?reduce(q.reduce):q.reduce==='bounds'?{min:reduce('min'),max:reduce('max')}:fail('reduce must be sum, min, max or bounds');
      return {value,length:n,counters:{readback_bytes:0}};
    }
    fail('read requires outputs, length, slice or reduce');
  }
  // Open a resident session: inputs are uploaded once and every buffer stays
  // on the device across step, read and write calls. No iteration runs until
  // step. When the GPU cannot run the plan, the session runs on the compiled
  // CPU with the same semantics.
  function openSession(plan, {backend='auto',workload=null}={}) {
    let p,forecast;
    try {
      if(closed)fail('Ink runtime is closed');
      if(!['auto','gpu','gpu-required','cpu'].includes(backend))fail('sessions run on auto, gpu, gpu-required or cpu');
      p=compilePlan(plan,functions,false);
      forecast=sessionWorkload(workload);
      if(backend==='gpu-required'&&p.reason)fail(p.reason);
    } catch(error){return Promise.reject(error);}
    return serial(async()=>{
      if(closed)fail('Ink runtime is closed');
      let state=null,reason,decision=null,choice=backend,context=null;
      if(backend==='auto'||costObjective==='engine')
        context=await sessionContext(manifest,p,forecast,dispatchCount(p),{cpu:!!cpu,gpu:adapter.preparation(p)},costObjective);
      if(backend==='auto'){
        decision=await selector.choose(['cpu',...(!p.reason&&gpu&&!gpuFailed?['gpu']:[])],context);
        choice=decision.backend;reason=decision.reason;
      }
      if(choice==='cpu'||p.reason)reason=reason??(choice==='cpu'?'explicit CPU selection':p.reason);
      else if(!gpu||gpuFailed){if(backend==='gpu-required')fail('GPU unavailable');reason='GPU unavailable';}
      else try {
        await adapter.prepare(p);gpuWarm=true;
        state={gpu:await adapter.open(p)};reason=reason??'explicit resident GPU session';
      } catch(error) {
        if(backend==='gpu-required')throw error;
        if(!/limit|budget|shape|non-finite/i.test(String(error)))gpuFailed=true;
        reason=`GPU fallback: ${error.message??error}`;
      }
      if(!state){await ensureCpu();state={cpu:cpuOpen(p)};}
      let ended=false;
      const name=state.gpu?'gpu':'cpu';
      const guard=()=>{if(closed)fail('Ink runtime is closed');if(ended)fail('session closed');};
      const session={
        backend:name,reason,profile:decision,costContext:context,
        counters:{upload_bytes:state.gpu?state.gpu.A.upload:0,get live_buffer_bytes(){return state.gpu?state.gpu.A.live:null;},get peak_buffer_bytes(){return state.gpu?state.gpu.A.peak:null;}},
        get iteration(){return state.gpu?.iteration??state.cpu?.iteration??0;},
        // Run more iterations. Nothing is read back; GPU work is submitted
        // and may still be executing when this resolves (see finish).
        step:(iterations=1)=>serial(async()=>{
          guard();
          if(!Number.isInteger(iterations)||iterations<1||iterations>MAX_ITERATIONS||iterations*dispatchCount(p)>MAX_DISPATCHES)fail('session step iteration limit');
          if(state.cpu){cpuStep(p,state.cpu,iterations);return {iteration:state.cpu.iteration,backend:'cpu',counters:{dispatches:0}};}
          const {iteration,...counters}=await adapter.advance(state.gpu,p,iterations);
          return {iteration,backend:'gpu',counters};
        }),
        // {outputs:[ids]} | {step,length:true} | {step,slice:[start,count]} |
        // {step,reduce:'sum'|'min'|'max'|'bounds',field:'a.b'}. Reductions
        // run on the device and return a few words.
        read:request=>serial(async()=>{guard();return state.cpu?cpuRead(p,state.cpu,request):adapter.read(state.gpu,p,request);}),
        // Replace a named input for the next iteration. A fed-back input's
        // carried value is its step's last output, which this replaces.
        write:(input,value)=>serial(async()=>{
          guard();
          const r=p.inputs.get(input);if(!r)fail('unknown pipeline input');
          const d=pack(value,r.type);
          if(state.cpu)return cpuWrite(p,state.cpu,input,d);
          checkWrite(p,input,d);return adapter.write(state.gpu,p,input,d);
        }),
        // The GPU buffer holding a step's current value, for zero-copy use by
        // a renderer on the same device (pass `device` to loadInk). Valid
        // until the next step, write or close of this session.
        buffer:id=>{guard();if(!state.gpu)fail(`session runs on CPU: ${reason}`);const i=p.ids.get(id);if(i===undefined)fail('unknown step');return adapter.view(state.gpu,p,i);},
        // Wait for submitted GPU work (measurement only; reads also wait).
        finish:()=>serial(async()=>{guard();if(state.gpu)await adapter.finish();}),
        close:()=>serial(()=>{if(ended)return;ended=true;if(state.gpu)adapter.closeSession(state.gpu);state.cpu=null;}),
      };
      return session;
    });
  }
  const runtime = {
    manifest,
    describeSession: (plan,workload) => {
      try{
        if(closed)fail('Ink runtime is closed');
        const p=compilePlan(plan,functions,false),forecast=sessionWorkload(workload);
        return sessionContext(manifest,p,forecast,dispatchCount(p),{cpu:!!cpu,gpu:adapter.preparation(p)},costObjective);
      }catch(error){return Promise.reject(error);}
    },
    describePipeline: plan => {
      let prepared;try{if(closed)fail('Ink runtime is closed');prepared=compilePlan(plan,functions,false);}catch(error){return Promise.reject(error)}
      return Promise.resolve(segmentContexts(manifest,prepared));
    },
    // Explicit destination execution never enters adaptive profiling: repeated
    // trials would overwrite caller storage and use a different lifetime ABI.
    callInto: (name, args, destination, {backend = 'javascript'} = {}) => {
      const f=functions.get(name);
      if(!f) return Promise.reject(Error(`unknown function ${name}`));
      if(backend === 'javascript') return serial(async()=>{
        if(closed) fail('Ink runtime is closed');
        let count;if(f.parallel){const value=await javascript.callAsync(name,args);if(value.length>destination.length)fail("destination capacity");for(let i=0;i<value.length;i++)destination[i]=value[i];count=value.length;}else count=javascript.functionsInto[name](...args,destination);
        return {count,backend,countUnit:'elements'};
      });
      if(backend !== 'cpu') return Promise.reject(Error('destination calls support javascript or cpu'));
      const packed=f.params.map((p,i)=>pack(args[i],p.type));
      return serial(async()=>{
        if(closed) fail('Ink runtime is closed');
        await ensureCpu();
        const workspace=createPackedCall(cpu,f.index,packed,destination.length*width(f.result.element));
        try {
          const words=workspace.run();
          unpack(words,f.result,true,destination);
          return {count:words.length/width(f.result.element),backend,countUnit:'elements'};
        } finally {workspace.close();}
      });
    },
    // Captured transport setup is paid once. Input/output buffers are owned by
    // this dedicated Wasm instance; returned packed views are borrowed.
    prepareCpuCall: async (name, args, capacityWords) => {
      if(closed) fail('Ink runtime is closed');
      const f=functions.get(name);
      if(!f) fail(`unknown function ${name}`);
      const packed=f.params.map((p,i)=>pack(args[i],p.type));
      const instance=await instantiateCpu();
      return createPackedCall(instance,f.index,packed,capacityWords);
    },
    prepareGpuPipeline: plan => {
      let prepared;
      try {if(closed)fail('Ink runtime is closed');prepared=compilePlan(plan,functions,false);if(!gpu)fail('GPU disabled by host option');if(prepared.reason)fail(prepared.reason);}
      catch(error){return Promise.reject(error);}
      return serial(async()=>{
        if(closed)fail('Ink runtime is closed');const call=await adapter.capture(prepared);gpuWarm=true;
        return {setup:call.setup,run:()=>serial(async()=>{if(closed)fail('Ink runtime is closed');const result=await call.run();return {...result,backend:'gpu',value:prepared.outputs.length===1?result.values[prepared.outputs[0]]:undefined};}),close:()=>serial(()=>call.close())};
      });
    },
    pipeline: submit,
    open: openSession,
    // The engine's GPU device once GPU execution has started (or the device
    // supplied to loadInk), for renderers sharing session buffers.
    gpuDevice: () => adapter.handle(),
    call: (name, args, options) => {
      const backend=resolveBackend(options?.backend ?? defaultBackend);
      if(backend === 'cpu') {
        const f=functions.get(name);
        if(!f) return Promise.reject(Error(`unknown function ${name}`));
        let packed;
        try {
          if(closed) fail('Ink runtime is closed');
          packed=f.params.map((p,i)=>pack(args[i],p.type));
        } catch(error) { return Promise.reject(error); }
        return serial(async()=>{
          if(closed) fail('Ink runtime is closed');
          await ensureCpu();
          const value=cpuCall(f,packed,data=>unpack(data.words,f.result));
          return {value,values:{result:value},backend,reason:'explicit backend selection',counters:{upload_bytes:0,readback_bytes:0,dispatches:0}};
        });
      }
      if(backend !== 'javascript') return submit(
        {steps:[{id:'result',call:name,args}],outputs:['result']}, options,
      ).then(r=>({...r,value:r.values.result}));
      const f=functions.get(name);
      if(!f) return Promise.reject(Error(`unknown function ${name}`));
      return serial(()=>{
        if(closed) fail('Ink runtime is closed');
        const value=f.output(f.javascript(...args));
        return {value,values:{result:value},backend:'javascript',reason:'explicit backend selection',counters:{upload_bytes:0,readback_bytes:0,dispatches:0}};
      });
    },
    dispose: () =>
      serial(() => {
        closed=true;
        adapter.close();
        // Shared immutable decision encodings own no device or execution state.
        // Keep them available to a later engine with the exact same inputs.
        placement?.selector.clear();workers?.close();
      }),
  };
  runtime.run = runtime.call;
  runtime.close = runtime.dispose;
  return runtime;
}
