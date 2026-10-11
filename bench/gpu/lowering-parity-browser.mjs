// Replay the native conformance artifacts through the browser host/device.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const [chrome,output='build/browser-lowering-parity.json']=process.argv.slice(2);
const root=process.cwd();
const server=http.createServer(async(req,res)=>{
  // Generated parallel functions use real workers and SharedArrayBuffer.
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  try {
    const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(root+path.sep))throw Error('path outside fixture root');
    const bytes=await fs.readFile(file);
    res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');
    res.end(bytes);
  } catch {res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu',...(process.platform==='linux'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
  const page=await browser.newPage();await page.goto(base+'build/generated-parity-bend/script.json');
  assert.equal(await page.evaluate(()=>crossOriginIsolated),true,'worker conformance requires an isolated fixture origin');
  const steps=JSON.parse(await fs.readFile('build/generated-parity-bend/script.json','utf8'));
  const expected=JSON.parse(await fs.readFile('build/generated-parity-bend/expected.json','utf8'));
  const fixtures=steps.map((s,i)=>({...s,expected:expected[i].reply.value}));
  const bend=await page.evaluate(async({base,fixtures})=>{
    const root=new URL('build/generated-parity-bend/gpu-module/',base);
    const {loadInk}=await import(new URL('ink-gpu.mjs',root));
    const ink=await loadInk(root);const replies=[];const parts=new Map();
    const exact=v=>JSON.stringify(v,(_,x)=>{if(typeof x!=='bigint')return x;if(x>BigInt(Number.MAX_SAFE_INTEGER)||x<BigInt(Number.MIN_SAFE_INTEGER))throw Error('fixture integer outside exact Number range');return Number(x);});
    const typed=(v,t)=>t.kind==='u64'?BigInt(v):t.kind==='list'?v.map(x=>typed(x,t.element)):v;
    for(const f of fixtures)for(const backend of ['cpu','javascript','gpu']) {
      const params=ink.manifest.javascript.functions.find(x=>x.name===f.pure).params;
      const args=f.args.map((v,i)=>typed(v,params[i].type));
      const r=await ink.call(f.pure,args,{backend});
      if(exact(r.value)!==exact(f.expected))throw Error(`${f.pure}/${backend}: value mismatch`);
      if(backend==='gpu'&&f.expect_gpu&&r.backend!=='gpu')throw Error(`${f.pure}: fallback ${r.reason}`);
      replies.push({function:f.pure,requested:backend,backend:r.backend});
      if(backend==='gpu'&&f.expect_gpu) {
        const info=ink.manifest.functions.find(x=>x.name===f.pure);
        if(!parts.has(info.bundle)) {
          const url=new URL(info.bundle,root);
          const adapter=await import(new URL('ink-gpu.mjs',url));
          parts.set(info.bundle,await adapter.loadInk(url));
        }
        const cpu=await parts.get(info.bundle).call(f.pure,args,{backend:'cpu'});
        if(exact(cpu.value)!==exact(f.expected))throw Error(`${f.pure}/packed-c-wasm: value mismatch`);
        replies.push({function:f.pure,requested:'packed-c-wasm',backend:cpu.backend});
      }
    }
    for(const part of parts.values())await part.dispose();await ink.dispose();return {comparisons:replies.length,gpu_calls:replies.filter(r=>r.backend==='gpu').length,replies};
  },{base,fixtures});
  const residency=await page.evaluate(async base=>{
    const root=new URL('build/lowering-residency/',base);
    const {loadInk}=await import(new URL('ink-gpu.mjs',root));
    const ink=await loadInk(root);const replies=[];
    for(const [input,want] of [[[3,-1,2],[3,11]],[[-2,0],[]],[[],[]]]) {
      const pipeline={inputs:{xs:input},steps:[{id:'filtered',call:'shrink',args:[{input:'xs'}]},{id:'prefix',call:'prefix',args:[{step:'filtered'}]},{id:'ordered',call:'ordered',args:[{step:'prefix'}]}],iterations:3,feedback:{xs:'ordered'},outputs:['ordered']};
      for(const backend of ['cpu','javascript','gpu']) {
        const r=await ink.pipeline(pipeline,{backend});
        if(JSON.stringify(r.values)!==JSON.stringify({ordered:want}))throw Error(`resident/${backend}: value mismatch`);
        if(backend==='gpu') {
          if(r.backend!=='gpu')throw Error(`resident fallback: ${r.reason}`);
          if(r.counters.upload_bytes!==4*(input.length+1)||r.counters.readback_bytes!==4*(want.length+1)||r.counters.dispatches!==9||r.counters.resident_copy_bytes!==16*(input.length+1))throw Error('resident counters mismatch');
        }
        replies.push(r);
      }
    }
    for(const iterations of [1,2,3]) {
      const a=[3,-1,3],b=[8,0,8];
      const pipeline={inputs:{a,b},steps:[{id:'left',call:'identity',args:[{input:'a'}]},{id:'right',call:'identity',args:[{input:'b'}]},{id:'unused',call:'shrink',args:[{input:'a'}]}],iterations,feedback:{a:'right',b:'left'},outputs:['left','right']};
      for(const backend of ['cpu','javascript','gpu']) {
        const r=await ink.pipeline(pipeline,{backend});
        const expected=iterations%2?{left:a,right:b}:{left:b,right:a};
        if(JSON.stringify(r.values)!==JSON.stringify(expected))throw Error(`swap/${backend}: value mismatch`);
        if(backend==='gpu'&&(r.backend!=='gpu'||r.counters.upload_bytes!==32||r.counters.readback_bytes!==32||r.counters.dispatches!==iterations||r.counters.resident_copy_bytes!==64*(iterations-1)))throw Error('swap backend/counters mismatch');
        replies.push(r);
      }
    }
    const growing=await ink.pipeline({inputs:{xs:[1]},steps:[{id:'grown',call:'duplicate',args:[{input:'xs'}]}],iterations:2,feedback:{xs:'grown'},outputs:['grown']},{backend:'gpu'});
    if(growing.backend!=='cpu'||growing.reason!=='feedback changes array shape; compiled CPU pipeline'||JSON.stringify(growing.values.grown)!=='[1,1,1,1]')throw Error('growing feedback fallback mismatch: '+JSON.stringify(growing));
    replies.push(growing);await ink.dispose();return {comparisons:replies.length,gpu_calls:replies.filter(r=>r.backend==='gpu').length,replies};
  },base);
  assert.equal(residency.gpu_calls,6);
  const receipt={status:'passed',browser:browser.version(),bend,residency};
  await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({status:receipt.status,browser:receipt.browser,comparisons:bend.comparisons+residency.comparisons,gpu_calls:bend.gpu_calls+residency.gpu_calls}));
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
