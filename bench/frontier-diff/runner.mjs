// All inputs are immutable. Each implementation returns an owned logical result.
const need=(x,m)=>{if(!x)throw Error(m)};
export function digest(value){
  let h=2166136261;
  const visit=x=>{
    if(typeof x==='number'){h=Math.imul(h^(x>>>0),16777619)>>>0;}
    else if(typeof x==='string'){for(let i=0;i<x.length;i++)h=Math.imul(h^x.charCodeAt(i),16777619)>>>0;}
    else if(Array.isArray(x)||ArrayBuffer.isView(x)){for(const v of x)visit(v);}
    else if(x&&typeof x==='object'){for(const v of Object.values(x))visit(v);}
  };
  visit(value);return h;
}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function shuffle(a,rng){a=[...a];for(let i=a.length-1;i>0;i--){const j=rng()%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function random(seed){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0}}
async function json(url){const r=await fetch(url);need(r.ok,'fetch '+url);return r.json()}

export async function run(base,{browser=false,validateOnly=false,progress=()=>{},rounds=5,prepared=false}={}){
  const fixtures=await json(new URL('fixtures.json',base));
  const frontier=await import(new URL('frontier/package/dist/index.js',base));
  const javascript=await import(new URL('ink/program.mjs',base));
  const {pack,unpack}=await import(new URL('ink/ink-abi.mjs',base));
  const {loadInk}=await import(new URL('ink/ink-gpu.mjs',base));
  const engine=await loadInk(new URL('ink/',base),{gpu:browser});
  const out={schema:1,prepared,host:browser?navigator.userAgent:process.version,status:'running',
    protocol:{rounds,warmups:3,target_ms:5,max_iterations:4096,seed:71331,
      timed_scope:'whole call and full representation digest; packing/upload/readback included for full Wasm/GPU',
      validation:'complete results before and after every timed batch; frontier replay independently checked'},
    validation:[],availability:[],unsupported:[],setup:[],samples:[],calibration:[]};
  if(browser){
    need(navigator.gpu,'WebGPU is required for the browser run');
    const adapter=await navigator.gpu.requestAdapter();need(adapter,'WebGPU adapter unavailable');
    const info=adapter.info;out.adapter={vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,isFallbackAdapter:adapter.isFallbackAdapter??null};
  }
  const rng=random(71331);let sink=0;
  try{
    for(const fixture of fixtures){
      if(fixture.kind==='rows-shared'){
        const changed=new Set(fixture.edits.map(e=>e.index));
        fixture.after=fixture.after.map((r,i)=>changed.has(i)?r:fixture.before[i]);
      }
      const {before,after,dirty,edits}=fixture,prefix=fixture.kind==='scalar'?'scalar':'rows';
      const hint=prefix==='scalar'?{dirtyPaths:dirty.map(i=>[i])}:{dirtyRows:[{path:[],rows:dirty}]};
      const patch=frontier.diff(before,after);
      need(equal(frontier.applyPatchImmutable(before,patch),after),'Frontier full diff/replay '+fixture.id);
      const hinted=frontier.diff(before,after,hint);
      need(equal(frontier.applyPatchImmutable(before,hinted),after),'Frontier hinted replay '+fixture.id);
      out.validation.push({case:fixture.id,kind:fixture.kind,rows:fixture.rows,mode:fixture.mode,changes:fixture.changes,
        frontier_ops:patch.length,frontier_patch_bytes:new TextEncoder().encode(JSON.stringify(patch)).length,
        ink_edits:edits.length,ink_patch_bytes:new TextEncoder().encode(JSON.stringify(edits)).length});
      const phases=['diff','hint','apply','roundtrip'];
      if(prefix==='scalar'&&edits.length<=256)phases.push('apply-probe');
      for(const phase of phases){
        const fn=phase==='diff'?prefix+'_diff':phase==='hint'?prefix+'_hint':phase==='apply-probe'?'scalar_apply_probe':prefix+'_apply';
        const args=phase==='diff'?[before,after]:phase==='hint'?[before,after,dirty]:[before,edits];
        const expected=phase==='diff'||phase==='hint'?edits:after;
        const expectedFrontier=phase==='diff'?patch:phase==='hint'?hinted:after;
        const variants={
          frontier:{async:false,expected:expectedFrontier,run:()=>phase==='diff'?frontier.diff(before,after):phase==='hint'?frontier.diff(before,after,hint):phase==='roundtrip'?frontier.applyPatchImmutable(before,frontier.diff(before,after)):frontier.applyPatchImmutable(before,patch)},
          'ink-javascript':{async:false,expected,run:()=>phase==='roundtrip'?javascript.call(prefix+'_apply',[before,javascript.call(prefix+'_diff',[before,after])]):javascript.call(fn,args)},
          'ink-wasm-full':{async:true,expected,run:async()=>phase==='roundtrip'?(await engine.call(prefix+'_apply',[before,(await engine.call(prefix+'_diff',[before,after],{backend:'cpu'})).value],{backend:'cpu'})).value:(await engine.call(fn,args,{backend:'cpu'})).value},
        };
        if(browser){
          if(['diff','hint','apply-probe'].includes(phase)){
            variants['ink-webgpu-full']={async:true,gpu:true,expected,run:async()=>{
              const result=await engine.call(fn,args,{backend:'gpu-required'});
              need(result.backend==='gpu','GPU fallback forbidden');
              out.last_counters=result.counters;return result.value;
            }};
          }else out.unsupported.push({case:fixture.id,phase,variant:'ink-webgpu-full',reason:'dynamic owned-buffer replay is not GPU-admitted; CPU fallback not timed as GPU'});
        }
        const preparedResources=[];
        if(prepared&&phase!=='roundtrip'){
          const f=engine.manifest.functions.find(f=>f.name===fn),packedExpected=Array.from(pack(expected,f.result).words);
          let t=performance.now();const cpu=await engine.prepareCpuCall(fn,args,fixture.rows*(prefix==='scalar'?2:6));
          preparedResources.push(cpu);out.setup.push({case:fixture.id,phase,variant:'ink-wasm-prepared',capture_ms:performance.now()-t});
          variants['ink-wasm-prepared']={async:false,expected:packedExpected,packedType:f.result,run:()=>Array.from(cpu.run())};
          if(browser&&['diff','hint','apply-probe'].includes(phase)){
            t=performance.now();const gpu=await engine.prepareGpuPipeline({steps:[{id:'result',call:fn,args}],outputs:['result'],iterations:1});
            preparedResources.push(gpu);out.setup.push({case:fixture.id,phase,variant:'ink-webgpu-resident',capture_ms:performance.now()-t,details:gpu.setup});
            variants['ink-webgpu-resident']={async:true,gpu:true,expected,run:async()=>{const r=await gpu.run();need(r.backend==='gpu'&&r.counters.upload_bytes===0,'resident GPU contract');out.last_counters=r.counters;return r.value??r.values.result;}};
          }
        }
        const initialBefore=JSON.stringify(before),initialAfter=JSON.stringify(after);
        for(const [name,v] of Object.entries(variants)){
          const t=performance.now();const value=await v.run();need(equal(value,v.expected),fixture.id+'/'+phase+'/'+name+' output');
          if(v.packedType)need(equal(unpack(Uint32Array.from(value),v.packedType),expected),'prepared Wasm decoded output');
          out.setup.push({case:fixture.id,phase,variant:name,first_call_ms:performance.now()-t});
          if(v.gpu)out.availability.push({case:fixture.id,phase,variant:name,backend:'gpu',counters:out.last_counters});
          v.expectedDigest=digest(v.expected);
        }
        out.validation.push({case:fixture.id,phase,variants:Object.keys(variants),passed:true});
        if(validateOnly){for(const r of preparedResources)await r.close();continue;}
        async function batch(name,n){
          const v=variants[name];let hash=0,last;const t=performance.now();
          if(v.async){for(let i=0;i<n;i++){last=await v.run();hash=(hash+digest(last))>>>0}}
          else {for(let i=0;i<n;i++){last=v.run();hash=(hash+digest(last))>>>0}}
          const elapsed=performance.now()-t;
          need(hash===Math.imul(v.expectedDigest,n)>>>0,'timed digest '+fixture.id+'/'+phase+'/'+name);
          need(equal(last,v.expected),'timed output '+fixture.id+'/'+phase+'/'+name);
          sink=(sink+hash)>>>0;return {iterations:n,elapsed_ms:elapsed,ns_per_call:elapsed*1e6/n,digest:hash};
        }
        const iterations={};
        for(const name of shuffle(Object.keys(variants),rng)){
          for(let i=0;i<3;i++)need(equal(await variants[name].run(),variants[name].expected),'warmup result');
          let n=1,row;
          for(;;){row=await batch(name,n);if(row.elapsed_ms>=5||n===4096)break;n*=2;}
          iterations[name]=n;out.calibration.push({case:fixture.id,phase,variant:name,...row});
        }
        for(let round=0;round<rounds;round++)for(const name of shuffle(Object.keys(variants),rng)){
          need(equal(await variants[name].run(),variants[name].expected),'pre-batch output');
          const measured=await batch(name,iterations[name]);
          need(equal(await variants[name].run(),variants[name].expected),'post-batch output');
          out.samples.push({case:fixture.id,kind:fixture.kind,rows:fixture.rows,mode:fixture.mode,phase,variant:name,round,...measured,
            ...(variants[name].gpu?{actual_backend:'gpu',counters:out.last_counters}:{})});
        }
        need(JSON.stringify(before)===initialBefore&&JSON.stringify(after)===initialAfter,'input mutation '+fixture.id);
        for(const r of preparedResources)await r.close();
      }
      progress(fixture.id);
    }
    out.status='passed';out.sink=sink;return out;
  }finally{await engine.dispose();}
}
