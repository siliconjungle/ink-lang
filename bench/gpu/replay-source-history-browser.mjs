// Replay an existing reference history through JavaScript, Rust/Wasm and WebGPU.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const [chrome,fixture='build/source-reverse-parity',output='build/source-reverse-browser.json']=process.argv.slice(2);
if(!chrome)throw Error('Chrome executable required');
const root=process.cwd();let browser;
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside fixture');
  const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');res.end(bytes);
 }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu',...(process.platform==='linux'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
 const page=await browser.newPage();page.on('pageerror',e=>console.error(e));
 await page.goto(`http://127.0.0.1:${server.address().port}/${fixture}/script.json`);
 const receipt=await page.evaluate(async fixture=>{
  const base=new URL('/',location.href),folder=new URL(fixture+'/',base),bundle=new URL('gpu-module/',folder);
  const {parseExactJSON}=await import(new URL('state-wasm.mjs',folder));
  const read=async name=>parseExactJSON(await(await fetch(new URL(name,folder))).text());
  const steps=await read('script.json'),expected=await read('expected.json');
  const program=await import(new URL('program.mjs',bundle));
  const {loadInk}=await import(new URL('ink-gpu.mjs',bundle));const host=await loadInk(bundle);
  const normal=v=>typeof v==='bigint'?v.toString():typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normal):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,normal(x)])):v;
  const equal=(a,b,label)=>{if(JSON.stringify(normal(a))!==JSON.stringify(normal(b)))throw Error(label);};
  const capture=(v,t)=>{
   if(t.kind==='ref')return capture(v,program.metadata.named_types[t.name]);
   if(t.kind==='u32'||t.kind==='i32')return Number(v);
   if(t.kind==='f32')return typeof v==='object'?{F32Bits:Number(v.F32Bits)}:Number(v);
   if(t.kind==='f64')return typeof v==='object'?v:Number(v);
   if(t.kind==='list'||t.kind==='vector')return v.map(x=>capture(x,t.element));
   if(t.kind==='record')return Object.fromEntries(t.fields.map(f=>[f.name,capture(v[f.name],f.type)]));
   if(t.kind==='option')return Object.hasOwn(v,'Some')?{Some:capture(v.Some,t.element)}:v;
   if(t.kind==='result')return Object.hasOwn(v,'Ok')?{Ok:capture(v.Ok,t.ok)}:{Err:capture(v.Err,t.error)};
   return v;
  };
  let comparisons=0,restores=0,gpuCalls=0,requiredErrors=0,restoreRejections=0;const results=[];
  try{for(const backend of ['javascript','cpu','gpu']){
   let state=backend==='javascript'?host.createJavaScriptState():host.createState();let index=0;
   try{for(const step of steps){
    if(step.restore){const bytes=new Uint8Array(step.restore.map(Number));if(backend==='javascript')await state.restore(bytes);else{const restored=host.restoreState(bytes);state.dispose();state=restored;}restores++;continue;}
    if(step.reject_restore){
     const snapshot=()=>backend==='javascript'?state.checkpoint():state.snapshot();
     const before=Array.from(await snapshot()),bytes=new Uint8Array(step.reject_restore.map(Number));let rejected=false;
     try{if(backend==='javascript')await state.restore(bytes);else{const unexpected=host.restoreState(bytes);unexpected.dispose?.();}}
     catch(error){if(!String(error).includes(step.restore_error??'frozen'))throw error;rejected=true;}
     if(!rejected)throw Error('invalid frozen checkpoint was accepted');
     equal(Array.from(await snapshot()),before,`${backend} rejected restore changed state`);restoreRejections++;continue;
    }
    const decl=step.pure?program.metadata.functions.find(f=>f.name===step.pure):program.metadata.state.actions.find(a=>a.name===step.call);
    const args=step.args.map((v,i)=>capture(v,decl.params[i].type));let reply;
    if(step.pure){
     const result=await host.call(step.pure,args,{backend:backend==='gpu'&&step.expect_gpu?'gpu-required':backend});
     if(backend==='gpu'&&step.expect_gpu){if(result.backend!=='gpu')throw Error('eligible call fell back');gpuCalls++;}
     reply={value:result.value};
     if(backend==='gpu'&&!host.manifest.functions.find(f=>f.name===step.pure).gpu){
      let rejected=false;try{await host.call(step.pure,args,{backend:'gpu-required'});}catch{rejected=true;}
      if(!rejected)throw Error('unsupported required GPU call fell back');requiredErrors++;
     }
    }else reply={outcome:await state.invoke(step.call,args)};
    equal(reply,expected[index].reply,`${backend} reply ${index}`);
    equal(Array.from(backend==='javascript'?await state.checkpoint():state.snapshot()),expected[index].snapshot,`${backend} checkpoint ${index}`);index++;comparisons++;
   }}finally{state.dispose?.();}
   results.push({backend,observations:index});
  }}finally{await host.dispose();}
  if(gpuCalls===0)throw Error('actual WebGPU dispatch required');
  return {status:'passed',comparisons,restores,gpuCalls,requiredErrors,results,...(restoreRejections?{restoreRejections}:{}),scope:'complete values, outcomes, ordered events and exact portable snapshots; CPU-host computation, separate actual device computation'};
 },fixture);
 assert.equal(receipt.status,'passed');await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
