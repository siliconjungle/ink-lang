import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from '../../bench/gpu/node_modules/playwright-core/index.mjs';
const root=process.cwd(),prefix='/'+(process.env.INK_STATE_FLOAT_DIR??'build/state-native-f32-20261020')+'/';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Ink F32 conformance</title>');return;}
 try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/'))throw Error('path');const bytes=await readFile(path);res.setHeader('Content-Type',extname(path)==='.mjs'?'text/javascript':extname(path)==='.wasm'?'application/wasm':'application/json');res.end(bytes);}catch{res.statusCode=404;res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.INK_CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-webgpu']});
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async prefix=>{
  const canonical=v=>typeof v==='bigint'?String(v):typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)||ArrayBuffer.isView(v)?Array.from(v,canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const equal=(a,b,label)=>{if(JSON.stringify(canonical(a))!==JSON.stringify(canonical(b)))throw Error('mismatch '+label);};
  const m=await import(prefix+'conformance/program.mjs'),history=await(await fetch(prefix+'conformance/history.json')).json();
  let outcomes=0;
  for(const mode of ['invoke','prepared','bound']){
   const state=m.createState(),bindings=new Map();
   for(const step of history){
    if(!bindings.has(step.name))bindings.set(step.name,state.bind(step.name));
    const reply=step.name==='workers'?await state.invokeAsync(step.name,step.args):mode==='prepared'?state.invokePrepared(state.prepare(step.name,step.args)):mode==='bound'?bindings.get(step.name)(...step.args):state.invoke(step.name,step.args);
    equal(reply,step.reply,mode+':'+step.name);equal(await state.checkpoint(),step.snapshot,'checkpoint');outcomes++;
   }
   const saved=await state.checkpoint();state.beginTransaction();state.bind('remember')(-0);state.rollbackTransaction();equal(await state.checkpoint(),saved,'host rollback');
   const restored=m.createState();await restored.restore(saved);equal(await restored.checkpoint(),saved,'restore');
  }
  const adapter=await navigator.gpu.requestAdapter();if(!adapter||adapter.info.isFallbackAdapter)throw Error('hardware WebGPU adapter required');
  const bundle=new URL(prefix+'cross/gpu-module/',location.href),outer=await(await fetch(new URL('manifest.json',bundle))).json();
  const entry=outer.functions.find(f=>f.name==='device'),url=new URL(entry.bundle,bundle);
  const hostModule=await import(new URL('ink-gpu.mjs',url));const host=await hostModule.loadInk(url,{gpu:true});
  let gpu;try{gpu=await host.call('device',[[-1,0,1]],{backend:'gpu-required'});equal(gpu.value,m.functions.device([-1,0,1]),'device');if(gpu.backend!=='gpu'||gpu.counters.dispatches<1)throw Error('real GPU dispatch required');}finally{await host.dispose?.();await host.close?.();}
  return {userAgent:navigator.userAgent,crossOriginIsolated,referenceOutcomes:outcomes,exactSnapshots:true,hostRollback:true,workerStatistics:m.parallelStatistics(),gpu:{backend:gpu.backend,counters:gpu.counters,adapter:{vendor:adapter.info.vendor,architecture:adapter.info.architecture,description:adapter.info.description,isFallbackAdapter:adapter.info.isFallbackAdapter}}};
 },prefix);
 if(errors.length)throw Error(errors.join('\n'));await writeFile(resolve(root,'.'+prefix,'browser-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
