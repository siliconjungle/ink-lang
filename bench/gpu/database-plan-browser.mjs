import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const [chrome,fixture='build/database-plan-conformance',output='build/database-plan-browser.json']=process.argv.slice(2);
const root=process.cwd();
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside fixture');
 const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');res.end(bytes);
 }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu',...(process.platform==='linux'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/${fixture}/composed/manifest.json`);
 const receipt=await page.evaluate(async({fixture})=>{
  const base=new URL('/',location.href),folder=new URL(fixture+'/composed/',base);
  const {parseExactJSON}=await import(new URL('runtime/hosts/state-wasm.mjs',base));
  const oracle=parseExactJSON(await(await fetch(new URL(fixture+'/oracle.json',base))).text());
  const {loadInk}=await import(new URL('ink-plan.mjs',folder));const host=await loadInk(folder);const state=host.createState();
  const normal=v=>typeof v==='bigint'?v.toString():typeof v==='number'&&Number.isInteger(v)?String(v):Array.isArray(v)?v.map(normal):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normal(x)])):v;
  const equal=(a,b,label)=>{if(JSON.stringify(normal(a))!==JSON.stringify(normal(b)))throw Error(label);};
  let comparisons=0;
  for(const step of oracle){
   if(step.restore)await state.restore(new Uint8Array(step.restore.map(Number)));
   else if(step.ack)state.acknowledge_through(...step.ack);
   else{let reply;try{reply={ok:await state.invoke_json(step.call,step.args)};}catch(e){reply={error:e.message};}equal(reply,step.reply,'state reply '+comparisons);}
   const bytes=await state.checkpoint();equal(Array.from(bytes),step.snapshot,'snapshot '+comparisons);equal(state.outbox,step.outbox,'outbox '+comparisons);await state.restore(bytes);comparisons++;
  }
  const before=await state.checkpoint();const route=await host.call('total',[Array.from({length:4096},(_,i)=>i)]);
  equal(route.value,8386560,'route result');if(!route.stages.some(s=>s.backend==='gpu'))throw Error('actual WebGPU stage required: '+JSON.stringify(route));
  equal(Array.from(await state.checkpoint()),Array.from(before),'pure route changed state');
  equal((await host.call('mapped',[[0,1,0xffffffff]])).value,[1,2,0],'literal public pure fallback');
  await host.dispose();return {status:'passed',comparisons,actual_gpu_stages:route.stages.filter(s=>s.backend==='gpu').length,scope:'same checked maintained state and public pure route; values/errors/events/exact original snapshots'};
 },{fixture});
 assert.equal(receipt.status,'passed');await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
