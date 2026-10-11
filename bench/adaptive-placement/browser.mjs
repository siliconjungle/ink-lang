// Reproducible real-browser conformance, offline training and frozen holdout.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [bundleArg,outputArg,playwrightArg,chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']=process.argv.slice(2);
if(!bundleArg||!outputArg)throw Error('usage: node browser.mjs BUNDLE OUTPUT [PLAYWRIGHT-CORE-DIRECTORY] [CHROME]');
const {chromium}=await import(playwrightArg?pathToFileURL(join(resolve(playwrightArg),'index.mjs')):'playwright-core');
const bundle=resolve(bundleArg),output=resolve(outputArg);
const server=createServer(async(req,res)=>{
 try{const path=resolve(bundle,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==bundle&&!path.startsWith(bundle+sep))throw Error('invalid path');
 if(path===bundle){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Ink adaptive placement validation</title>');return;}
 res.setHeader('Content-Type',({'.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.wgsl':'text/plain'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu']});
try {
 const page=await browser.newPage();await page.goto(base);
 const result=await page.evaluate(async base=>{
  const {loadInk}=await import(new URL('ink-gpu.mjs',base));
  const {collectPlacementObservations,collectPlacementStartup}=await import(new URL('pipeline-profile.mjs',base));
  const {fitPlacementProfile}=await import(new URL('pipeline-selection.mjs',base));
  const BrowserWorker=globalThis.Worker;let workerActive=0,workerPeak=0,workerMessages=0;
  globalThis.Worker=class extends BrowserWorker {
    constructor(...args){super(...args);this.addEventListener('message',()=>workerActive--);}
    postMessage(...args){workerMessages++;workerActive++;workerPeak=Math.max(workerPeak,workerActive);return super.postMessage(...args);}
  };
  const engine=await loadInk(base,{parallelism:2}),adapter=await navigator.gpu?.requestAdapter();
  if(!adapter)throw Error('actual WebGPU adapter required');
  const info=adapter.info,receipts=[];let comparisons=0;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const check=async(plan,placements,expectedBackend)=>{
    const reference=await engine.pipeline(plan,{backend:'cpu'}),result=await engine.pipeline(plan,{placements});
    if(!same(reference.values,result.values))throw Error('placement result mismatch '+JSON.stringify(placements));
    if(expectedBackend&&result.backend!==expectedBackend)throw Error('unexpected fallback '+JSON.stringify(result.stages));
    comparisons++;const {values,...receipt}=result;receipts.push(receipt);return result;
  };
  const chain=xs=>({inputs:{xs},steps:[{id:'a',call:'inc',args:[{input:'xs'}]},{id:'b',call:'double',args:[{step:'a'}]},{id:'sum',call:'total',args:[{step:'b'}]}],outputs:['b','sum']});
  for(const xs of [[],[0,1,4294967295],Array.from({length:513},(_,i)=>i)]) {
    const r=await check(chain(xs),[{end:2,backend:'gpu'},{end:3,backend:'javascript'}],xs.length?'mixed':undefined);
    if(xs.length&&r.stages[0].counters.readback_bytes>=xs.length*8+16)throw Error('internal GPU edge read back');
    await check(chain(xs),[{end:1,backend:'javascript'},{end:2,backend:'cpu'},{end:3,backend:'gpu'}],xs.length?'mixed':undefined);
  }
  const original=Uint32Array.of(3,7),p=chain(original),pending=engine.pipeline(p,{placements:[{end:2,backend:'gpu'},{end:3,backend:'cpu'}]});original.fill(99);
  const owned=await pending;if(!same(owned.values,{b:[8,16],sum:24}))throw Error('input capture failed');
  const branch=xs=>({inputs:{xs},steps:[{id:'a',call:'heavy',args:[{input:'xs'}]},{id:'b',call:'heavy',args:[{input:'xs'}]},{id:'ta',call:'total',args:[{step:'a'}]},{id:'tb',call:'total',args:[{step:'b'}]},{id:'join',call:'combine',args:[{step:'ta'},{step:'tb'}]}],outputs:['a','b','join']});
  await check(branch([0,1,4294967295]),[{end:1,backend:'javascript-worker'},{end:2,backend:'cpu-worker'},{end:5,backend:'javascript'}],'mixed');
  await check({steps:[{id:'wide',call:'wide',args:[['18446744073709551615','9007199254740993']]}],outputs:['wide']},[{end:1,backend:'javascript-worker'}],'javascript-worker');
  for(const iterations of [1,2,3])await check({inputs:{a:[1,2],b:[7,9]},steps:[{id:'a',call:'identity',args:[{input:'a'}]},{id:'b',call:'identity',args:[{input:'b'}]}],outputs:['a','b'],feedback:{a:'b',b:'a'},iterations},[{end:1,backend:'cpu-worker'},{end:2,backend:'gpu'}]);
  await check({inputs:{xs:[0,1,2,3]},steps:[{id:'e',call:'evens',args:[{input:'xs'}]},{id:'i',call:'inc',args:[{step:'e'}]}],outputs:['i'],feedback:{xs:'i'},iterations:3},[{end:1,backend:'cpu'},{end:2,backend:'gpu'}]);
  const heavy=xs=>({inputs:{xs},steps:[{id:'h',call:'heavy',args:[{input:'xs'}]},{id:'i',call:'inc',args:[{step:'h'}]},{id:'sum',call:'total',args:[{step:'i'}]}],outputs:['sum']});
  const data=(n,seed)=>Array.from({length:n},(_,i)=>(Math.imul(i,1664525)+seed)>>>0);
  // Separate training values/sizes from held-out measurement.
  const observations=await collectPlacementObservations(engine,[256,1024,4096,16384].map(n=>heavy(data(n,17))),{intervals:[[0,3],[0,2],[2,3]],samples:7,warmup:2});
  const workerObservations=await collectPlacementObservations(engine,[1024,4096,16384].map(n=>branch(data(n,29))),{intervals:[[0,5],[0,1],[1,2],[2,5]],backends:['cpu','cpu-worker'],samples:7,warmup:2});
  observations.observations.push(...workerObservations.observations);observations.requests+=workerObservations.requests;
  const targetKey=JSON.stringify([navigator.userAgent,info?.vendor,info?.architecture,info?.device,info?.description]);
  const expectedCalls=256,startup=await collectPlacementStartup(()=>loadInk(base,{parallelism:2}),heavy(data(4096,31)));
  const profile=fitPlacementProfile(observations,{targetKey,setupNs:startup.setup_ns}),adaptive=await loadInk(base,{parallelism:2,placementProfile:profile,targetKey,expectedCalls});
  const holdout=[];
  for(const [kind,n] of [['heavy',512],['heavy',2048],['heavy',8192],['heavy',0],['heavy',32768],['branches',2048],['branches',8192]]) {
    const plan=(kind==='heavy'?heavy:branch)(data(n,83)),reference=await engine.pipeline(plan,{backend:'cpu'});
    const coldStart=performance.now(),cold=await adaptive.pipeline(plan),coldMs=performance.now()-coldStart;
    if(!same(reference.values,cold.values))throw Error('cold adaptive mismatch');
    const times={cpu:[],adaptive:[]};let chosen;
    for(let k=-2;k<9;k++)for(const mode of (k%2?['adaptive','cpu']:['cpu','adaptive'])) {
      const batch=7,results=[],start=performance.now();
      for(let call=0;call<batch;call++)results.push(await (mode==='cpu'?engine.pipeline(plan,{backend:'cpu'}):adaptive.pipeline(plan)));
      const ms=(performance.now()-start)/batch;
      for(const r of results)if(!same(reference.values,r.values))throw Error('heldout output mismatch');
      if(k>=0)times[mode].push(ms);if(mode==='adaptive')chosen=results.at(-1);
    }
    const median=xs=>xs.slice().sort((a,b)=>a-b)[Math.floor(xs.length/2)],cpuMs=median(times.cpu),adaptiveMs=median(times.adaptive);
    holdout.push({kind,n,scope:chosen.placement?.scope,cold_ms:coldMs,backend:chosen.backend,segments:chosen.placement?.segments,reason:chosen.reason,counters:chosen.counters,cpu_ms:cpuMs,adaptive_ms:adaptiveMs,speedup:cpuMs/adaptiveMs,amortised_ms:(coldMs+(expectedCalls-1)*adaptiveMs)/expectedCalls,amortised_speedup:cpuMs/((coldMs+(expectedCalls-1)*adaptiveMs)/expectedCalls),samples:times});
  }
  // Domain misses must preserve baseline, and losses are retained in evidence.
  if(holdout.filter(r=>r.n===0||r.n===32768).some(r=>r.backend!=='cpu'))throw Error('out-of-domain placement');
  await adaptive.close();await engine.close();
  if(!same(owned.values,{b:[8,16],sum:24}))throw Error('borrowed output storage');
  if(workerPeak<2||workerActive!==0)throw Error('independent real worker tasks did not overlap/drain');
  return {status:'passed',comparisons,workers:{peak_pending:workerPeak,messages:workerMessages,pending_after_close:workerActive},adapter:info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description}:null,target_key:targetKey,expected_calls:expectedCalls,startup,receipts,observations,profile,holdout};
 },base);
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{Object.defineProperty(navigator,'gpu',{value:undefined});globalThis.Worker=undefined});await fallback.goto(base);
 result.unavailable=await fallback.evaluate(async base=>{const {loadInk}=await import(new URL('ink-gpu.mjs',base));const e=await loadInk(base,{parallelism:2});const r=await e.pipeline({steps:[{id:'a',call:'inc',args:[[1,2]]},{id:'b',call:'double',args:[{step:'a'}]}]},{placements:[{end:1,backend:'javascript-worker'},{end:2,backend:'gpu'}]});await e.close();if(JSON.stringify(r.values)!=='{"b":[4,6]}'||r.backend!=='cpu')throw Error('unavailable fallback mismatch');return r;},base);
 const broken=await browser.newPage();await broken.route('**/*.wgsl',route=>route.fulfill({status:200,body:'invalid shader'}));await broken.goto(base);
 result.shader_failure=await broken.evaluate(async base=>{const {loadInk}=await import(new URL('ink-gpu.mjs',base));const e=await loadInk(base);const r=await e.pipeline({steps:[{id:'a',call:'inc',args:[[1,2]]},{id:'b',call:'double',args:[{step:'a'}]}]},{placements:[{end:2,backend:'gpu'}]});await e.close();if(r.backend!=='cpu'||JSON.stringify(r.values)!=='{"b":[4,6]}')throw Error('shader failure mismatch');return r;},base);
 const brokenWorker=await browser.newPage();await brokenWorker.route('**/pipeline-worker.mjs',route=>route.fulfill({status:404,body:'worker unavailable'}));await brokenWorker.goto(base);
 result.worker_failure=await brokenWorker.evaluate(async base=>{const {loadInk}=await import(new URL('ink-gpu.mjs',base));const e=await loadInk(base,{parallelism:2,workerTimeoutMs:1000});const r=await e.pipeline({steps:[{id:'a',call:'inc',args:[[1,2]]},{id:'b',call:'double',args:[{step:'a'}]}]},{placements:[{end:2,backend:'cpu-worker'}]});await e.close();if(r.backend!=='cpu'||JSON.stringify(r.values)!=='{"b":[4,6]}')throw Error('worker failure mismatch');return r;},base);
 result.browser=browser.version();result.chrome=chrome;await mkdir(output,{recursive:true});
 await writeFile(join(output,'browser.json'),JSON.stringify(result,null,2)+'\n');
 await writeFile(join(output,'placement-profile.training.json'),JSON.stringify(result.profile,null,2)+'\n');
 // Only release a profile for scopes with measured complete-request wins. The
 // unfiltered fitted profile remains evidence, including losing predictions.
 const accepted={...result.profile,models:{...result.profile.models}};
 const failedScopes=new Set(result.holdout.filter(r=>r.segments?.some(s=>s.backend!=='cpu')&&(r.speedup<1.1||r.amortised_speedup<1.1)).map(r=>r.scope));
 for(const scope of Object.keys(accepted.models))if(failedScopes.has(JSON.parse(scope)[0]))delete accepted.models[scope];
 result.release_gate={minimum_speedup:1.1,failed_pipeline_scopes:[...failedScopes],released_models:Object.keys(accepted.models).length};
 await writeFile(join(output,'browser.json'),JSON.stringify(result,null,2)+'\n');
 await writeFile(join(output,'placement-profile.json'),JSON.stringify(accepted,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,browser:result.browser,adapter:result.adapter,comparisons:result.comparisons,holdout:result.holdout.map(({samples,scope,...r})=>r),released_models:Object.keys(accepted.models).length}));
} finally {await browser.close();await new Promise(done=>server.close(done));}
