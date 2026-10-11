// Actual browser CPU reproduction of the nine archived browser regressions.
const P=new URL('../reports/web-stack-proofs-38-2026-10-11/targets/',import.meta.url);
const D=new URL('../reports/web-stack-engine-39-2026-10-11/regressions/',import.meta.url);
const json=async u=>{const r=await fetch(u);if(!r.ok)throw Error('fetch '+u);return r.json()};
const data=async u=>{const r=await fetch(u);if(!r.ok)throw Error('fetch '+u);return r.arrayBuffer()};
const sha=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
const eq=(a,b)=>a.length===b.length&&b.every((v,i)=>a[i]===v);
const consume=a=>{let c=a.length>>>0;for(let i=0;i<a.length;i++)c=(c+Math.imul((i+1)>>>0,a[i]))>>>0;return c};
export async function diagnoseBrowser({mode='validate',authorized=false,rounds=9,warmups=64,seed=2026113901,vectorControls=true}={},progress=()=>{}){
 if(!['validate','reproduce'].includes(mode)||mode==='reproduce'&&!authorized)throw Error('explicit exclusive timing window required');
 const metadataBytes=await data(new URL('metadata.json',P)),meta=JSON.parse(new TextDecoder().decode(metadataBytes));
 for(const[p,h]of Object.entries(meta.bindings))if(await sha(await data(new URL(p,P)))!==h)throw Error('archived drift '+p);
 const fixtures=(await json(new URL('fixtures.json',P))).frames,regressions=(await json(new URL('../regressions.json',P))).rows.filter(c=>c.host==='browser');
 if(regressions.length!==9)throw Error('expected nine original browser regressions');
 const{expert}=await import(new URL('expert.mjs',P)),readiness=await json(new URL('readiness.json',D));
 const result={status:'running',mode,host:navigator.userAgent,actual_browser:true,metadata_sha256:await sha(metadataBytes),harness_sha256:await sha(await data(import.meta.url)),original_browser_regressions:regressions,protocol:{rounds,warmups,seed,target_ms:8,max_iterations:65536},validation:[],warmups:[],calibration:[],samples:[],observable:0,controls:'Both prior and checked no-vectorizer Wasm controls are diagnostic recompilations with original ABI; only loop/SLP vectorizer flags differ. They are not production changes.',limits:'Actual browser fresh run; nine within-process rounds are not independent process cohorts. No GPU/native or profiler cause claimed. Full and resident boundaries remain separate.'};
 let state=seed>>>0;const rng=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0},shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){const j=rng()%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
 const selected=fixtures.filter(f=>regressions.some(c=>c.frame===f.id));
 for(const f of selected){
  progress(f.id);const cases=regressions.filter(c=>c.frame===f.id),names=[...new Set(cases.flatMap(c=>[c.reference,c.current]))];
  if(vectorControls&&names.includes('prior_wasm_prepared'))names.push('prior_novec_wasm_prepared','checked_novec_wasm_prepared');
  const args=[Uint32Array.from(f.xs),Uint32Array.from(f.ys),f.seed,f.k],capture=()=>args.map(a=>ArrayBuffer.isView(a)?a.slice():a),variants={},close=[];
  try{
   for(const name of names){
    const version=name.split('_')[0],root=new URL(`targets/${f.task}/${version}/`,P);
    if(name.endsWith('_js_owned')){const{functions}=await import(new URL('program.mjs',root));variants[name]={boundary:'captured-js-owned',async:false,run:()=>functions[f.task](...capture()),runWith:a=>functions[f.task](...a.map(x=>ArrayBuffer.isView(x)?x.slice():x))};}
    else if(name.endsWith('_wasm_full')){const{loadInk}=await import(new URL('ink-gpu.mjs',root)),e=await loadInk(root,{gpu:false});close.push(()=>e.close());variants[name]={boundary:'captured-wasm-owned',async:true,run:async()=>(await e.call(f.task,args,{backend:'cpu'})).value,runWith:async a=>(await e.call(f.task,a,{backend:'cpu'})).value};}
    else if(name.endsWith('_wasm_prepared')){
     const wasm=name.includes('_novec_')?new URL(`static/${f.task}/${version}.no-vectorize.wasm`,D):new URL('cpu.wasm',root),bytes=await data(wasm);
     if(name.includes('_novec_')){const key=`reports/web-stack-engine-39-2026-10-11/regressions/static/${f.task}/${version}.no-vectorize.wasm`;if(await sha(bytes)!==readiness.bindings[key])throw Error('diagnostic kernel drift')}
     const{instance:{exports:cpu}}=await WebAssembly.instantiate(bytes,{}),mf=await json(new URL('manifest.json',root)),fn=mf.functions.find(x=>x.name===f.task),{createPackedCall}=await import(new URL('prepared-wasm.mjs',root));
     const p=createPackedCall(cpu,fn.index,args.map(a=>ArrayBuffer.isView(a)?{words:a,count:a.length}:{words:Uint32Array.of(a),count:1}),Math.max(1,args[0].length+args[1].length));close.push(()=>p.close());variants[name]={boundary:'resident-wasm-destination',async:false,run:()=>p.run()};
    }else throw Error('unsupported variant '+name);
   }
   for(const[name,v]of Object.entries(variants)){
    const a=await v.run(),saved=Array.from(a),b=await v.run();if(!eq(a,f.expected)||!eq(b,f.expected)||!eq(a,saved)||consume(a)!==f.web_consumption_code||!eq(args[0],f.xs)||!eq(args[1],f.ys))throw Error('full-output/nonmutation/lifetime mismatch');
    if(v.runWith){const alt=args.map(x=>ArrayBuffer.isView(x)?(x.length?Uint32Array.from(x,x=>(x^0xa5a5a5a5)>>>0):Uint32Array.of(1)):x);alt[2]=(f.seed^0x40000000)>>>0;if(!eq(await v.runWith(alt),expert[f.task](...alt))||!eq(a,saved))throw Error('changed-input owned lifetime')}
    result.validation.push({frame:f.id,variant:name,boundary:v.boundary,passed:true,complete_output:true,nonmutation:true,owned_changed_input_lifetime:v.runWith?true:null});
   }
   if(mode==='validate')continue;
   for(const[name,v]of Object.entries(variants))for(let i=0;i<warmups;i++){const a=await v.run();if(!eq(a,f.expected))throw Error('warmup result');result.warmups.push({frame:f.id,variant:name,iteration:i,passed:true})}
   const batch=async(name,n)=>{const v=variants[name],before=result.observable;let a;const start=performance.now();if(v.async){for(let i=0;i<n;i++){a=await v.run();result.observable=(result.observable+consume(a))>>>0}}else{for(let i=0;i<n;i++){a=v.run();result.observable=(result.observable+consume(a))>>>0}}const elapsed=performance.now()-start;if(!eq(a,f.expected)||!eq(args[0],f.xs)||!eq(args[1],f.ys))throw Error('batch result/input');return{frame:f.id,variant:name,boundary:v.boundary,iterations:n,elapsed_ms:elapsed,ns_per_call:elapsed*1e6/n,checksum:String((result.observable-before)>>>0),consumed_elements:n*f.expected.length}};
   const counts={};for(const name of names){let n=1;for(;;){const r=await batch(name,n);result.calibration.push(r);if(r.elapsed_ms>=8||n>=65536){counts[name]=n;break}n*=2}}
   for(let round=0;round<rounds;round++)for(const name of shuffle(names))result.samples.push({round,...await batch(name,counts[name])});
  }finally{for(const c of close)await c()}
 }
 result.status='passed';return result;
}
