// Complete public results. Preparation/setup are reported separately from reuse.
export async function benchmark({base,gpu=false,fixture,name='forecast',sizes=[100,1024],samples=17}) {
 const modules={},engines={},profiles={},preparations=[];
 for(const version of ['baseline','candidate']){
  const url=new URL(version+'/',base),module=await import(new URL('ink-gpu.mjs',url));modules[version]=module;
  engines[version]=await module.loadInk(url,{gpu});
 }
 const direct=await import(new URL('candidate/program.mjs',base));
 const equal=(a,b)=>{if(Array.isArray(a)||ArrayBuffer.isView(a)){if(a.length!==b.length)throw Error('length mismatch');for(let i=0;i<a.length;i++)equal(a[i],b[i]);}else if(a&&typeof a==='object'){if(Object.keys(a).length!==Object.keys(b).length)throw Error('record mismatch');for(const k of Object.keys(a))equal(a[k],b[k]);}else if(!Object.is(a,b))throw Error('value mismatch '+a+' '+b);};
 const rows=[];
 try{for(const n of sizes){
  const args=fixture(n,1),heldout=fixture(n,47),expected=direct.functions[name](...args),other=direct.functions[name](...heldout);
  for(const version of ['baseline','candidate']){
   const url=new URL(version+'/',base),{profileScope}=await import(new URL('backend-selection.mjs',url));
   const scope=profileScope(engines[version].manifest,name),profile={schema:1,target_key:'capture-test',models:{[scope]:{boundary:'captured-owned',domains:{input_elements:[n,n]},backends:{cpu:{intercept_ns:1000,terms:{}},javascript:{intercept_ns:1,terms:{}}}}}};
   profiles[version]=await modules[version].loadInk(url,{gpu,targetKey:'capture-test',costProfile:profile});
   const r=await profiles[version].call(name,heldout);equal(r.value,other);if(r.backend!=='javascript')throw Error('profile did not select JavaScript');
  }
  let start=performance.now();const prepared=engines.candidate.prepareCall(name,args);const captureMs=performance.now()-start;
  start=performance.now();const first=await prepared.run({backend:'cpu'});equal(first.value,expected);const firstCpuMs=performance.now()-start;
  const preparedProfile={schema:1,target_key:'capture-test',models:{[JSON.stringify(['ink-prepared-call-v1',(await import(new URL('candidate/backend-selection.mjs',base))).profileScope(engines.candidate.manifest,name)])]:{boundary:'captured-owned',domains:{input_elements:[n,n]},backends:{cpu:{intercept_ns:1000,terms:{}},javascript:{intercept_ns:1,terms:{}}}}}};
  start=performance.now();
  const preparedEngine=await modules.candidate.loadInk(new URL('candidate/',base),{gpu,targetKey:'capture-test',costProfile:preparedProfile});
  const preparedEngineLoadMs=performance.now()-start;
  start=performance.now();const automaticPrepared=preparedEngine.prepareCall(name,args);const automaticCaptureMs=performance.now()-start;
  start=performance.now();const firstAuto=await automaticPrepared.run();const firstAutoMs=performance.now()-start;equal(firstAuto.value,expected);if(firstAuto.backend!=='javascript')throw Error('prepared first profile mismatch');
  const modes=[{mode:'direct',sync:()=>direct.functions[name](...args)},...['baseline','candidate'].flatMap(version=>['javascript','cpu','auto'].map(backend=>({mode:version+'-'+backend,call:()=>engines[version].call(name,args,{backend})}))),...['baseline','candidate'].map(version=>({mode:version+'-profiled-js',call:()=>profiles[version].call(name,args)})),{mode:'candidate-prepared-js',call:()=>prepared.run({backend:'javascript'})},{mode:'candidate-prepared-cpu',call:()=>prepared.run({backend:'cpu'})},{mode:'candidate-prepared-auto',call:()=>automaticPrepared.run()}];
  if(gpu)for(const version of ['baseline','candidate'])modes.push({mode:version+'-gpu',call:()=>engines[version].call(name,args,{backend:'gpu-required'})});
  const times=new Map();
  for(const m of modes){const t={mode:m.mode,samplesUs:[],reps:m.mode.endsWith('-gpu')?8:n>100?64:256};times.set(m.mode,t);
   const initial=m.sync?{value:m.sync(),backend:'direct'}:await m.call();equal(initial.value,expected);t.backend=initial.backend;t.reason=initial.reason;t.counters=initial.counters;
   if(m.mode==='candidate-prepared-auto'&&initial.backend!=='javascript')throw Error('prepared profile mismatch');
   if(m.mode.endsWith('-gpu')&&(initial.backend!=='gpu'||!(initial.counters.dispatches>0)))throw Error('actual GPU dispatch required');
   for(let i=0;i<(m.mode.endsWith('-gpu')?16:n>100?256:2048);i++){if(m.sync)m.sync();else await m.call();}
  }
  for(let trial=0;trial<samples;trial++){
   for(const m of trial%2?modes.slice().reverse():modes){const t=times.get(m.mode);let result;const start=performance.now();if(m.sync){for(let i=0;i<t.reps;i++)result=m.sync();}else{for(let i=0;i<t.reps;i++)result=await m.call();}const elapsed=(performance.now()-start)*1000/t.reps;t.samplesUs.push(elapsed);equal(m.sync?result:result.value,expected);}
   if(globalThis.requestAnimationFrame)await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  rows.push({n,modes:[...times.values()].map(t=>({...t,medianUs:t.samplesUs.slice().sort((a,b)=>a-b)[Math.floor(t.samplesUs.length/2)]}))});
  preparations.push({n,captureMs,firstCpuMs,preparedEngineLoadMs,automaticCaptureMs,firstAutoMs});
  await prepared.close();await automaticPrepared.close();await preparedEngine.close();for(const e of Object.values(profiles))await e.close();
 }}finally{for(const e of Object.values(engines))await e.close();}
 return {at:new Date().toISOString(),environment:globalThis.navigator?.userAgent??globalThis.process?.version,gpu,rows,preparations,scope:'Same generated JS, CPU Wasm and shaders; complete owned results. Static borrowed JS and prepared owned captures are different lifetimes. Artificial test profiles force a path for timing; not deployment evidence.'};
}
