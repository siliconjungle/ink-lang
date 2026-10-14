import {createServer} from 'node:http';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve,sep,extname,join} from 'node:path';import {createHash} from 'node:crypto';import {cpus} from 'node:os';import {execFileSync} from 'node:child_process';import {chromium} from 'playwright-core';
const root=resolve(new URL('../..',import.meta.url).pathname),bundle=join(root,'build/gpu-signals'),output=join(root,'reports/gpu-signals-2026-10-12'),quick=Boolean(process.env.QUICK);
const server=createServer(async(req,res)=>{try{const path=resolve(bundle,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==bundle&&!path.startsWith(bundle+sep))throw Error('invalid path');if(path===bundle){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Ink GPU / Svelte / Preact benchmark</title>');return;}res.setHeader('Content-Type',({'.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.wgsl':'text/plain'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${server.address().port}/`;
const chrome=process.env.CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu']});
try{
 const coldResults=[];
 if(!quick)for(const kind of ['affine','cheap-sum','heavy512','feedback32'])for(let round=0;round<3;round++){
  const coldLabels=['Ink WebGPU','Ink JavaScript','Ink Wasm','Svelte derived','Preact computed','Plain JS fused'];
  for(const label of round%2?[...coldLabels].reverse():coldLabels){
   const fresh=await browser.newPage();await fresh.goto(base);
   const record=await fresh.evaluate(async({base,kind,label,round})=>{
    const n=65536,xs=Uint32Array.from({length:n},(_,i)=>(Math.imul(i,2654435761)+173+round)>>>0),original=xs.slice();
    const plan=kind==='feedback32'?{inputs:{xs},steps:[{id:'result',call:'step',args:[{input:'xs'},xs.length]}],outputs:['result'],feedback:{xs:'result'},iterations:32}:{steps:[{id:'result',call:kind==='affine'?'affine':kind==='cheap-sum'?'cheap':'heavy',args:[xs]}],outputs:['result']};
    let close,actual,receipt,reference;
    const start=performance.now();
    if(label.startsWith('Ink ')){
     const {loadInk}=await import(new URL('ink/ink-gpu.mjs',base));const e=await loadInk(new URL('ink/',base));close=()=>e.close();const backend=label==='Ink WebGPU'?'gpu-required':label==='Ink Wasm'?'cpu':'javascript';const r=await e.pipeline(plan,{backend});actual=r.values.result;receipt={backend:r.backend,counters:r.counters,reason:r.reason};if(r.backend!==(backend==='gpu-required'?'gpu':backend))throw Error('Cold fallback '+r.reason);if(backend==='gpu-required'&&!r.counters?.dispatches)throw Error('Cold GPU dispatch missing');
    }else{
     const module=await import(new URL(label==='Svelte derived'?'cold-svelte.mjs':label==='Preact computed'?'cold-preact.mjs':'cold-plain.mjs',base));const model=(label==='Svelte derived'?module.svelteModel:label==='Preact computed'?module.preactModel:module.rawModel)(kind);close=model.close;actual=model.run(xs);reference=module.kernel;
    }
    const ms=performance.now()-start;
    reference??=(await import(new URL('cold-plain.mjs',base))).kernel;
    const expected=reference(xs,kind);if(typeof expected==='number'){if(actual!==expected)throw Error('Cold scalar mismatch');}else{if(actual.length!==expected.length)throw Error('Cold length mismatch');for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])throw Error('Cold word mismatch '+i);}
    for(let i=0;i<xs.length;i++)if(xs[i]!==original[i])throw Error('Cold input mutation');
    const checksum=typeof actual==='number'?actual:actual.reduce((s,x,i)=>(Math.imul(s^x,16777619)+i)>>>0,2166136261);await close();
    return {kind,label,n,round,ms,checksum,...receipt,boundary:'first module import, model/engine setup and complete first request in a fresh page; page creation/navigation and input generation excluded; browser/process/driver caches shared'};
   },{base,kind,label,round});coldResults.push(record);await fresh.close();
  }
  console.log('Cold page checks complete '+kind+' round '+round);
 }
 const page=await browser.newPage();page.on('console',msg=>{if(msg.type()==='log')console.log(msg.text());});page.on('pageerror',e=>console.error(e));await page.goto(base);
 const result=await page.evaluate(async({base,quick})=>{
  const {svelteModel,preactModel,rawModel,kernel,data}=await import(new URL('controls.mjs',base));
  const {loadInk}=await import(new URL('ink/ink-gpu.mjs',base));
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error('Actual hardware WebGPU adapter required');const info=adapter.info;
  const adapterInfo={vendor:info?.vendor,architecture:info?.architecture,device:info?.device,description:info?.description,isFallbackAdapter:adapter.isFallbackAdapter??info?.isFallbackAdapter??null,limits:{maxBufferSize:adapter.limits.maxBufferSize,maxStorageBufferBindingSize:adapter.limits.maxStorageBufferBindingSize,maxComputeWorkgroupsPerDimension:adapter.limits.maxComputeWorkgroupsPerDimension}};
  if(adapterInfo.isFallbackAdapter||/swiftshader|lavapipe|software/i.test(JSON.stringify(adapterInfo)))throw Error('Software/fallback adapter is not hardware evidence');
  const engine=await loadInk(new URL('ink/',base));
  const kinds=['affine','cheap-sum','heavy512','feedback32'],labels=['Ink WebGPU','Ink JavaScript','Ink Wasm','Svelte derived','Preact computed','Plain JS fused'];
  const call=kind=>kind==='affine'?'affine':kind==='cheap-sum'?'cheap':'heavy';
  const plan=(kind,xs)=>kind==='feedback32'?{inputs:{xs},steps:[{id:'result',call:'step',args:[{input:'xs'},xs.length]}],outputs:['result'],feedback:{xs:'result'},iterations:32}:{steps:[{id:'result',call:call(kind),args:[xs]}],outputs:['result']};
  const equal=(actual,expected,label)=>{if(typeof expected==='number'){if(actual!==expected)throw Error(label+' scalar mismatch '+actual+' vs '+expected);return;}if(actual.length!==expected.length)throw Error(label+' length mismatch');for(let i=0;i<expected.length;i++)if(actual[i]!==expected[i])throw Error(label+' word mismatch at '+i+': '+actual[i]+' vs '+expected[i]);};
  const checksum=value=>typeof value==='number'?value>>>0:value.reduce((s,x,i)=>(Math.imul(s^x,16777619)+i)>>>0,2166136261);
  const models=(kind,e=engine)=>{
   const s=svelteModel(kind),p=preactModel(kind),raw=rawModel(kind);
   const ink=backend=>({async run(xs){const reply=await e.pipeline(plan(kind,xs),{backend});if(reply.backend!== (backend==='gpu-required'?'gpu':backend))throw Error('Unexpected backend/fallback '+reply.reason);if(backend==='gpu-required'&&xs.length>0&&(!reply.counters?.dispatches||!(reply.counters.readback_bytes>0)))throw Error('Missing GPU dispatch/readback evidence');return {value:reply.values.result,receipt:{backend:reply.backend,counters:reply.counters,reason:reply.reason}};},close(){}});
   return {'Ink WebGPU':ink('gpu-required'),'Ink JavaScript':ink('javascript'),'Ink Wasm':ink('cpu'),'Svelte derived':{run:xs=>({value:s.run(xs)}),close:s.close,runs:s.runs},'Preact computed':{run:xs=>({value:p.run(xs)}),close:p.close,runs:p.runs},'Plain JS fused':{run:xs=>({value:raw.run(xs)}),close:raw.close}};
  };
  const samples=[],receipts=[],validations=[],cold=[],sizes=quick?[4096]:[4096,65536,1048576],rounds=quick?2:7;
  // Independent Python corner fixtures, including wraparound, empty arrays and
  // lengths surrounding workgroup boundaries. Controls also match compiled Wasm.
  const corners=await(await fetch(new URL('corners.json',base))).json();
  for(const kind of kinds){const m=models(kind);for(const fixture of corners.filter(f=>f.kind===kind)){const xs=Uint32Array.from(fixture.input);for(const label of labels){const r=await m[label].run(xs);equal(r.value,fixture.expected,label+' corner '+kind);validations.push({kind,label,length:xs.length,checksum:checksum(r.value)});}}for(const model of Object.values(m))model.close();}
  for(const kind of kinds)for(const n of sizes){const m=models(kind),referenceInput=data(n,811);const oracle=await m['Ink Wasm'].run(referenceInput),expected=kernel(referenceInput,kind);equal(oracle.value,expected,'source Wasm vs fused control '+kind);for(const label of labels){const r=await m[label].run(referenceInput);equal(r.value,oracle.value,label+' large conformance '+kind);receipts.push({kind,n,label,...r.receipt,checksum:checksum(r.value)});}
   for(let round=-2;round<rounds;round++){
    const units=(kind==='affine'||kind==='cheap-sum')?(n===4096?64:n===65536?8:1):(n===4096?4:1);
    const inputs=Array.from({length:units},(_,i)=>data(n,100000+round*997+i*17)),references=inputs.map(xs=>kernel(xs,kind)),originals=inputs.map(xs=>xs.slice());
    for(const label of round%2?[...labels].reverse():labels){const before=m[label].runs?.(),replies=[],start=performance.now();for(const xs of inputs)replies.push(await m[label].run(xs));const batchMs=performance.now()-start;
     for(let i=0;i<units;i++){equal(replies[i].value,references[i],label+' timed '+kind);equal(inputs[i],originals[i],label+' input mutation');}
     if(m[label].runs&&m[label].runs()!==before+units)throw Error('Derived callback did not execute exactly once per call '+label);
     if(round>=0)samples.push({kind,n,label,round,units,batchMs,ms:batchMs/units,checksum:checksum(replies.at(-1).value),...replies.at(-1).receipt});}

   }
   // Retained outputs survive later calls; public arrays do not alias inputs.
   if(kind!=='cheap-sum')for(const label of labels){const xs=data(Math.min(n,257),29),r=await m[label].run(xs),copy=Array.from(r.value);xs.fill(0);await m[label].run(data(Math.min(n,257),31));equal(r.value,copy,label+' retained output');r.value[0]^=1;const next=await m[label].run(data(Math.min(n,257),29));equal(next.value,copy,label+' detached output');}
   for(const model of Object.values(m))model.close();console.log('Measured '+kind+' at '+n+' elements; all words and actual GPU receipts verified');
  }
  await engine.close();return {adapter:adapterInfo,userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,devicePixelRatio,quick,sizes,rounds,samples,receipts,validations,cold,scope:'Dense pure computations; complete changed-input capture, execution and owned result acquisition. Svelte/Preact use connected array-backed derived consumers and captured typed input copies; controls use direct loops and double-buffered coupled feedback with exact u32 results. No DOM/rendering, state transactions, database deltas or automatic-policy speed claim. GPU is explicitly required; all fallback timings are rejected.'};
 },{base,quick});
 result.cold=coldResults;result.browser=browser.version();result.chrome=chrome;result.hostCpu=cpus()[0].model;result.node=process.version;result.date='2026-10-12';result.versions=JSON.parse(await readFile(new URL('./package.json',import.meta.url),'utf8')).dependencies;
 const paths=['bench/gpu-signals/compute.ink','bench/gpu-signals/prepare.py','bench/gpu-signals/kernels.mjs','bench/gpu-signals/models.svelte.js','bench/gpu-signals/browser.mjs','bench/gpu-signals/package-lock.json','build/gpu-signals/controls.mjs','build/gpu-signals/cold-svelte.mjs','build/gpu-signals/cold-preact.mjs','build/gpu-signals/cold-plain.mjs','build/gpu-signals/corners.json','build/gpu-signals/ink/manifest.json','build/gpu-signals/ink/program.mjs','build/gpu-signals/ink/cpu.wasm','build/gpu-signals/ink/ink-gpu.mjs','build/gpu-signals/ink/ink-device.mjs'];result.hashes={};for(const path of paths)result.hashes[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');result.revisions={};for(const path of ['.','lowerings/js','lowerings/gpu','runtime','abi'])result.revisions[path]=execFileSync('git',['-C',join(root,path),'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 await mkdir(output,{recursive:true});await writeFile(join(output,quick?'smoke.json':'results.json'),JSON.stringify(result,null,2)+'\n');console.log('Wrote '+(quick?'smoke':'full')+' result on '+result.hostCpu+' / Chrome '+result.browser+' / '+JSON.stringify(result.adapter));
}finally{await browser.close();await new Promise(done=>server.close(done));}
