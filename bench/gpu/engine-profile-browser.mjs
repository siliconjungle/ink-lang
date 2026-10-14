// Offline complete-engine acquisition. Every measured call owns creation,
// capture, backend setup, upload, execution, full output read and disposal.
import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
const [mode,output,bundle,protocolFile,profileFile]=process.argv.slice(2);
if(!['smoke','train','evaluation'].includes(mode)||!output||!bundle||!protocolFile)throw Error('usage: engine-profile-browser.mjs smoke|train|evaluation OUTPUT BUNDLE PROTOCOL [PROFILE]');
const protocol=JSON.parse(await fs.readFile(protocolFile,'utf8')),profile=profileFile?JSON.parse(await fs.readFile(profileFile,'utf8')):null;
if(mode==='evaluation'&&!profile)throw Error('evaluation requires a previously fitted profile');
if(mode==='train'&&profile)throw Error('training uses explicit CPU/GPU only');
if(protocol.schema!==1)throw Error('protocol schema');
for(const split of ['training','evaluation']){
 const p=protocol[split];
 if(!p||!Array.isArray(p.sizes)||!p.sizes.length||p.sizes.length>8||new Set(p.sizes).size!==p.sizes.length||!p.sizes.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000)||!Array.isArray(p.horizons)||!p.horizons.length||p.horizons.length>8||new Set(p.horizons).size!==p.horizons.length||!p.horizons.every(n=>Number.isSafeInteger(n)&&n>=1&&n<=1000)||!Number.isSafeInteger(p.seed)||p.seed<0||p.seed>0xffffffff)throw Error('invalid protocol '+split);
}
if(protocol.training.sizes.some(n=>protocol.evaluation.sizes.includes(n))||protocol.training.horizons.some(n=>protocol.evaluation.horizons.includes(n))||protocol.training.seed===protocol.evaluation.seed)throw Error('training/evaluation overlap');
const allowSoftware=mode==='smoke'&&process.env.INK_ALLOW_SOFTWARE_GPU==='1';
const root=process.cwd();if(!path.resolve(root,bundle).startsWith(root+path.sep))throw Error('bundle outside root');
const server=http.createServer(async(req,res)=>{res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');res.end(data);}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.INK_CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-webgpu']});
 const environment={browser:browser.version(),platform:os.platform(),architecture:os.arch(),cpu:os.cpus()[0]?.model};
 const page=await browser.newPage(),base=`http://127.0.0.1:${server.address().port}/`;
 await page.goto(base+bundle+'/manifest.json');
 const result=await page.evaluate(async({base,bundle,mode,protocol,profile,environment,allowSoftware})=>{
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error('actual WebGPU adapter required');const info=adapter.info;
  const device={vendor:info?.vendor,architecture:info?.architecture,device:info?.device,description:info?.description,isFallbackAdapter:info?.isFallbackAdapter??adapter.isFallbackAdapter??null};
  if(device.isFallbackAdapter!==false&&!allowSoftware)throw Error('hardware adapter evidence required');
  const target_key=JSON.stringify({...environment,device});if(profile&&profile.target_key!==target_key)throw Error('profile target differs');
  const url=new URL(bundle+'/',base),{executeSession,loadInk}=await import(new URL('ink-gpu.mjs',url));
  const manifest=await(await fetch(new URL('manifest.json',url))).json();
  const input=(kernel,n,seed)=>Array.from({length:n},(_,index)=>{const i=(index+seed)>>>0;return kernel==='ecs'?{x:Math.imul(i,2654435761)>>>0,y:(0xffffffff-i)>>>0,vx:i%13,vy:i%7}:{x:Math.fround((i%101)/8),y:Math.fround((i%43)/16-.25),vx:Math.fround((i%17-8)/32),vy:Math.fround((i%11-5)/16)};});
  const step=(kernel,rows)=>rows.map(b=>{if(kernel==='ecs')return{x:(b.x+b.vx)>>>0,y:(b.y+b.vy)>>>0,vx:b.vx,vy:b.vy};const vy=Math.fround(b.vy+Math.fround(Math.fround(-9.75)*Math.fround(1/64))),y=Math.fround(b.y+Math.fround(vy*Math.fround(1/64)));return{x:Math.fround(b.x+Math.fround(b.vx*Math.fround(1/64))),y:y<0?0:y,vx:b.vx,vy:y<0?Math.fround(0-vy):vy};});
  const check=(actual,wanted)=>{if(actual.length!==wanted.length)throw Error('output length');for(let i=0;i<wanted.length;i++)for(const f of ['x','y','vx','vy'])if(!Object.is(actual[i][f],wanted[i][f]))throw Error(`output ${i}/${f}`);};
  const spec=mode==='evaluation'?protocol.evaluation:protocol.training,count=mode==='smoke'?1:5,cases=[];
  let lifecycle;
  for(const family of ['ecs','physics'])for(const n of spec.sizes)for(const iterations of spec.horizons){
   const rows=input(family,n,spec.seed),plan={inputs:{rows},steps:[{id:'next',call:family,args:[{input:'rows'},...(family==='physics'?[1/64,-9.75]:[])]}],outputs:['next'],feedback:{rows:'next'}};
   let wanted=rows;for(let i=0;i<iterations;i++)wanted=step(family,wanted);
   const names=mode==='train'?['cpu','gpu']:['cpu','gpu','auto','profile'];
   const complete_engine_ns=Object.fromEntries(names.map(n=>[n,[]])),backends={},decisions={},counters={};let context;
   let synthetic;
   if(mode==='smoke'){
    const probe=await executeSession(url,plan,{iterations,backend:'cpu',targetKey:target_key});
    synthetic={schema:1,target_key,models:{[probe.context.scope]:{boundary:probe.context.boundary,domains:{iterations:[iterations,iterations]},backends:{cpu:{intercept_ns:100,terms:{}},gpu:{intercept_ns:1,terms:{}}}}}};
    // The same complete-engine evidence must not select an ordinary session.
    const ordinary=await loadInk(url,{targetKey:target_key,costProfile:synthetic});let session;
    try{session=await ordinary.open(plan,{workload:{iterations}});if(session.backend!=='cpu')throw Error('engine profile escaped into session');}finally{try{await session?.close();}finally{await ordinary.close();}}
   }
   for(let round=0;round<count;round++)for(let offset=0;offset<names.length;offset++){
    const name=names[(round+offset)%names.length];
    const started=performance.now();
    const result=await executeSession(url,plan,{iterations,backend:name==='cpu'?'cpu':name==='gpu'?'gpu-required':'auto',targetKey:target_key,...(name==='profile'?{costProfile:synthetic??profile}:{})});
    const elapsed=(performance.now()-started)*1e6;
    check(result.values.next,wanted);
    if(context&&JSON.stringify(context)!==JSON.stringify(result.context))throw Error('execution context differs');context=result.context;
    if(lifecycle&&lifecycle!==result.lifecycle)throw Error('lifecycle differs');lifecycle=result.lifecycle;
    if(name==='cpu'&&result.backend!=='cpu'||name==='gpu'&&result.backend!=='gpu'||name==='auto'&&result.backend!=='cpu'||mode==='smoke'&&name==='profile'&&result.backend!=='gpu')throw Error('backend contract');
    if(result.backend==='gpu'&&(result.counters.live_buffer_bytes!==0||!(result.counters.peak_buffer_bytes>0)||(n>0&&!(result.counters.dispatches>0))))throw Error('GPU resources or dispatch');
    if(result.backend==='cpu'&&result.counters.peak_buffer_bytes!==null)throw Error('CPU memory is unmeasured');
    complete_engine_ns[name].push(elapsed);backends[name]=result.backend;decisions[name]=result.profile;counters[name]=result.counters;
   }
   cases.push({family,n,iterations,core_sha256:manifest.core_sha256,context,complete_engine_ns,backends,decisions,counters,validated:true});
  }
  return{device,target_key,cases,lifecycle};
 },{base,bundle,mode,protocol,profile,environment,allowSoftware});
 const source_hashes={};
 for(const name of ['bench/gpu/engine-profile-browser.mjs','bench/gpu/resident-profile.ink'])source_hashes[name]=crypto.createHash('sha256').update(await fs.readFile(name)).digest('hex');
 for(const name of ['manifest.json','ink-gpu.mjs','complete-session.mjs','backend-selection.mjs','pipeline-contract.mjs','prepared-wasm.mjs','ink-abi.mjs','ink-selection.mjs','ink-selection.wasm','ink-device.mjs','cpu.wasm','program.mjs'])source_hashes['bundle/'+name]=crypto.createHash('sha256').update(await fs.readFile(path.join(bundle,name))).digest('hex');
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output,JSON.stringify({schema:1,mode,process_id:crypto.randomUUID(),environment,source_hashes,training_protocol:protocol.training,evaluation_protocol:protocol.evaluation,...result,scope:'Complete executeSession call including copied inputs/profile, engine creation, backend/shader setup, upload, steps, one full owned read, session close and engine close. Browser startup, common module import, input generation and output oracle excluded. Module/network/driver caches may be warm; no whole-browser cold-start claim. CPU memory unmeasured; GPU counters exclude host and driver memory.'},null,2)+'\n');
 console.log(JSON.stringify({mode,cases:result.cases.length,device:result.device,output}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
