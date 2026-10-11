import * as deviceLowering from "./ink-device.mjs";
const {createDevice} = deviceLowering;
import {createSelector,profileScope} from "./backend-selection.mjs";
import {createPackedCall} from "./prepared-wasm.mjs";
// Trusted values ABI: caller supplies correctly typed, stable arguments.
// Packing is transport for Wasm/GPU, never the JavaScript execution representation.
const MAX_BYTES = 256 * 1024 * 1024,
  MAX_STEPS = 64,
  MAX_DISPATCHES = 65536;
const fail = (s) => {
  throw Error(s);
};
const width = (t) =>
  t.kind === "list"
    ? width(t.element)
    : t.kind === "vector"
      ? t.size * width(t.element)
      : t.kind === "record"
        ? t.fields.reduce((n, f) => n + width(f.type), 0)
        : t.kind === "u64"
          ? 2
          : 1;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function pack(v, t) {
  if(t.kind === 'list' && t.element.kind === 'u32') {
    if(v.length * 4 > MAX_BYTES) fail('input exceeds 256 MiB budget');
    return {words:v instanceof Uint32Array ? v.slice() : Uint32Array.from(v),type:t,count:v.length,finite:true};
  }
  // Fixed-width carriers reserve their final transport once. Nested lists
  // retain the same flattened word ABI, with their size counted recursively.
  const variable = t => t.kind === 'list' || (t.kind === 'vector' && variable(t.element)) || (t.kind === 'record' && t.fields.some(f => variable(f.type)));
  function size(v,t) {
    if(!variable(t)) return width(t);
    if(t.kind === 'list' || t.kind === 'vector') {
      if(!variable(t.element)) return v.length*width(t.element);
      let n=0;for(const x of v)n+=size(x,t.element);return n;
    }
    return t.fields.reduce((n,f)=>n+size(v[f.name],f.type),0);
  }
  const countWords=size(v,t);
  if(countWords*4 > MAX_BYTES) fail('input exceeds 256 MiB budget');
  const words = new Uint32Array(countWords),
    view = new DataView(new ArrayBuffer(4));
  let cursor=0;
  let finite = true;
  function go(v, t) {
    switch (t.kind) {
      case "list":
        for (const x of v) go(x, t.element);
        break;
      case "vector":
        for (const x of v) go(x, t.element);
        break;
      case "record":
        for (const f of t.fields) {
          go(v[f.name], f.type);
        }
        break;
      case "bool":
        words[cursor++]=+v;
        break;
      case "u32":
      case "i32":
        words[cursor++]=v >>> 0;
        break;
      case "u64": {
        const n = BigInt(v);
        words[cursor++]=Number(n & 4294967295n);
        words[cursor++]=Number(n >> 32n);
        break;
      }
      case "f32":
        if (typeof v === "number") {
          view.setFloat32(0, v, true);
          finite &&= Number.isFinite(view.getFloat32(0, true));
          words[cursor++]=view.getUint32(0, true);
        } else {
          view.setUint32(0, v.F32Bits, true);
          finite &&= Number.isFinite(view.getFloat32(0, true));
          words[cursor++]=v.F32Bits;
        }
        break;
      default:
        fail("unsupported packed type");
    }
  }
  go(v, t);
  if (words.length * 4 > MAX_BYTES) fail("input exceeds 256 MiB budget");
  return {
    words,
    type: t,
    count: t.kind === "list" ? v.length : 1,
    finite,
  };
}
function unpack(words, t, native = false, destination = null) {
  const type=t;
  let i = 0;
  const view = new DataView(new ArrayBuffer(4));
  function go(t) {
    switch (t.kind) {
      case "list": {
        const n = words.length / width(t.element);
        if (!Number.isInteger(n)) fail("invalid result layout");
        if(destination && t === type) {
          for(let j=0;j<n;j++) destination[j]=go(t.element);
          return destination;
        }
        if(t.element.kind === 'u32') { const value=Array.from(words.subarray(i,i+n));i+=n;return value; }
        return Array.from({ length: n }, () => go(t.element));
      }
      case "vector":
        return Array.from({ length: t.size }, () => go(t.element));
      case "record":
        return Object.fromEntries(t.fields.map((f) => [f.name, go(f.type)]));
      case "bool":
        return words[i++] !== 0;
      case "u32":
        return words[i++];
      case "i32":
        return words[i++] | 0;
      case "u64": {
        const n = BigInt(words[i++]) + (BigInt(words[i++]) << 32n);
        return native ? n : n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n.toString();
      }
      case "f32":
        view.setUint32(0, words[i++], true);
        return Number.isFinite(view.getFloat32(0, true))
          ? view.getFloat32(0, true)
          : { F32Bits: view.getUint32(0, true) };
      default:
        fail("invalid result type");
    }
  }
  return go(t);
}
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
    iterations > 10000 ||
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
  if (constants.some((c) => !c.finite))
    reason ??= "non-finite f32 inputs require CPU";
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
  { gpu = true, backend: defaultBackend = "auto", expectedCalls=32, recheckEvery=32, policy="adaptive", staticBackend="cpu", costProfile=null, targetKey="" } = {},
) {
  const root = new URL(base, globalThis.location?.href ?? "http://localhost/");
  if (!root.pathname.endsWith("/")) root.pathname += "/";
  const manifest = await (await fetch(new URL("manifest.json", root))).json();
  if (manifest.schema !== 2) fail("expected schema 2 compute bundle");
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
  const selector=createSelector({expectedCalls,recheckEvery,policy,staticBackend,costProfile,targetKey});
  const resolveBackend=requested=>requested==='auto'&&policy==='static'?staticBackend:requested;
  const jsStart=performance.now();
  const javascript=await import(new URL("program.mjs",root));
  const jsStartup=performance.now()-jsStart;
  const functions=new Map(manifest.functions.map(f=>[f.name,{...f,javascript:javascript.functions[f.name],output:compileJavascriptOutput(f.result)}]));
  const adapter=createDevice({root, enabled:gpu, onLost:()=>selector.clear(),fail,width,unpack,MAX_BYTES});
  function cpuCall(f, args, consume) {
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
  function runJavascript(p) {
    const inputs=new Map(p.inputs),values=[];
    const constants=p.constants.map(c=>Object.hasOwn(c,'javascript') ? c.javascript : (c.javascript=javascriptInput(c.words,c.type)));
    const resolve=a=>a.kind==='constant'?constants[a.index]:a.kind==='value'?a.value:values[a.index];
    for(let iteration=0;iteration<p.iterations;iteration++) {
      for(let i=0;i<p.steps.length;i++) {
        const s=p.steps[i];
        const args=s.args.map(a=>a.input?resolve(inputs.get(a.input)):resolve(a));
        values[i]=s.f.javascript(...args);
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
  async function execute(p, { backend = defaultBackend } = {}) {
    if(closed) fail('Ink runtime is closed');
    if(backend === 'javascript') return {...runJavascript(p),backend,reason:'explicit backend selection'};
    if(backend === 'cpu'){await ensureCpu();return {...runCpu(p),backend,reason:'explicit backend selection'};}
    if(backend === 'gpu' && p.reason){await ensureCpu();return {...runCpu(p),backend:'cpu',reason:p.reason};}
    const scope=profileScope(manifest,p.steps.map(s=>s.f.name).join('|'));
    const graphMode=p.steps.some(s=>s.f.graph_required);
    const features={input_elements:p.constants.reduce((n,c)=>n+(c.type.kind==='list'?c.count:0),0),input_bytes:p.constants.reduce((n,c)=>n+c.words.byteLength,0),output_capacity_elements:p.outputs.reduce((n,id)=>n+(p.steps[p.ids.get(id)].count??0),0),dispatches:p.steps.reduce((n,s)=>n+(graphMode?s.f.graph.nodes.length:(s.count?1:0)),0)*p.iterations,iterations:p.iterations};
    const key=policy==='profile'?JSON.stringify([scope,p.steps.map(s=>[s.f.index,s.args.map(a=>[a.kind,a.index,a.count])]),p.iterations,[...p.feedback],p.outputs,p.constants.map(c=>[c.type,c.count,Array.from(c.words.subarray(0,8))])]):scope;

    const candidates=[{name:'cpu',startupMs:cpuStartup,prepare:ensureCpu,run:()=>runCpu(p)},{name:'javascript',startupMs:jsStartup,run:()=>runJavascript(p)}];
    if(!p.reason && gpu) candidates.push({name:'gpu',async:true,prepare:()=>adapter.prepare(p),run:()=>adapter.run(p)});
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
      prepared = compilePlan(plan, functions, resolveBackend(options?.backend ?? defaultBackend) === 'javascript');
    } catch (e) {
      return Promise.reject(e);
    }
    return serial(() => execute(prepared, { ...options,backend:resolveBackend(options?.backend??defaultBackend) }));
  }
  const runtime = {
    manifest,
    // Explicit destination execution never enters adaptive profiling: repeated
    // trials would overwrite caller storage and use a different lifetime ABI.
    callInto: (name, args, destination, {backend = 'javascript'} = {}) => {
      const f=functions.get(name);
      if(!f) return Promise.reject(Error(`unknown function ${name}`));
      if(backend === 'javascript') return serial(()=>{
        if(closed) fail('Ink runtime is closed');
        const count=javascript.functionsInto[name](...args,destination);
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
        if(closed)fail('Ink runtime is closed');const call=await adapter.capture(prepared);
        return {setup:call.setup,run:()=>serial(async()=>{if(closed)fail('Ink runtime is closed');const result=await call.run();return {...result,backend:'gpu',value:prepared.outputs.length===1?result.values[prepared.outputs[0]]:undefined};}),close:()=>serial(()=>call.close())};
      });
    },
    pipeline: submit,
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
        selector.clear();
      }),
  };
  runtime.run = runtime.call;
  runtime.close = runtime.dispose;
  return runtime;
}
