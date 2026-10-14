// Conformance replay across the state-module and stateless packed/scalar ABIs.
// Pure packed hosts expose values, not logical checkpoints. Never fabricate a
// snapshot for them or allow stateful fixtures to pass through that path.
export async function replayContracts(host,{name,steps,wanted}) {
  const abi=host.manifest.runtime_abi;
  const stateful=abi==='ink-module-v1';
  if(!stateful&&!['ink-packed-pipeline-v2','ink-scalar-pipeline-v1'].includes(abi))throw Error(`unsupported contract replay ABI: ${abi}`);
  if(!stateful&&steps.some(s=>!s.pure||s.reject_restore))throw Error(`${name}: state fixture requires state-module ABI`);
  if(steps.filter(s=>!s.reject_restore).length!==wanted.length)throw Error(`${name}: fixture reply count differs`);
  const normalize=v=>typeof v==='bigint'?String(v):typeof v==='number'&&Number.isInteger(v)?Object.is(v,-0)?'negative zero':String(v):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
  const exact=v=>JSON.stringify(normalize(v));
  const typed=(v,t)=>t.kind==='ref'?typed(v,host.manifest.javascript.named_types[t.name]):t.kind==='u64'?BigInt(v):t.kind==='u32'||t.kind==='i32'?Number(v):t.kind==='f32'?typeof v==='object'?{F32Bits:Number(v.F32Bits)}:Number(v):t.kind==='list'||t.kind==='vector'?v.map(x=>typed(x,t.element)):t.kind==='record'?Object.fromEntries(t.fields.map(f=>[f.name,typed(v[f.name],f.type)])):v;
  let comparisons=0,gpu_calls=0,rejectedRestores=0,snapshotComparisons=0;
  for(const backend of ['cpu','javascript','gpu']) {
    const jsState=stateful&&backend==='javascript'&&host.manifest.javascript.state!=null;
    const state=stateful?(jsState?host.createJavaScriptState():host.createState()):null;
    const snapshot=async()=>Array.from(jsState?await state.checkpoint():state.snapshot());
    let index=0;
    try {for(const step of steps) {
      if(step.reject_restore) {
        const before=await snapshot();let rejected=false;
        try {if(jsState)await state.restore(step.reject_restore.map(Number));else host.restoreState(new Uint8Array(step.reject_restore.map(Number))).dispose();}
        catch(e){rejected=/invariant/.test(e.message);}
        if(!rejected||exact(await snapshot())!==exact(before))throw Error(`${name}/${backend}: invariant restore was not atomic`);
        rejectedRestores++;continue;
      }
      let reply;
      try {
        if(step.pure) {
          const f=host.manifest.javascript.functions.find(f=>f.name===step.pure);
          const args=step.args.map((v,i)=>typed(v,f.params[i].type));
          const request=backend==='gpu'?(step.cpu_only?'cpu':step.expect_gpu?'gpu-required':'gpu'):backend;
          const result=await(host.call?host.call(step.pure,args,{backend:request}):host.run(step.pure,args,request));
          if(request==='gpu-required') {if(result.backend!=='gpu')throw Error('required GPU fell back');gpu_calls++;}
          reply={value:result.value};
        } else {
          const action=host.manifest.javascript.state.actions.find(a=>a.name===step.call);
          const args=step.args.map((v,i)=>typed(v,action.params[i].type));
          reply={outcome:await state.invoke(step.call,args)};
        }
      }catch(e){reply={host_error:e.message};}
      if(exact(reply)!==exact(wanted[index].reply))throw Error(`${name}/${backend}/${index}: contract value differs: ${exact(reply)}`);
      if(stateful) {
        if(exact(await snapshot())!==exact(wanted[index].snapshot))throw Error(`${name}/${backend}/${index}: contract snapshot differs`);
        snapshotComparisons++;
      }
      index++;comparisons++;
    }}finally{await state?.dispose?.();}
  }
  return {name,abi,comparisons,gpu_calls,rejectedRestores,snapshotComparisons};
}
