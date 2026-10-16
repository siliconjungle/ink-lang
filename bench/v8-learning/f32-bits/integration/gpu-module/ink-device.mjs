// Literal packed stage graphs. Scalars are raw lanes; internal lists have a
// logical-length header. Capacity bounds never substitute for logical lengths.
export function graphCapacity(graph, argumentCounts) {
  const capacities=[];
  const count = ref => Object.hasOwn(ref,'param') ? argumentCounts[ref.param] : capacities[ref.node];
  for(const n of graph.nodes) {
    const a=n.args.map(count), c=n.capacity;
    const values=c.args.map(i=>a[i]);
    const size=c.kind==='fixed'?c.value:c.kind==='one'?1:c.kind==='same'?values[0]:c.kind==='min'?Math.min(...values):c.kind==='sum'?values.reduce((x,y)=>x+y,0):NaN;
    if(!Number.isSafeInteger(size)||size<0||size>0xffffffff)throw Error('GPU graph capacity outside u32 bounds');
    capacities.push(size);
  }
  const outputCount=count(graph.output);
  if(!Number.isSafeInteger(outputCount)||outputCount<0||outputCount>0xffffffff)throw Error('GPU graph output capacity outside u32 bounds');
  return {capacities,outputCount};
}

// Most compute dispatches encoded into one command buffer. Long runs are
// split across several submissions; nothing is read back between them.
export const CHUNK_PASSES=2048;
// Upper bound on any parallel stage extent: the scan's top level is a single
// 256-wide group over 256 x 256 blocks.
export const PARALLEL_MAX=256*256*256;
// Workgroup or word quantities of a parallel schedule (see the lowering).
export function quantity(q, extent) {
  const b1=Math.max(1,Math.ceil(extent/256)),b2=Math.max(1,Math.ceil(b1/256));
  switch(q){case 'c':return extent;case 'b1':return b1;case 'b2':return b2;case 'r1':return Math.min(b1,256);case 'one':return 1;}
  throw Error('invalid schedule quantity');
}
// A parallel stage covers its own capacity and every input's.
function scheduleExtent(n, args, caps, own) {
  let extent=caps[own];
  for(const r of n.args) {
    const c=Object.hasOwn(r,'param')?args[r.param]:caps[r.node];
    if(!Number.isSafeInteger(c))throw Error('invalid graph reference');
    extent=Math.max(extent,c);
  }
  return extent;
}
function scratchWords(spec, extent) {
  const w=spec?.words;
  if(!Array.isArray(w)||w.length!==3||!Number.isSafeInteger(w[0])||!Number.isSafeInteger(w[2]))throw Error('invalid scratch size');
  const n=w[0]*quantity(w[1],extent)+w[2];
  if(!Number.isSafeInteger(n))throw Error('scratch size overflow');
  return Math.max(1,n);
}
const isGraph=p=>p.steps.some(s=>s.f.graph_required);
export function dispatchCount(p) {
  if(!isGraph(p))return p.steps.filter(s=>s.count!==0).length;
  return p.steps.reduce((total,s)=>total+(s.f.graph?.nodes??[]).reduce(
    (count,node)=>count+(node.schedule?node.schedule.passes.length:1),0),0);
}
const MAX_DISPATCHES=64*1024*1024;

