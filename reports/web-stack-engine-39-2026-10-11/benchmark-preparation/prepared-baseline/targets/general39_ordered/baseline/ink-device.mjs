// Literal packed stage graphs. Scalars are raw lanes; internal lists have a
// logical-length header. Capacity bounds never substitute for logical lengths.
export function graphCapacity(graph, argumentCounts) {
  const capacities=[];
  const count = ref => Object.hasOwn(ref,'param') ? argumentCounts[ref.param] : capacities[ref.node];
  for(const n of graph.nodes) {
    const a=n.args.map(count), c=n.capacity;
    const values=c.args.map(i=>a[i]);
    const size=c.kind==='one'?1:c.kind==='same'?values[0]:c.kind==='min'?Math.min(...values):c.kind==='sum'?values.reduce((x,y)=>x+y,0):NaN;
    if(!Number.isSafeInteger(size)||size<0||size>0xffffffff)throw Error('GPU graph capacity outside u32 bounds');
    capacities.push(size);
  }
  const outputCount=count(graph.output);
  if(!Number.isSafeInteger(outputCount)||outputCount<0||outputCount>0xffffffff)throw Error('GPU graph output capacity outside u32 bounds');
  return {capacities,outputCount};
}
function createGraphDevice({root, fail, width, unpack, MAX_BYTES, getDevice, pipelines}) {
  async function prepare(p) {
    if(p.feedback.size)fail('GPU literal graph feedback is unsupported');
    if(p.iterations*p.steps.reduce((n,s)=>n+(s.f.graph?.nodes.length??0),0)>65536)fail('GPU graph dispatch budget exceeded');
    for(const s of p.steps) {
      if(!s.f.graph)fail('mixed GPU graph requires a graph descriptor for every function');
      const cap=graphCapacity(s.f.graph,s.args.map(a=>a.count));
      const device=getDevice();
      for(const [i,n] of s.f.graph.nodes.entries()) {
        if(n.args.length+1>device.limits.maxStorageBuffersPerShaderStage)fail('GPU graph binding limits');
        if(!n.ordered && Math.ceil(cap.capacities[i]/n.workgroup_size)>device.limits.maxComputeWorkgroupsPerDimension)fail('GPU graph workgroup limits');
        if(pipelines.has(n.shader))continue;
        device.pushErrorScope('validation');device.pushErrorScope('out-of-memory');
        let error,pipe;
        try {
          const code=await(await fetch(new URL(n.shader,root))).text();
          const bindings=device.createBindGroupLayout({entries:Array.from({length:n.args.length+1},(_,binding)=>({binding,visibility:GPUShaderStage.COMPUTE,buffer:{type:binding===n.args.length?'storage':'read-only-storage'}}))});
          pipe=await device.createComputePipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[bindings]}),compute:{module:device.createShaderModule({code}),entryPoint:'main'}});
        }catch(e){error=e;}
        const oom=await device.popErrorScope(),validation=await device.popErrorScope();
        if(error||oom||validation)fail(String(error??oom?.message??validation?.message));
        pipelines.set(n.shader,pipe);
      }
    }
  }
  async function run(p) {
    const device=getDevice(),owned=[];
    let liveBytes=0;
    const counters={upload_bytes:0,readback_bytes:0,dispatches:0,live_buffer_bytes:0};
    device.pushErrorScope('validation');device.pushErrorScope('out-of-memory');
    let result,error;
    try {
      const make=(bytes,usage,words)=>{
        bytes=Math.max(4,bytes);
        if(bytes>device.limits.maxBufferSize||((usage&GPUBufferUsage.STORAGE)&&bytes>device.limits.maxStorageBufferBindingSize)||liveBytes+bytes>MAX_BYTES)fail('GPU graph buffer limits');
        const b=device.createBuffer({size:bytes,usage,mappedAtCreation:!!words});owned.push(b);liveBytes+=bytes;counters.live_buffer_bytes=Math.max(counters.live_buffer_bytes,liveBytes);
        if(words){new Uint32Array(b.getMappedRange()).set(words);b.unmap();counters.upload_bytes+=words.byteLength;}
        return b;
      };
      const constants=p.constants.map(c=>{
        const list=c.type.kind==='list';
        const words=list?new Uint32Array(c.words.length+1):c.words;
        if(list){words[0]=c.count;words.set(c.words,1);}
        return {buffer:make(words.byteLength,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC,words),type:c.type,capacity:c.count};
      });
      // No feedback: capacities and bindings are invariant across requested
      // iterations. Reuse stage buffers; commands still execute every stage.
      const values=[],stages=[];
      for(const s of p.steps) {
        const args=s.args.map(a=>a.kind==='step'?values[a.index]:constants[a.index]);
        const g=s.f.graph,cap=graphCapacity(g,args.map(a=>a.capacity)),nodes=[];
        const resolve=ref=>Object.hasOwn(ref,'param')?args[ref.param]:nodes[ref.node];
        for(const [i,n] of g.nodes.entries()) {
          const count=cap.capacities[i],list=n.result.kind==='list';
          const buffer=make((count*width(n.result)+(list?1:0))*4,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC);
          const pipe=pipelines.get(n.shader),inputs=n.args.map(resolve);
          const group=device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[...inputs.map((a,binding)=>({binding,resource:{buffer:a.buffer}})),{binding:inputs.length,resource:{buffer}}]});
          stages.push({pipe,group,groups:n.ordered?1:Math.max(1,Math.ceil(count/n.workgroup_size))});
          nodes.push({buffer,type:n.result,capacity:count});
        }
        values.push(resolve(g.output));
      }
      const encoder=device.createCommandEncoder();
      for(let iter=0;iter<p.iterations;iter++) for(const s of stages) {
        const pass=encoder.beginComputePass();pass.setPipeline(s.pipe);pass.setBindGroup(0,s.group);
        pass.dispatchWorkgroups(s.groups);pass.end();counters.dispatches++;
      }
      device.queue.submit([encoder.finish()]);
      const output=Object.fromEntries(p.outputs.map(id=>[id,values[p.ids.get(id)]]));
      // Read a list header before copying its exact populated lanes. All
      // intermediate data and dynamic lengths remain resident across stages.
      const read=async(buffer,offset,bytes)=>{
        if(!bytes)return new Uint32Array();
        const b=make(bytes,GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST);
        const encoder=device.createCommandEncoder();encoder.copyBufferToBuffer(buffer,offset,b,0,bytes);device.queue.submit([encoder.finish()]);
        counters.readback_bytes+=bytes;await b.mapAsync(GPUMapMode.READ);const words=new Uint32Array(b.getMappedRange(),0,bytes/4).slice();b.unmap();b.destroy();liveBytes-=Math.max(4,bytes);return words;
      };
      const valuesOut={};
      for(const [id,v] of Object.entries(output)) {
        const list=v.type.kind==='list';let count=1;
        if(list){count=(await read(v.buffer,0,4))[0];if(count>v.capacity)fail('GPU graph length exceeds capacity');}
        const words=await read(v.buffer,list?4:0,count*width(v.type)*4);
        valuesOut[id]=unpack(words,v.type);
      }
      result={values:valuesOut,counters};
    }catch(e){error=e;}
    finally {
      const oom=await device.popErrorScope(),validation=await device.popErrorScope();
      for(const b of owned)b.destroy();
      if(error||oom||validation)fail(String(error??oom?.message??validation?.message));
    }
    return result;
  }
  return {prepare,run};
}

