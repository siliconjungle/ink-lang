// Development host adapter for the opt-in Python planner bridge.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(new URL('../../build/probabilistic-planner/',import.meta.url).pathname);
let page,browser,pending=0,closing=false;
const server=createServer(async(req,res)=>{
  try {
    if(req.method==='POST'&&req.url==='/compute'){
      if(closing||pending>=32){res.writeHead(503);res.end();return;}
      if(req.headers['content-type']!=='application/json')throw Error('JSON required');
      pending++;try{
        let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>64_000_000)throw Error('request byte budget');chunks.push(chunk);}
        const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const reply=await page.evaluate(async p=>{
          const arrays=p.operation==='score'?[p.features,p.weights]:p.operation==='evaluate'?[p.inputs,p.instructions]:null;
          if(!arrays||arrays.some(a=>!Array.isArray(a)||a.length>8*1048576||a.some(x=>!Number.isInteger(x)||x<0||x>4294967295)))throw Error('bounded u32 operation required');
          const r=await globalThis.plannerKernels[p.operation](...arrays.map(a=>Uint32Array.from(a)),{backend:globalThis.plannerBackend});
          return {values:r.values.result,backend:r.backend,counters:r.counters};
        },payload);
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify(reply));
      }finally{pending--;}
      return;
    }
    if(req.method!=='GET')throw Error('unsupported method');
    const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(path===root){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Ink planner kernel adapter</title>');return;}
    if(!path.startsWith(root+sep))throw Error('invalid path');
    res.setHeader('Content-Type',({'.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.wgsl':'text/plain'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));
  }catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`;
try {
  browser=await chromium.launch({executablePath:process.env.CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-webgpu']});
  page=await browser.newPage();await page.goto(base);
  const backend=process.env.INK_PLANNER_BACKEND??'auto';
  const options=process.env.INK_PLANNER_PROFILE?JSON.parse(await readFile(process.env.INK_PLANNER_PROFILE,'utf8')):{};
  await page.evaluate(async({base,backend,options})=>{
    const {loadInk}=await import(new URL('ink/ink-gpu.mjs',base));const {plannerKernels}=await import(new URL('planner-kernels.mjs',base));
    globalThis.plannerEngine=await loadInk(new URL('ink/',base),options);
    globalThis.plannerKernels=plannerKernels(globalThis.plannerEngine);globalThis.plannerBackend=backend;
  },{base,backend,options});
  console.log(JSON.stringify({endpoint:base+'compute',backend,scope:'pure untrusted planner hints; source-bound proof checking remains independent'}));
  let stop;const stopped=new Promise(done=>{stop=done;});process.once('SIGINT',stop);process.once('SIGTERM',stop);await stopped;
}finally{
  closing=true;
  if(browser)await browser.close();await new Promise(done=>server.close(done));
}