// Reads that return a few words instead of whole values.
export const lanes=kind=>kind==='u64'?2:1;
// Word offset and type of a dotted record field inside one element.
export function fieldPath(type, path, width) {
  let t=type,offset=0;
  if(path!==undefined&&path!==null) {
    if(typeof path!=='string')throw Error('field must be a dotted path');
    for(const name of path.split('.')) {
      if(t.kind!=='record')throw Error('field path requires a record');
      let found=null;
      for(const f of t.fields){if(f.name===name){found=f.type;break;}offset+=width(f.type);}
      if(!found)throw Error('unknown record field');
      t=found;
    }
  }
  return {offset,type:t};
}
// Scalar lane kind and component count of a reducible element.
export function reducible(t) {
  if(['u32','i32','f32','u64'].includes(t.kind))return {kind:t.kind,components:1};
  if(t.kind==='bool')return {kind:'u32',components:1};
  if(t.kind==='vector') {
    if(['u32','i32','f32'].includes(t.element.kind))return {kind:t.element.kind,components:t.size};
    throw Error('reduce supports u32, i32 and f32 vectors');
  }
  throw Error('reduce supports numeric, Bool and vector values (select a record field)');
}
const f32view=new DataView(new ArrayBuffer(4));
const f32of=w=>{f32view.setUint32(0,w>>>0,true);return f32view.getFloat32(0,true);};
const bitsOf=f=>{f32view.setFloat32(0,f,true);return f32view.getUint32(0,true);};
export function decodeComponents(kind, components, w) {
  const one=i=>{
    if(kind==='i32')return w[i]|0;
    if(kind==='f32'){const f=f32of(w[i]);return Number.isFinite(f)?f:{F32Bits:w[i]>>>0};}
    if(kind==='u64'){const n=BigInt(w[i]>>>0)|(BigInt(w[i+1]>>>0)<<32n);return n<=BigInt(Number.MAX_SAFE_INTEGER)?Number(n):n.toString();}
    return w[i]>>>0;
  };
  return components===1?one(0):Array.from({length:components},(_,c)=>one(c*lanes(kind)));
}
// Exact integer semantics (wrapping); f32 combines in element order.
export function combineWords(kind, op, a, b) {
  if(kind==='u64') {
    const x=BigInt(a[0]>>>0)|(BigInt(a[1]>>>0)<<32n),y=BigInt(b[0]>>>0)|(BigInt(b[1]>>>0)<<32n);
    const r=op==='sum'?(x+y)&0xffffffffffffffffn:op==='min'?(x<y?x:y):(x>y?x:y);
    return [Number(r&0xffffffffn),Number(r>>32n)];
  }
  if(kind==='i32') {const x=a[0]|0,y=b[0]|0;return [(op==='sum'?(x+y)|0:op==='min'?Math.min(x,y):Math.max(x,y))>>>0];}
  if(kind==='f32') {
    const x=f32of(a[0]),y=f32of(b[0]);
    // IEEE minNum/maxNum: a NaN operand yields the other operand.
    const r=op==='sum'?Math.fround(x+y):Number.isNaN(x)?y:Number.isNaN(y)?x:op==='min'?Math.min(x,y):Math.max(x,y);
    return [bitsOf(r)];
  }
  const x=a[0]>>>0,y=b[0]>>>0;
  return [op==='sum'?(x+y)>>>0:op==='min'?Math.min(x,y):Math.max(x,y)];
}
// Generic two-pass reduction kernel, identical to the native device's. Pass 1
// reads elements (an optional length header at word 0), pass 2 combines
// per-workgroup records [valid, values...]. Threads without elements
// contribute nothing, so min/max never need sentinel values.
export function reduceShader(kind, components, op) {
  const pick=(sum,min,max)=>op==='sum'?sum:op==='min'?min:max;
  const [ty,load,store,combine]=kind==='u32'?['u32','data[i]','out[i]=v;',pick('a+b','min(a,b)','max(a,b)')]
    :kind==='i32'?['i32','bitcast<i32>(data[i])','out[i]=bitcast<u32>(v);',pick('a+b','min(a,b)','max(a,b)')]
    :kind==='f32'?['f32','bitcast<f32>(data[i])','out[i]=bitcast<u32>(v);',pick('a+b','min(a,b)','max(a,b)')]
    :['vec2<u32>','vec2<u32>(data[i],data[i+1u])','out[i]=v.x;out[i+1u]=v.y;',pick('vec2<u32>(a.x+b.x,a.y+b.y+select(0u,1u,a.x+b.x<a.x))','select(b,a,a.y<b.y||(a.y==b.y&&a.x<=b.x))','select(b,a,a.y>b.y||(a.y==b.y&&a.x>=b.x))')];
  const l=lanes(kind),c=components,shared=256*c,record=1+c*l;
  return `@group(0) @binding(0) var<storage,read> data:array<u32>;
@group(0) @binding(1) var<storage,read_write> out:array<u32>;
@group(0) @binding(2) var<storage,read> params:array<u32>;
var<workgroup> acc_s:array<${ty},${shared}>;
var<workgroup> ok_s:array<u32,256>;
fn load(i:u32)->${ty}{return ${load};}
fn store(i:u32,v:${ty}){${store}}
fn combine(a:${ty},b:${ty})->${ty}{return ${combine};}
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_id) lid:vec3<u32>,@builtin(workgroup_id) wid:vec3<u32>,@builtin(num_workgroups) nwg:vec3<u32>){
let mode=params[0];
var n=params[2];
if(params[1]==1u){n=data[0];}
let base=params[3];let stride=params[4];let offset=params[5];
let total=nwg.x*256u;
var acc:array<${ty},${c}>;
var ok=0u;
for(var e=wid.x*256u+lid.x;e<n;e+=total){
let at=base+e*stride;
if(mode==2u&&data[at]==0u){continue;}
for(var k=0u;k<${c}u;k++){let v=load(at+offset+k*${l}u);if(ok==0u){acc[k]=v;}else{acc[k]=combine(acc[k],v);}}
ok=1u;
}
for(var k=0u;k<${c}u;k++){acc_s[lid.x*${c}u+k]=acc[k];}
ok_s[lid.x]=ok;
workgroupBarrier();
for(var s=128u;s>0u;s=s>>1u){
if(lid.x<s&&ok_s[lid.x+s]!=0u){
for(var k=0u;k<${c}u;k++){let i=lid.x*${c}u+k;let j=(lid.x+s)*${c}u+k;if(ok_s[lid.x]==0u){acc_s[i]=acc_s[j];}else{acc_s[i]=combine(acc_s[i],acc_s[j]);}}
ok_s[lid.x]=1u;
}
workgroupBarrier();
}
if(lid.x==0u){
let slot=1u+wid.x*${record}u;
out[slot]=ok_s[0];
for(var k=0u;k<${c}u;k++){store(slot+1u+k*${l}u,acc_s[k]);}
if(wid.x==0u){if(mode==1u){out[0]=n;}else{out[0]=data[0];}}
}
}
`;
}

