// Complete browser calls and resident lifecycles over the same Ink kernels.
import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const [mode,output,profilePath]=process.argv.slice(2);
if(!['smoke','train','test'].includes(mode)||!output)throw Error('usage: portfolio-profile-browser.mjs smoke|train|test OUTPUT [PROFILE]');
const root=process.cwd(),bundle='build/cross-domain-webgpu-probe';
const profile=profilePath?JSON.parse(await fs.readFile(profilePath,'utf8')):null;
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside root');
  const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');res.end(data);
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-webgpu']});
 const page=await browser.newPage(),base=`http://127.0.0.1:${server.address().port}/`;
 page.on('console',m=>{if(m.type()==='error')process.stderr.write(m.text()+'\n');});
 await page.goto(base+bundle+'/manifest.json');
 const environment={browser:browser.version(),platform:os.platform(),architecture:os.arch(),cpu:os.cpus()[0]?.model};
 const result=await page.evaluate(async({base,bundle,mode,profile,environment})=>{
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error('actual WebGPU adapter required');
  const info=adapter.info;
  const device={vendor:info?.vendor,architecture:info?.architecture,device:info?.device,description:info?.description,isFallbackAdapter:info?.isFallbackAdapter??adapter.isFallbackAdapter??null};
  const targetKey=JSON.stringify({...environment,device});
  if(profile&&profile.target_key!==targetKey)throw Error('profile hardware/browser mismatch');
  const widths={ecs:16,physics:16};
  const kernels=[['ecs','gpu/f0/'],['physics','gpu/f7/']];
  const sizes=mode==='smoke'?[0,1,257]:mode==='train'?[256,8192,262144]:[1024,16384,131072];
  const count=mode==='smoke'?1:8;
  const receipts=[],resident=[];
  const input=(kernel,n)=>Array.from({length:n},(_,i)=>kernel==='ecs'?{x:(Math.imul(i,2654435761)>>>0),y:(0xffffffff-i)>>>0,vx:i%13,vy:i%7}:{x:Math.fround((i%101)/8),y:Math.fround((i%43)/16-0.25),vx:Math.fround((i%17-8)/32),vy:Math.fround((i%11-5)/16)});
  const step=(kernel,rows)=>rows.map(b=>{
   if(kernel==='ecs')return {x:(b.x+b.vx)>>>0,y:(b.y+b.vy)>>>0,vx:b.vx,vy:b.vy};
   const vy=Math.fround(b.vy+Math.fround(Math.fround(-9.75)*Math.fround(1/64)));
   const y=Math.fround(b.y+Math.fround(vy*Math.fround(1/64)));
   return {x:Math.fround(b.x+Math.fround(b.vx*Math.fround(1/64))),y:y<0?0:y,vx:b.vx,vy:y<0?Math.fround(0-vy):vy};
  });
  const check=(actual,wanted,label)=>{
   if(actual.length!==wanted.length)throw Error(`${label}: length ${actual.length}/${wanted.length}`);
   for(let i=0;i<wanted.length;i++)for(const field of ['x','y','vx','vy'])if(!Object.is(actual[i][field],wanted[i][field]))throw Error(`${label}/${i}/${field}: ${actual[i][field]} != ${wanted[i][field]}`);
  };
  for(const [kernel,folder]of kernels){
   const url=new URL(`${bundle}/${folder}`,base),{loadInk}=await import(new URL('ink-gpu.mjs',url));
   const {profileScope}=await import(new URL('backend-selection.mjs',url));
   const engines={plain:await loadInk(url,{targetKey}),profile:profile?await loadInk(url,{targetKey,costProfile:profile}):null};
   const manifest=engines.plain.manifest,scope=profileScope(manifest,kernel);
   try{
    for(const n of sizes){
     const rows=input(kernel,n),wanted=step(kernel,rows);
     const args=[{input:'rows'},...(kernel==='physics'?[1/64,-9.75]:[])];
     const plan={inputs:{rows},steps:[{id:'next',call:kernel,args}],outputs:['next']};
     const context=(await engines.plain.describePipeline(plan))[0];
     if(!context.gpu)throw Error(`${kernel}: missing eligible GPU context`);
     const variants=mode==='test'?['cpu','gpu','auto','profile']:['cpu','gpu'];
     const samples=Object.fromEntries(variants.map(v=>[v,[]])),backends={},counters={},reasons={},cold={};
     for(let round=-2;round<count;round++)for(let offset=0;offset<variants.length;offset++){
      const name=variants[((round+2)+offset)%variants.length],engine=name==='profile'?engines.profile:engines.plain;
      const backend=name==='gpu'?'gpu-required':name==='cpu'?'cpu':'auto';
      const start=performance.now(),r=await engine.pipeline(plan,{backend,placement:'whole'}),ns=(performance.now()-start)*1e6;
      check(r.values.next,wanted,`${kernel}/${n}/${name}`);
      if(name==='gpu'&&(r.backend!=='gpu'||(n>0&&!(r.counters?.dispatches>0))))throw Error('GPU fallback is not a device measurement');
      if(name==='auto'&&r.backend!=='cpu')throw Error('unprofiled ordinary calls must retain CPU');
      cold[name]??=ns;backends[name]=r.backend;counters[name]=r.counters;reasons[name]=r.reason;
      if(round>=0)samples[name].push(ns);
     }
     receipts.push({kernel,n,scope,core_sha256:manifest.core_sha256,features:context.features,boundary:'captured-owned',samples_ns:samples,backends,counters,reasons,first_call_ns:cold,validated:true});
    }
    if(mode==='test')for(const n of [16384,131072]){
     const iterations=32,rows=input(kernel,n);let wanted=rows;
     for(let i=0;i<iterations;i++)wanted=step(kernel,wanted);
     const plan={inputs:{rows},steps:[{id:'next',call:kernel,args:[{input:'rows'},...(kernel==='physics'?[1/64,-9.75]:[])]}],outputs:['next'],feedback:{rows:'next'}};
     const names=['cpu','gpu','auto','profile'],samples=Object.fromEntries(names.map(v=>[v,[]])),stepSamples=Object.fromEntries(names.map(v=>[v,[]])),backends={},counters={};
     for(let round=-1;round<4;round++)for(let offset=0;offset<names.length;offset++){
      const name=names[((round+1)+offset)%names.length],engine=name==='profile'?engines.profile:engines.plain;
      const start=performance.now(),session=await engine.open(plan,{backend:name==='gpu'?'gpu-required':name==='cpu'?'cpu':'auto'});
      const begin=performance.now(),advanced=await session.step(iterations);await session.finish();const stepNs=(performance.now()-begin)*1e6;
      const result=await session.read({outputs:['next']});await session.close();const ns=(performance.now()-start)*1e6;
      check(result.values.next,wanted,`${kernel}/${n}/resident/${name}`);
      if(name==='gpu'&&(session.backend!=='gpu'||!(advanced.counters?.dispatches>0)))throw Error('resident GPU dispatch required');
      backends[name]=session.backend;counters[name]={initial:session.counters,step:advanced.counters,read:result.counters};
      if(round>=0){samples[name].push(ns);stepSamples[name].push(stepNs);}
     }
     resident.push({kernel,n,iterations,boundary:'open-step-finish-full-read-close',samples_ns:samples,step_finish_samples_ns:stepSamples,backends,counters,validated:true});
    }
   }finally{await engines.plain.close();await engines.profile?.close();}
  }
  return {mode,device,targetKey,crossOriginIsolated,receipts,resident,validation:'Complete outputs compared with independent modular-word and rounded-binary32 oracle after every invocation; no checksum-only validation.'};
 },{base,bundle,mode,profile,environment});
 const hashes={};
 for(const file of ['bench/gpu/portfolio-profile-browser.mjs','bench/cross-domain/main.ink','knowledge/libraries/workload_kernels.ink',`${bundle}/manifest.json`,`${bundle}/gpu/f0/manifest.json`,`${bundle}/gpu/f7/manifest.json`,'build/projected-read-compiler/ink'])hashes[file]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify({schema:1,environment,source_hashes:hashes,...result},null,2)+'\n');
 console.log(JSON.stringify({mode,cases:result.receipts.length,resident:result.resident.length,device:result.device,output}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