export function createDevice({root, enabled, onLost, fail, width, unpack, MAX_BYTES}) {
  let device=null, gpuError=enabled?null:"GPU disabled by host option", lost=false;
  const pipelines=new Map();
  const graph=createGraphDevice({root,fail,width,unpack,MAX_BYTES,getDevice:()=>device,pipelines});
  async function prepare(p) {
    if (p.reason) fail(p.reason);
    if (gpuError) fail(gpuError);
    if (lost) fail("GPU device lost");
    if (!device) {
      if (!globalThis.navigator?.gpu) fail("WebGPU unavailable");
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) fail("WebGPU adapter unavailable");
      device = await adapter.requestDevice();
      device.lost.then(() => {
        lost = true;
        gpuError = "GPU device lost";
        onLost();
      });
    }
    if(p.steps.some(s=>s.f.graph_required)) return graph.prepare(p);
    for (const s of p.steps) {
      if (s.args.length + 2 > device.limits.maxStorageBuffersPerShaderStage)
        fail("GPU binding limits");
      if (
        Math.ceil(s.count / 64) > device.limits.maxComputeWorkgroupsPerDimension
      )
        fail("GPU workgroup limits");
      if (!pipelines.has(s.f.shader)) {
        device.pushErrorScope("validation");
        device.pushErrorScope("out-of-memory");
        let pipeline, error;
        try {
          const code = await (await fetch(new URL(s.f.shader, root))).text();
          const bindings = device.createBindGroupLayout({
            entries: Array.from(
              { length: s.args.length + 2 },
              (_, binding) => ({
                binding,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                  type:
                    binding === s.args.length ? "storage" : "read-only-storage",
                },
              }),
            ),
          });
          pipeline = await device.createComputePipelineAsync({
            layout: device.createPipelineLayout({
              bindGroupLayouts: [bindings],
            }),
            compute: {
              module: device.createShaderModule({ code }),
              entryPoint: "main",
            },
          });
        } catch (e) {
          error = e;
        }
        const oom = await device.popErrorScope(),
          validation = await device.popErrorScope();
        if (error || oom || validation)
          fail(String(error ?? oom?.message ?? validation?.message));
        pipelines.set(s.f.shader, pipeline);
      }
    }
  }
  async function runGpu(p) {
    if(p.steps.some(s=>s.f.graph_required)) {const result=await graph.run(p);if(lost)fail("GPU device lost");return result;}
    const owned = [];
    device.pushErrorScope("validation");
    device.pushErrorScope("out-of-memory");
    let result, error;
    try {
      const make = (bytes, usage, words) => {
        bytes = Math.max(4, bytes);
        if (
          bytes > device.limits.maxBufferSize ||
          (usage & GPUBufferUsage.STORAGE &&
            bytes > device.limits.maxStorageBufferBindingSize)
        )
          fail("GPU buffer limits");
        const b = device.createBuffer({
          size: bytes,
          usage,
          mappedAtCreation: !!words,
        });
        owned.push(b);
        if (words) {
          new Uint32Array(b.getMappedRange()).set(words);
          b.unmap();
        }
        return b;
      };
      const input = p.constants.map((c) =>
        make(c.words.byteLength+(c.type.kind==="list"?4:0), GPUBufferUsage.STORAGE, c.type.kind==="list"?Uint32Array.from([c.count,...c.words]):c.words),
      );
      const banks = [0, 1].map(() =>
        p.steps.map((s) =>
          make(
            (1+s.count * width(s.f.result)) * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
          ),
        ),
      );
      const metadata = p.steps.map((s) =>
        make(
          (s.args.length + 1) * 4,
          GPUBufferUsage.STORAGE,
          Uint32Array.from([...s.args.map((a) => a.count), s.count]),
        ),
      );
      const groups = p.steps.map((s, i) =>
        [0, 1, 2].map((phase) => {
          const bank = phase === 2 ? 1 : 0;
          const entries = s.args.map((a, binding) => {
            let buffer =
              a.kind === "step" ? banks[bank][a.index] : input[a.index];
            if (a.input && phase !== 0 && p.feedback.has(a.input))
              buffer = banks[1 - bank][p.feedback.get(a.input)];
            return { binding, resource: { buffer } };
          });
          entries.push(
            { binding: s.args.length, resource: { buffer: banks[bank][i] } },
            { binding: s.args.length + 1, resource: { buffer: metadata[i] } },
          );
          return device.createBindGroup({
            layout: pipelines.get(s.f.shader).getBindGroupLayout(0),
            entries,
          });
        }),
      );
      const encoder = device.createCommandEncoder();
      for (let iter = 0; iter < p.iterations; iter++) {
        const phase = iter === 0 ? 0 : iter % 2 ? 2 : 1;
        for (let i = 0; i < p.steps.length; i++) {
          const s = p.steps[i];
          if (!s.count) continue;
          const pass = encoder.beginComputePass();
          pass.setPipeline(pipelines.get(s.f.shader));
          pass.setBindGroup(0, groups[i][phase]);
          pass.dispatchWorkgroups(Math.ceil(s.count / 64));
          pass.end();
        }
      }
      const reads = p.outputs.map((id) => {
        const i = p.ids.get(id),
          bytes = (1+p.steps[i].count * width(p.steps[i].f.result)) * 4;
        const b = make(
          bytes,
          GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        );
        if (bytes)
          encoder.copyBufferToBuffer(
            banks[(p.iterations - 1) % 2][i],
            0,
            b,
            0,
            bytes,
          );
        return { id, b, bytes };
      });
      device.queue.submit([encoder.finish()]);
      const values = {};
      for (const { id, b, bytes } of reads) {
        await b.mapAsync(GPUMapMode.READ);
        const words=new Uint32Array(b.getMappedRange(),0,bytes/4).slice();
        const type=p.steps[p.ids.get(id)].f.result, count=words[0];
        if(count*width(type)>words.length-1)fail("invalid GPU result length");
        values[id]=unpack(words.slice(1,1+count*width(type)),type);
        b.unmap();
      }
      result = {
        values,
        counters: {
          upload_bytes:
            p.constants.reduce((n, c) => n + c.words.byteLength+(c.type.kind==="list"?4:0), 0) +
            p.steps.reduce((n, s) => n + (s.args.length + 1) * 4, 0),
          readback_bytes: reads.reduce((n, r) => n + r.bytes, 0),
          dispatches: p.steps.filter((s) => s.count).length * p.iterations,
          live_buffer_bytes: p.bytes,
        },
      };
    } catch (e) {
      error = e;
    } finally {
      const oom = await device.popErrorScope(),
        validation = await device.popErrorScope();
      for (const b of owned) b.destroy();
      if (error || oom || validation)
        fail(String(error ?? oom?.message ?? validation?.message));
    }
    if (lost) fail("GPU device lost");
    return result;
  }

  return {prepare, run:runGpu, close(){device?.destroy();lost=true;gpuError="engine disposed";pipelines.clear();}};
}
