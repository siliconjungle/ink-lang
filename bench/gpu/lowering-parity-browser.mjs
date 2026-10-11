// Replay the native conformance artifacts through the browser host/device.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const [chrome,output='build/browser-lowering-parity.json']=process.argv.slice(2);
const root=process.cwd();
const server=http.createServer(async(req,res)=>{
  try {
    const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(root+path.sep))throw Error('path outside fixture root');
    const bytes=await fs.readFile(file);
    res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
    res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');
    res.end(bytes);
  } catch {res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu',...(process.platform==='linux'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
  const page=await browser.newPage();page.on("console",m=>{if(m.type()==="error")console.error(m.text());});page.on("pageerror",e=>console.error(e));await page.goto(base+'build/generated-parity-bend/script.json');
  const steps=JSON.parse(await fs.readFile('build/generated-parity-bend/script.json','utf8'));
  const expected=JSON.parse(await fs.readFile('build/generated-parity-bend/expected.json','utf8'));
  const fixtures=steps.map((s,i)=>({...s,expected:expected[i].reply.value})).filter(s=>!process.env.INK_BROWSER_FUNCTION||s.pure===process.env.INK_BROWSER_FUNCTION);
  const bend=await page.evaluate(async({base,fixtures})=>{
    const root=new URL('build/generated-parity-bend/gpu-module/',base);
    const {loadInk}=await import(new URL('ink-gpu.mjs',root));
    const ink=await loadInk(root);const replies=[];const parts=new Map();
    const exact=v=>JSON.stringify(v,(_,x)=>{if(typeof x!=='bigint')return x;if(x>BigInt(Number.MAX_SAFE_INTEGER)||x<BigInt(Number.MIN_SAFE_INTEGER))throw Error('fixture integer outside exact Number range');return Number(x);});
    const typed=(v,t)=>t.kind==='u64'?BigInt(v):t.kind==='list'?v.map(x=>typed(x,t.element)):v;
    for(const f of fixtures)for(const backend of ['cpu','javascript','gpu']) {
      const params=ink.manifest.javascript.functions.find(x=>x.name===f.pure).params;
      const args=f.args.map((v,i)=>typed(v,params[i].type));
      const before=ink.parallelStatistics?.()[backend];
      let r;try{r=await ink.call(f.pure,args,{backend:backend==='gpu'&&f.expect_gpu?'gpu-required':backend});}catch(e){throw Error(`${f.pure}/${backend}: ${e.message}`);}
      if(f.expect_workers&&['cpu','javascript'].includes(backend)){const after=ink.parallelStatistics()[backend];if(after.workers-before.workers<2||after.lastWorkerIds.length<2)throw Error(`${f.pure}/${backend}: no distinct worker execution`);}
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
    let requiredErrors=0;
    for(const f of fixtures){const info=ink.manifest.functions.find(x=>x.name===f.pure);if(info.gpu)continue;let failed=false;try{await ink.call(f.pure,f.args,{backend:'gpu-required'});}catch{failed=true;}if(!failed)throw Error('unsupported required GPU call fell back');requiredErrors++;}
    for(const part of parts.values())await part.dispose();await ink.dispose();return {comparisons:replies.length,gpu_calls:replies.filter(r=>r.backend==='gpu').length,requiredErrors,replies};
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
    let refusedGrowth=false;try{await ink.pipeline({inputs:{xs:[1]},steps:[{id:'grown',call:'duplicate',args:[{input:'xs'}]}],iterations:2,feedback:{xs:'grown'},outputs:['grown']},{backend:'gpu-required'});}catch{refusedGrowth=true;}if(!refusedGrowth)throw Error('required GPU growth silently fell back');
    replies.push(growing);await ink.dispose();return {comparisons:replies.length,gpu_calls:replies.filter(r=>r.backend==='gpu').length,replies};
  },base);
  assert.equal(residency.gpu_calls,6);
  const numerics=[];
  for(const name of ['u64','f32']) {
    const script=await fs.readFile(`build/generated-parity-${name}/script.json`,'utf8');
    const expected=await fs.readFile(`build/generated-parity-${name}/expected.json`,'utf8');
    numerics.push(await page.evaluate(async({base,name,script,expected})=>{
      const fixture=new URL(`build/generated-parity-${name}/`,base),root=new URL('gpu-module/',fixture);
      const {parseExactJSON}=await import(new URL('state-wasm.mjs',fixture));
      const {loadInk}=await import(new URL('ink-gpu.mjs',root));
      const ink=await loadInk(root),steps=parseExactJSON(script),wanted=parseExactJSON(expected);
      const typed=(v,t)=>t.kind==='ref'?typed(v,ink.manifest.javascript.named_types[t.name]):t.kind==='u64'?BigInt(v):t.kind==='u32'||t.kind==='i32'?Number(v):t.kind==='f32'?typeof v==='object'?{F32Bits:Number(v.F32Bits)}:Number(v):t.kind==='list'||t.kind==='vector'?v.map(x=>typed(x,t.element)):t.kind==='record'?Object.fromEntries(t.fields.map(f=>[f.name,typed(v[f.name],f.type)])):v;
      const normalize=x=>typeof x==='bigint'?String(x):typeof x==='number'&&Number.isInteger(x)?Object.is(x,-0)?'negative zero':String(x):Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
      const exact=v=>JSON.stringify(normalize(v));
      const disabled=await loadInk(root,{gpu:false});let disabledError=false;
      try{await disabled.call(steps[0].pure,steps[0].args.map((v,i)=>typed(v,ink.manifest.javascript.functions.find(f=>f.name===steps[0].pure).params[i].type)),{backend:'gpu-required'});}catch{disabledError=true;}finally{await disabled.dispose();}
      if(!disabledError)throw Error('missing device silently fell back');
      let calls=0,dispatches=0;
      try{for(let i=0;i<steps.length;i++)for(const backend of ['cpu','javascript','gpu-required']){
        const step=steps[i],f=ink.manifest.javascript.functions.find(f=>f.name===step.pure);
        const args=step.args.map((v,j)=>typed(v,f.params[j].type));
        const reply=await ink.call(step.pure,args,{backend});
        if(exact(reply.value)!==exact(wanted[i].reply.value))throw Error(`${name}/${step.pure}/${backend}/${i}: exact numeric value mismatch`);
        if(backend==='gpu-required'){if(reply.backend!=='gpu')throw Error('required numeric GPU fallback');const n=reply.counters?.dispatches??0;if(args.some(a=>Array.isArray(a)&&a.length)&&n<1)throw Error('numeric GPU call did not dispatch');dispatches+=n;}
        calls++;
      }}finally{await ink.dispose();}
      return {domain:name,comparisons:calls,gpu_calls:steps.length,dispatches};
    },{base,name,script,expected}));
  }
  const receipt={status:'passed',browser:browser.version(),bend,residency,numerics};
  await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({status:receipt.status,browser:receipt.browser,comparisons:bend.comparisons+residency.comparisons+numerics.reduce((n,r)=>n+r.comparisons,0),gpu_calls:bend.gpu_calls+residency.gpu_calls+numerics.reduce((n,r)=>n+r.gpu_calls,0)}));
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
