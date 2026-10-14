import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function checkWordFixtures(page,base){
 const results=[];
 for(const name of ['generated-parity-word-boundaries','generated-parity-semantic-word-baseline','semantic-word-selected']){
  const script=await fs.readFile(`build/${name}/script.json`,'utf8');
  const expected=await fs.readFile(`build/${name}/expected.json`,'utf8');
  results.push(await page.evaluate(async({base,name,script,expected})=>{
   const fixture=new URL(`build/${name}/`,base),root=new URL('gpu-module/',fixture);
   const {parseExactJSON}=await import(new URL('state-wasm.mjs',fixture));
   const {loadInk}=await import(new URL('ink-gpu.mjs',root));
   const ink=await loadInk(root),steps=parseExactJSON(script),wanted=parseExactJSON(expected);
   const typed=(v,t)=>t.kind==='ref'?typed(v,ink.manifest.javascript.named_types[t.name]):t.kind==='u64'?BigInt(v):t.kind==='u32'||t.kind==='i32'?Number(v):t.kind==='list'||t.kind==='vector'?v.map(x=>typed(x,t.element)):t.kind==='record'?Object.fromEntries(t.fields.map(f=>[f.name,typed(v[f.name],f.type)])):v;
   const normalize=x=>typeof x==='bigint'?String(x):typeof x==='number'&&Number.isInteger(x)?String(x):Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
   const exact=v=>JSON.stringify(normalize(v));let comparisons=0,gpu_calls=0,dispatches=0;
   try{for(let i=0;i<steps.length;i++)for(const backend of ['cpu','javascript','gpu-required']){
    const step=steps[i];if(backend==='gpu-required'&&!step.expect_gpu)continue;
    const f=ink.manifest.javascript.functions.find(x=>x.name===step.pure);
    const args=step.args.map((v,j)=>typed(v,f.params[j].type));
    const reply=await ink.call(step.pure,args,{backend});
    if(exact(reply.value)!==exact(wanted[i].reply.value))throw Error(`${name}/${step.pure}/${backend}: exact word result mismatch`);
    if(backend==='gpu-required'){
     if(reply.backend!=='gpu'||!(reply.counters?.dispatches>0))throw Error(`${name}: no required device dispatch`);
     gpu_calls++;dispatches+=reply.counters.dispatches;
    }
    comparisons++;
   }}finally{await ink.dispose();}
   return {name,comparisons,gpu_calls,dispatches};
  },{base,name,script,expected}));
 }
 return results;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [chrome,output='build/browser-word-parity.json']=process.argv.slice(2),root=process.cwd();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside root');
   const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');res.end(bytes);
  }catch{res.statusCode=404;res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu',...(process.platform==='linux'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
  const page=await browser.newPage(),base=`http://127.0.0.1:${server.address().port}/`;await page.goto(base+'build/generated-parity-word-boundaries/script.json');
  const results=await checkWordFixtures(page,base),receipt={status:'passed',browser:browser.version(),results};
  await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
