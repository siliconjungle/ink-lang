import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const [chrome,fixture='build/proved-usage/graph/bundle',output='build/proved-usage/browser.json']=process.argv.slice(2),root=process.cwd();
const server=http.createServer(async(req,res)=>{res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside fixture');const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');res.end(bytes);}catch(e){res.statusCode=404;res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu']});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/${fixture}/manifest.json`);
 const result=await page.evaluate(async({fixture})=>{
  const folder=new URL('/'+fixture+'/',location.href);const manifest=await(await fetch(new URL('manifest.json',folder))).json();const {createUsageRecorder}=await import(new URL('usage-profile.mjs',folder));
  const target={hardware:navigator.userAgent,driver:'browser WebGPU',toolchain:manifest.backend,backend:'webgpu',bridge:'captured-owned'};
  const recorder=createUsageRecorder({source:manifest.usage_core_sha256,target});const {loadRoute}=await import(new URL('ink-route.mjs',folder));const engine=await loadRoute(folder,{onUsage:recorder.observe});
  const xs=Uint32Array.from({length:4096},(_,i)=>i);const first=engine.run([xs]);xs.fill(0);const second=engine.run([Uint32Array.from([1,2,3])]);
  let rejected=false;try{await engine.run([[]]);}catch(e){rejected=e.code==='INK_BACKPRESSURE';}if(!rejected)throw Error('pending count was not enforced');
  const a=await first,b=await second;if(a.value!==8386561||b.value!==7||!a.stages.some(s=>s.backend==='gpu'))throw Error('GPU route/capture failed '+JSON.stringify(a));
  try{await engine.run([new Uint32Array(8193)]);throw Error('missing byte rejection');}catch(e){if(e.code!=='INK_BACKPRESSURE')throw e;}
  await engine.close();const snapshot=recorder.snapshot();if(snapshot.peak_pending!==2||snapshot.counts['call:entry']!==2)throw Error('incorrect observed profile');return {status:'passed',actual_gpu_stages:a.stages.filter(s=>s.backend==='gpu').length,value:a.value,profile:snapshot};
 },{fixture});assert.equal(result.status,'passed');await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
