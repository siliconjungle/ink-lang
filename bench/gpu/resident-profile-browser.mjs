// Fresh-browser resident lifecycle measurements and independent complete values.
import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
const [mode,output,profilePath]=process.argv.slice(2);
if(!['smoke','train','test'].includes(mode)||!output)throw Error('usage: resident-profile-browser.mjs smoke|train|test OUTPUT [PROFILE]');
const root=process.cwd(),bundle='build/resident-profile',profile=profilePath?JSON.parse(await fs.readFile(profilePath,'utf8')):null;
const server=http.createServer(async(req,res)=>{res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');res.end(data);}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-webgpu']});
 const page=await browser.newPage(),base=`http://127.0.0.1:${server.address().port}/`;
 await page.goto(base+bundle+'/manifest.json');
 const environment={browser:browser.version(),platform:os.platform(),architecture:os.arch(),cpu:os.cpus()[0]?.model};
 const result=await page.evaluate(async({base,bundle,mode,profile,environment})=>{
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error('actual WebGPU adapter required');const info=adapter.info;
  const device={vendor:info?.vendor,architecture:info?.architecture,device:info?.device,description:info?.description,isFallbackAdapter:info?.isFallbackAdapter??adapter.isFallbackAdapter??null};
  if(device.isFallbackAdapter)throw Error('software adapter is not device coverage');
  const targetKey=JSON.stringify({...environment,device});if(profile&&profile.target_key!==targetKey)throw Error('profile hardware/browser mismatch');
  const url=new URL(bundle+'/',base),{loadInk}=await import(new URL('ink-gpu.mjs',url));
  const plain=await loadInk(url,{targetKey});let fitted=profile?await loadInk(url,{targetKey,costProfile:profile}):null;
  const input=(kernel,n)=>Array.from({length:n},(_,i)=>kernel==='ecs'?{x:Math.imul(i,2654435761)>>>0,y:(0xffffffff-i)>>>0,vx:i%13,vy:i%7}:{x:Math.fround((i%101)/8),y:Math.fround((i%43)/16-.25),vx:Math.fround((i%17-8)/32),vy:Math.fround((i%11-5)/16)});
  const step=(kernel,rows)=>rows.map(b=>{if(kernel==='ecs')return {x:(b.x+b.vx)>>>0,y:(b.y+b.vy)>>>0,vx:b.vx,vy:b.vy};const vy=Math.fround(b.vy+Math.fround(Math.fround(-9.75)*Math.fround(1/64))),y=Math.fround(b.y+Math.fround(vy*Math.fround(1/64)));return{x:Math.fround(b.x+Math.fround(b.vx*Math.fround(1/64))),y:y<0?0:y,vx:b.vx,vy:y<0?Math.fround(0-vy):vy};});
  const check=(actual,wanted,label)=>{if(actual.length!==wanted.length)throw Error(label+' length');for(let i=0;i<wanted.length;i++)for(const f of ['x','y','vx','vy'])if(!Object.is(actual[i][f],wanted[i][f]))throw Error(`${label}/${i}/${f}`);};
  const sizes=mode==='smoke'?[0,1,257]:mode==='train'?[256,8192,262144]:[1024,16384,131072];
  const horizons=mode==='smoke'?[1,32]:mode==='train'?[1,16,64]:[1,8,32],count=mode==='smoke'?1:mode==='train'?5:8,receipts=[];
  try{for(const kernel of ['ecs','physics'])for(const n of sizes)for(const iterations of horizons){
   const rows=input(kernel,n),plan={inputs:{rows},steps:[{id:'next',call:kernel,args:[{input:'rows'},...(kernel==='physics'?[1/64,-9.75]:[])]}],outputs:['next'],feedback:{rows:'next'}};
   let wanted=rows;for(let i=0;i<iterations;i++)wanted=step(kernel,wanted);
   const workload={iterations,readbacks:1},context=await plain.describeSession(plan,workload);
   if(mode==='smoke'){
    await fitted?.close();const synthetic={schema:2,target_key:targetKey,models:{[context.scope]:{boundary:context.boundary,domains:{input_elements:[0,257],iterations:[1,32]},backends:{cpu:{intercept_ns:1,terms:{},products:[{features:['input_elements','iterations'],coefficient_ns:1e6}]},gpu:{intercept_ns:1e9,terms:{},products:[{features:['input_elements','iterations'],coefficient_ns:1}]}}}}};
    fitted=await loadInk(url,{targetKey,costProfile:synthetic});
   }
   const names=mode==='train'?['cpu','gpu']:['cpu','gpu','auto','profile'],samples=Object.fromEntries(names.map(n=>[n,[]])),steps=Object.fromEntries(names.map(n=>[n,[]])),backends={},counters={},decisions={};
   for(let round=-1;round<count;round++)for(let offset=0;offset<names.length;offset++){
    const name=names[((round+1)+offset)%names.length],engine=name==='profile'?fitted:plain;if(!engine)throw Error('test mode requires a fitted profile');
    const started=performance.now(),session=await engine.open(plan,{backend:name==='cpu'?'cpu':name==='gpu'?'gpu-required':'auto',workload});
    const before=performance.now(),advanced=await session.step(iterations);await session.finish();const stepNs=(performance.now()-before)*1e6;
    const result=await session.read({outputs:['next']});await session.close();const elapsed=(performance.now()-started)*1e6;
    check(result.values.next,wanted,`${kernel}/${n}/${iterations}/${name}`);
    if(name==='gpu'&&(session.backend!=='gpu'||(n>0&&!(advanced.counters?.dispatches>0))))throw Error('device dispatch required');
    if(name==='auto'&&session.backend!=='cpu')throw Error('unprofiled resident execution must retain CPU');
    if(mode==='smoke'&&name==='profile'&&session.backend!==(n===257&&iterations===32?'gpu':'cpu'))throw Error('lifecycle profile decision not honoured');
    backends[name]=session.backend;counters[name]={initial:session.counters,step:advanced.counters,read:result.counters};decisions[name]=session.profile;
    if(round>=0){samples[name].push(elapsed);steps[name].push(stepNs);}
   }
   receipts.push({kernel,n,iterations,scope:context.scope,features:context.features,boundary:context.boundary,core_sha256:plain.manifest.core_sha256,samples_ns:samples,step_finish_samples_ns:steps,backends,counters,decisions,validated:true});
  }}finally{await plain.close();await fitted?.close();}
  return {mode,device,targetKey,receipts,scope:'Warm engine; complete open, upload, steps, finish, full owned output read, close. Oracle outside timing. Smoke uses synthetic cost models only for decision conformance.'};
 },{base,bundle,mode,profile,environment});
 const source_hashes={};for(const file of ['bench/gpu/resident-profile-browser.mjs','bench/gpu/resident-profile.ink',`${bundle}/manifest.json`,`${bundle}/ink-gpu.mjs`,`${bundle}/backend-selection.mjs`,`${bundle}/ink-selection.wasm`,`${bundle}/cpu.wasm`])source_hashes[file]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify({schema:1,environment,source_hashes,...result},null,2)+'\n');console.log(JSON.stringify({mode,cases:result.receipts.length,device:result.device,output}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