// One device for every pipeline, session and caller-supplied renderer. A
// session uploads its inputs once, keeps every value resident across calls,
// and reads back only what is asked for.
export function createDevice({root, enabled, onLost, fail, width, unpack, MAX_BYTES, device: supplied=null}) {
  let device=supplied, gpuError=enabled?null:"GPU disabled by host option", lost=false;
  const pipelines=new Map(), residents=new Set();
  const watch=d=>d.lost.then(()=>{lost=true;gpuError="GPU device lost";onLost();});
  if(supplied)watch(supplied);
  async function ensureDevice() {
    if(gpuError)fail(gpuError);
    if(lost)fail("GPU device lost");
    if(device)return device;
    if(!globalThis.navigator?.gpu)fail("WebGPU unavailable");
    const adapter=await navigator.gpu.requestAdapter();
    if(!adapter)fail("WebGPU adapter unavailable");
    // Ask for the adapter's buffer limits up to the host budget, so large
    // resident values are not refused by conservative defaults.
    const l=adapter.limits;
    device=await adapter.requestDevice(l?{requiredLimits:{
      maxStorageBufferBindingSize:Math.min(l.maxStorageBufferBindingSize,MAX_BYTES),
      maxBufferSize:Math.min(l.maxBufferSize,MAX_BYTES),
      maxStorageBuffersPerShaderStage:l.maxStorageBuffersPerShaderStage,
    }}:undefined);
    watch(device);
    return device;
  }
  async function scoped(fn) {
    device.pushErrorScope('validation');device.pushErrorScope('out-of-memory');
    let result,error;
    try{result=await fn();}catch(e){error=e;}
    const oom=await device.popErrorScope(),validation=await device.popErrorScope();
    if(error||oom||validation)fail(String(error?.message??error??oom?.message??validation?.message));
    if(lost)fail("GPU device lost");
    return result;
  }
  // Compile a bundled (or generated) shader whose bindings are read-only
  // where marked.
  async function compile(name, readonly, code=null) {
    if(pipelines.has(name))return pipelines.get(name);
    const pipe=await scoped(async()=>{
      code??=await(await fetch(new URL(name,root))).text();
      const layout=device.createBindGroupLayout({entries:readonly.map((ro,binding)=>({binding,visibility:GPUShaderStage.COMPUTE,buffer:{type:ro?'read-only-storage':'storage'}}))});
      return device.createComputePipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[layout]}),compute:{module:device.createShaderModule({code}),entryPoint:'main'}});
    });
    pipelines.set(name,pipe);
    return pipe;
  }
  async function prepare(p) {
    if(p.reason)fail(p.reason);
    if(p.iterations*dispatchCount(p)>MAX_DISPATCHES)fail('GPU dispatch budget exceeded');
    await ensureDevice();
    const limits=device.limits;
    if(isGraph(p)) {
      // Long runs are split into bounded submissions; one iteration's stages
      // must fit in a single submission.
      const stages=p.steps.reduce((n,s)=>n+(s.f.graph?.nodes??[]).reduce((m,node)=>m+(node.schedule?node.schedule.passes.length:1),0),0);
      if(stages>CHUNK_PASSES)fail('GPU graph dispatch budget exceeded');
      for(const s of p.steps) {
        if(!s.f.graph)fail('mixed GPU graph requires a graph descriptor for every function');
        const counts=s.args.map(a=>a.count),cap=graphCapacity(s.f.graph,counts);
        for(const [i,n] of s.f.graph.nodes.entries()) {
          if(n.schedule) {
            const extent=scheduleExtent(n,counts,cap.capacities,i);
            if(extent>PARALLEL_MAX)fail('GPU parallel stage capacity exceeds 256^3');
            for(const pass of n.schedule.passes) {
              if(pass.bind.length>limits.maxStorageBuffersPerShaderStage)fail('GPU graph binding limits');
              if(quantity(pass.groups,extent)>limits.maxComputeWorkgroupsPerDimension)fail('GPU graph workgroup limits');
              await compile(pass.shader,pass.bind.map(b=>Object.hasOwn(b,'arg')));
            }
            continue;
          }
          if(n.args.length+1>limits.maxStorageBuffersPerShaderStage)fail('GPU graph binding limits');
          if(!n.ordered&&Math.ceil(cap.capacities[i]/n.workgroup_size)>limits.maxComputeWorkgroupsPerDimension)fail('GPU graph workgroup limits');
          await compile(n.shader,[...n.args.map(()=>true),false]);
        }
      }
      return;
    }
    for(const s of p.steps) {
      if(s.args.length+2>limits.maxStorageBuffersPerShaderStage)fail("GPU binding limits");
      if(Math.ceil(s.count/64)>limits.maxComputeWorkgroupsPerDimension)fail("GPU workgroup limits");
      await compile(s.f.shader,[...s.args.map(()=>true),false,true]);
    }
  }

  // Device state kept across host calls: inputs uploaded once, every step and
  // graph buffer allocated once, and a global iteration counter.
  function allocator(label) {
    const owned=new Map();let live=0,upload=0,peak=0;
    return {
      get live(){return live},get upload(){return upload},get peak(){return peak},
      make(bytes,usage,words) {
        bytes=Math.max(4,bytes);
        if(bytes>device.limits.maxBufferSize||((usage&GPUBufferUsage.STORAGE)&&bytes>device.limits.maxStorageBufferBindingSize)||live+bytes>MAX_BYTES)fail(label);
        const b=device.createBuffer({size:bytes,usage,mappedAtCreation:!!words});owned.set(b,bytes);live+=bytes;peak=Math.max(peak,live);
        if(words){new Uint32Array(b.getMappedRange()).set(words);b.unmap();upload+=words.byteLength;}
        return b;
      },
      drop(b){if(owned.has(b)){live-=owned.get(b);owned.delete(b);b.destroy();}},
      destroy(){for(const b of owned.keys())b.destroy();owned.clear();live=0;},
    };
  }
  const headed=(c,list)=>{if(!list)return c.words;const w=new Uint32Array(c.words.length+1);w[0]=c.count;w.set(c.words,1);return w;};
  const U=()=>GPUBufferUsage;
  async function open(p) {
    await ensureDevice();
    const A=allocator(isGraph(p)?"GPU graph buffer limits":"GPU buffer limits");
    let r;
    try{r=await scoped(()=>isGraph(p)?openGraph(p,A):openSteps(p,A));}catch(e){A.destroy();throw e;}
    residents.add(r);
    return r;
  }
  function openSteps(p, A) {
    const u=U();
    const input=p.constants.map(c=>A.make(c.words.byteLength+(c.type.kind==="list"?4:0),u.STORAGE|u.COPY_DST,headed(c,c.type.kind==="list")));
    const banks=[0,1].map(()=>p.steps.map(s=>A.make((1+s.count*width(s.f.result))*4,u.STORAGE|u.COPY_SRC|u.COPY_DST|u.VERTEX)));
    const metadata=p.steps.map(s=>A.make((s.args.length+1)*4,u.STORAGE,Uint32Array.from([...s.args.map(a=>a.count),s.count])));
    const groups=p.steps.map((s,i)=>[0,1,2].map(phase=>{
      const bank=phase===2?1:0;
      const entries=s.args.map((a,binding)=>{
        let buffer=a.kind==="step"?banks[bank][a.index]:input[a.index];
        if(a.input&&phase!==0&&p.feedback.has(a.input))buffer=banks[1-bank][p.feedback.get(a.input)];
        return {binding,resource:{buffer}};
      });
      entries.push({binding:s.args.length,resource:{buffer:banks[bank][i]}},{binding:s.args.length+1,resource:{buffer:metadata[i]}});
      return device.createBindGroup({layout:pipelines.get(s.f.shader).getBindGroupLayout(0),entries});
    }));
    return {mode:'steps',A,input,banks,groups,iteration:0,closed:false};
  }
  function openGraph(p, A) {
    const u=U();
    const constants=p.constants.map(c=>{
      const list=c.type.kind==='list';
      return {buffer:A.make(c.words.byteLength+(list?4:0),u.STORAGE|u.COPY_SRC|u.COPY_DST,headed(c,list)),type:c.type,capacity:c.count};
    });
    // Feedback preserves capacity bounds and bindings across iterations.
    // List headers carry changing logical lengths.
    const values=[],dispatches=[];
    for(const s of p.steps) {
      const args=s.args.map(a=>a.kind==='step'?values[a.index]:constants[a.index]);
      const g=s.f.graph,cap=graphCapacity(g,args.map(a=>a.capacity)),nodes=[];
      const resolve=ref=>Object.hasOwn(ref,'param')?args[ref.param]:nodes[ref.node];
      for(const [i,n] of g.nodes.entries()) {
        const count=cap.capacities[i],list=n.result.kind==='list';
        const buffer=A.make((count*width(n.result)+(list?1:0))*4,u.STORAGE|u.COPY_SRC|u.COPY_DST|u.VERTEX);
        const inputs=n.args.map(resolve);
        if(n.schedule) {
          const extent=inputs.reduce((e,a)=>Math.max(e,a.capacity),count);
          const scratch=n.schedule.scratch.map(w=>A.make(scratchWords(w,extent)*4,u.STORAGE));
          for(const pass of n.schedule.passes) {
            const pipe=pipelines.get(pass.shader);if(!pipe)fail('unprepared pass shader');
            const entries=pass.bind.map((b,binding)=>{
              const target=Object.hasOwn(b,'arg')?inputs[b.arg]?.buffer:Object.hasOwn(b,'scratch')?scratch[b.scratch]:buffer;
              if(!target)fail('invalid schedule binding');
              return {binding,resource:{buffer:target}};
            });
            dispatches.push({pipe,group:device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries}),groups:quantity(pass.groups,extent)});
          }
        } else {
          const pipe=pipelines.get(n.shader);
          const group=device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[...inputs.map((a,binding)=>({binding,resource:{buffer:a.buffer}})),{binding:inputs.length,resource:{buffer}}]});
          dispatches.push({pipe,group,groups:n.ordered?1:Math.max(1,Math.ceil(count/n.workgroup_size))});
        }
        nodes.push({buffer,type:n.result,capacity:count});
      }
      values.push(resolve(g.output));
    }
    // Snapshot all sources before publishing any destination: identity
    // outputs may alias inputs, including cycles such as swapping two inputs.
    const pending=[...p.feedback].map(([name,index])=>{
      const source=values[index],target=constants[p.inputs.get(name).index];
      if(JSON.stringify(source.type)!==JSON.stringify(target.type)||source.capacity!==target.capacity)fail('GPU graph feedback capacity/type mismatch');
      const bytes=(source.capacity*width(source.type)+(source.type.kind==='list'?1:0))*4;
      return {input:name,source:source.buffer,target:target.buffer,temporary:A.make(bytes,u.COPY_SRC|u.COPY_DST),bytes,skip:false};
    });
    return {mode:'graph',A,constants,values,dispatches,pending,owed:false,iteration:0,closed:false};
  }
  function live(r){if(r.closed)fail('GPU session closed');if(lost)fail('GPU device lost');}
  // Run more iterations on resident buffers. Nothing is read back. Each
  // dispatch is its own synchronisation scope, so one compute pass carries
  // many dispatches; feedback copies end the pass.
  async function advance(r, p, iterations) {
    live(r);
    if(iterations*dispatchCount(p)>MAX_DISPATCHES)fail('GPU dispatch budget exceeded');
    return scoped(()=>{
      let encoder=null,pass=null,passes=0,dispatches=0,copies=0;
      const end=()=>{if(pass){pass.end();pass=null;}};
      const flush=()=>{end();if(encoder){device.queue.submit([encoder.finish()]);encoder=null;}passes=0;};
      const enc=()=>encoder??=device.createCommandEncoder();
      const dispatch=(pipe,group,groups)=>{
        pass??=enc().beginComputePass();
        pass.setPipeline(pipe);pass.setBindGroup(0,group);pass.dispatchWorkgroups(groups);
        dispatches++;if(++passes>=CHUNK_PASSES)flush();
      };
      if(r.mode==='steps') {
        for(let k=0;k<iterations;k++) {
          const t=r.iteration,phase=t===0?0:t%2?2:1;
          for(let i=0;i<p.steps.length;i++){const s=p.steps[i];if(s.count)dispatch(pipelines.get(s.f.shader),r.groups[i][phase],Math.ceil(s.count/64));}
          r.iteration++;
        }
      } else {
        for(let k=0;k<iterations;k++) {
          // Feedback owed by the previous iteration is published before this
          // one reads its inputs. Every source is snapshotted first.
          if(r.owed) {
            end();const e=enc();
            for(const f of r.pending)if(!f.skip&&f.bytes){e.copyBufferToBuffer(f.source,0,f.temporary,0,f.bytes);copies+=f.bytes;}
            for(const f of r.pending)if(!f.skip&&f.bytes){e.copyBufferToBuffer(f.temporary,0,f.target,0,f.bytes);copies+=f.bytes;}
            for(const f of r.pending)f.skip=false;
          }
          for(const d of r.dispatches)dispatch(d.pipe,d.group,d.groups);
          r.iteration++;r.owed=r.pending.length>0;
        }
      }
      flush();
      return {iteration:r.iteration,dispatches,resident_copy_bytes:copies};
    });
  }
  // One mapping for several ranges, through the session's reusable
  // readback buffer (grown on demand, released with the session).
  async function staging(r, ranges) {
    const total=ranges.reduce((n,x)=>n+x[2],0);
    if(!total)return ranges.map(()=>new Uint32Array());
    if(!r.readback||r.readback.size<total) {
      if(r.readback)r.A.drop(r.readback.buffer);
      r.readback={buffer:r.A.make(total,GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST),size:Math.max(4,total)};
    }
    const b=r.readback.buffer,e=device.createCommandEncoder();let at=0;
    for(const [source,offset,bytes] of ranges){if(bytes)e.copyBufferToBuffer(source,offset,b,at,bytes);at+=bytes;}
    device.queue.submit([e.finish()]);
    await b.mapAsync(GPUMapMode.READ,0,total);
    let all;try{all=new Uint32Array(b.getMappedRange(0,total),0,total/4).slice();}finally{b.unmap();}
    at=0;return ranges.map(x=>{const w=all.subarray(at/4,(at+x[2])/4);at+=x[2];return w;});
  }
  function location(r, p, i) {
    const s=p.steps[i];if(!s)fail('unknown step');
    if(r.mode==='steps') {
      if(!r.iteration)fail('session has not run an iteration');
      return {buffer:r.banks[(r.iteration-1)%2][i],header:true,type:s.f.result,capacity:s.count??0};
    }
    const v=r.values[i];
    return {buffer:v.buffer,header:v.type.kind==='list',type:v.type,capacity:v.capacity};
  }
  // Whole step values. Element-wise steps copy their bounded result in one
  // transfer; graph lists read the header, then the populated lanes.
  async function readOutputs(r, p, ids) {
    const values={};let readback=0;
    for(const id of ids) {
      const i=stepIndex(p,id);
      const l=location(r,p,i),w=width(l.type);
      if(r.mode==='steps') {
        const bytes=(1+l.capacity*w)*4,[words]=await staging(r,[[l.buffer,0,bytes]]);readback+=bytes;
        const count=words[0];if(count*w>words.length-1)fail('invalid GPU result length');
        values[id]=unpack(words.subarray(1,1+count*w),l.type);
      } else {
        let count=1;
        if(l.header){count=(await staging(r,[[l.buffer,0,4]]))[0][0];readback+=4;}
        if(count>l.capacity)fail('GPU graph output length exceeds capacity');
        const bytes=count*w*4,[words]=await staging(r,[[l.buffer,l.header?4:0,bytes]]);readback+=bytes;
        values[id]=unpack(words,l.type);
      }
    }
    return {values,readback};
  }
  const stepIndex=(p,id)=>{if(typeof id!=='string')fail('read requires a step id');const i=p.ids.get(id);if(i===undefined)fail('unknown step');return i;};
  async function read(r, p, q) {
    live(r);
    if(!r.iteration)fail('session has not run an iteration');
    return scoped(async()=>{
      if(q?.outputs!==undefined) {
        if(!Array.isArray(q.outputs))fail('outputs must be an array');
        const {values,readback}=await readOutputs(r,p,q.outputs);
        return {values,counters:{readback_bytes:readback}};
      }
      const i=stepIndex(p,q?.step),l=location(r,p,i),list=l.type.kind==='list';
      const element=list?l.type.element:l.type,w=width(element);
      const header=words=>{const n=words[0];if(n>l.capacity)fail('GPU length exceeds capacity');return n;};
      if(q.length===true) {
        const n=l.header?header((await staging(r,[[l.buffer,0,4]]))[0]):1;
        return {length:n,counters:{readback_bytes:l.header?4:0}};
      }
      if(q.slice!==undefined) {
        if(!Array.isArray(q.slice)||q.slice.length!==2)fail('slice must be [start, count]');
        if(!q.slice.every(x=>Number.isSafeInteger(x)&&x>=0))fail('slice bounds must be naturals');
        if(!list)fail('slice requires a list value');
        const start=Math.min(q.slice[0],l.capacity),take=Math.min(q.slice[1],l.capacity-start);
        const [head,part]=await staging(r,[[l.buffer,0,4],[l.buffer,4+start*w*4,take*w*4]]);
        const n=header(head),available=Math.min(Math.max(0,n-start),take);
        return {value:unpack(part.subarray(0,available*w),l.type),length:n,start:Math.min(start,n),counters:{readback_bytes:4+take*w*4}};
      }
      if(typeof q.reduce==='string') {
        const {offset,type:field}=fieldPath(element,q.field,width),{kind,components}=reducible(field);
        const ops=['sum','min','max'].includes(q.reduce)?[q.reduce]:q.reduce==='bounds'?['min','max']:fail('reduce must be sum, min, max or bounds');
        const results=[];let length=0;
        for(const op of ops){const out=await reduce(r,l,w,offset,kind,components,op);length=out.length;results.push(out.value);}
        return {value:q.reduce==='bounds'?{min:results[0],max:results[1]}:results[0],length,counters:{readback_bytes:ops.length*4*(2+components*lanes(kind)),dispatches:ops.length*2}};
      }
      fail('read requires outputs, length, slice or reduce');
    });
  }
  // Two-pass workgroup tree reduction. Integer sums wrap exactly; f32 sums
  // use tree order.
  async function reduce(r, l, stride, offset, kind, components, op) {
    const name=`ink-reduce-${kind}-${components}-${op}`;
    const pipe=await compile(name,[true,false,true],reduceShader(kind,components,op));
    const record=1+components*lanes(kind),groups=Math.min(256,Math.max(1,Math.ceil(l.capacity/256)));
    const A=r.A,u=U(),made=[];
    const temp=(bytes,usage,words)=>{const b=A.make(bytes,usage,words);made.push(b);return b;};
    try {
      const partial=temp((1+groups*record)*4,u.STORAGE),result=temp((1+record)*4,u.STORAGE|u.COPY_SRC);
      const p1=temp(24,u.STORAGE,Uint32Array.of(1,l.header?1:0,l.header?0:1,l.header?1:0,stride,offset));
      const p2=temp(24,u.STORAGE,Uint32Array.of(2,0,groups,1,record,1));
      const group=(data,out,params)=>device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[data,out,params].map((buffer,binding)=>({binding,resource:{buffer}}))});
      const e=device.createCommandEncoder(),pass=e.beginComputePass();
      pass.setPipeline(pipe);pass.setBindGroup(0,group(l.buffer,partial,p1));pass.dispatchWorkgroups(groups);
      pass.setBindGroup(0,group(partial,result,p2));pass.dispatchWorkgroups(1);pass.end();
      device.queue.submit([e.finish()]);
      const [words]=await staging(r,[[result,0,(1+record)*4]]);
      const n=words[0];if(n>l.capacity)fail('GPU length exceeds capacity');
      const value=words[1]===0?(op==='sum'?decodeComponents(kind,components,new Uint32Array(components*lanes(kind))):null):decodeComponents(kind,components,words.subarray(2,2+components*lanes(kind)));
      return {length:n,value};
    } finally {for(const b of made)A.drop(b);}
  }
  // Replace a named input for the next iteration. A fed-back input's carried
  // value is its step's last output, which this replaces.
  async function write(r, p, input, d) {
    live(r);
    const reference=p.inputs.get(input);if(!reference)fail('unknown pipeline input');
    const list=reference.type.kind==='list';
    return scoped(()=>{
      let words;
      if(r.mode==='steps') {
        if(d.count!==reference.count)fail('steps sessions keep input shapes; reopen to change a length');
        const step=p.feedback.get(input);
        let target;
        if(step!==undefined&&r.iteration>0){words=headed(d,true);target=r.banks[(r.iteration-1)%2][step];}
        else{words=headed(d,list);target=r.input[reference.index];}
        device.queue.writeBuffer(target,0,words);
      } else {
        const target=r.constants[reference.index];
        if(d.count>target.capacity||(!list&&d.count!==1))fail('written input exceeds the session capacity');
        words=headed(d,list);
        // Replace the carried output when it has its own buffer; the owed
        // copy then publishes it. An output aliasing an input buffer is
        // replaced at the input, and its owed copy is skipped.
        const step=p.feedback.get(input),carried=step!==undefined&&r.iteration>0?r.values[step]:null;
        if(carried&&!r.constants.some(c=>c.buffer===carried.buffer))device.queue.writeBuffer(carried.buffer,0,words);
        else{device.queue.writeBuffer(target.buffer,0,words);for(const f of r.pending)if(f.input===input)f.skip=true;}
      }
      return {counters:{upload_bytes:words.byteLength}};
    });
  }
  // The device buffer currently holding a step's value, for a renderer or
  // another pipeline on the same device. `offset` is the byte offset of
  // element 0; when `header` is set, word 0 holds the logical element count.
  // Valid until the next step, write or close of this session.
  function view(r, p, i) {
    live(r);
    const l=location(r,p,i);
    return {buffer:l.buffer,offset:l.header?4:0,header:l.header,type:l.type,capacity:l.capacity};
  }
  function close(r){if(r.closed)return;r.closed=true;r.A.destroy();residents.delete(r);}
  const finish=async()=>{if(device&&!lost)await device.queue.onSubmittedWorkDone();};

  // One-shot pipeline: open, run every iteration, read the outputs, release.
  async function run(p) {
    const r=await open(p);
    try {
      const a=await advance(r,p,p.iterations);
      const out=await scoped(()=>readOutputs(r,p,p.outputs));
      return {values:out.values,counters:{upload_bytes:r.A.upload,readback_bytes:out.readback,dispatches:a.dispatches,live_buffer_bytes:r.A.peak,resident_copy_bytes:a.resident_copy_bytes}};
    } finally {close(r);}
  }
  // A prepared invocation owns fixed captured inputs and device storage. Each
  // run submits the literal active route and returns a fresh full host result.
  async function capture(p) {
    if(p.feedback.size)fail('prepared GPU feedback is unsupported');
    await prepare(p);
    const r=await open(p);
    // Readback storage is sized once, so repeated runs allocate nothing.
    try {
      const most=p.outputs.reduce((n,id)=>{const l=location({...r,iteration:1},p,p.ids.get(id));return Math.max(n,(l.capacity*width(l.type)+1)*4);},4);
      r.readback={buffer:r.A.make(most,GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST),size:most};
    } catch(e){close(r);throw e;}
    const setup=Object.freeze({upload_bytes:r.A.upload,live_buffer_bytes:r.A.live,dispatches:0,readback_bytes:0});
    return {setup,async run(){
      try {
        const a=await advance(r,p,p.iterations);
        const out=await scoped(()=>readOutputs(r,p,p.outputs));
        return {values:out.values,counters:{upload_bytes:0,readback_bytes:out.readback,dispatches:a.dispatches,live_buffer_bytes:r.A.live,resident:true}};
      } catch(e){close(r);throw e;}
    },close:()=>close(r)};
  }
  // Read-only cost context. A prepared device does not imply that this plan's
  // shaders have been compiled, and partial preparation can survive a failure.
  function preparation(p){
    const names=isGraph(p)?p.steps.flatMap(s=>(s.f.graph?.nodes??[]).flatMap(n=>n.schedule?n.schedule.passes.map(pass=>pass.shader):[n.shader])):p.steps.map(s=>s.f.shader);
    const ready=!!device&&!lost&&!gpuError;
    return {device:ready,shaders:[...new Set(names)].sort().map(name=>[name,ready&&pipelines.has(name)])};
  }
  return {prepare,preparation,run,capture,open,advance,read,write,view,finish,close:closeAll,
    closeSession:close,handle:()=>device,
  };
  function closeAll(){for(const r of [...residents])close(r);if(!supplied)device?.destroy();lost=true;gpuError="engine disposed";pipelines.clear();}
}
