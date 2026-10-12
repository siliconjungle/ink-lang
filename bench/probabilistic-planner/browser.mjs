import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {chromium} from 'playwright-core';
const root=resolve(new URL('../..',import.meta.url).pathname),bundle=join(root,'build/probabilistic-planner');
const output=join(root,'reports/probabilistic-planner-2026-10-12'),quick=Boolean(process.env.QUICK);
const server=createServer(async(req,res)=>{
  try {
    const path=resolve(bundle,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(path!==bundle&&!path.startsWith(bundle+sep))throw Error('invalid path');
    if(path===bundle){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Ink self-hosted planner</title>');return;}
    res.setHeader('Content-Type',({'.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.wgsl':'text/plain'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser=await chromium.launch({executablePath:process.env.CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-webgpu']});
  const page=await browser.newPage();page.on('console',msg=>{if(msg.type()==='log')console.log(msg.text());});await page.goto(base);
  const result=await page.evaluate(async({base,quick})=>{
    const {loadInk}=await import(new URL('ink/ink-gpu.mjs',base));
    const {plannerKernels}=await import(new URL('planner-kernels.mjs',base));
    const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error('hardware GPU required');
    const adapterInfo={vendor:adapter.info.vendor,architecture:adapter.info.architecture,isFallbackAdapter:adapter.isFallbackAdapter??adapter.info.isFallbackAdapter??null};
    if(adapterInfo.isFallbackAdapter||/swiftshader|software|lavapipe/i.test(JSON.stringify(adapterInfo)))throw Error('software GPU rejected');
    const engine=await loadInk(new URL('ink/',base)),kernels=plannerKernels(engine),samples=[],corners=[],startup=[];
    const weights=Uint32Array.from([17,3,29,11,7,19,2,5]);
    const instructions=Uint32Array.from({length:512},(_,i)=>i%2?(Math.imul(i,2654435761)+101)>>>0:(i/2)%3);
    const data=(n,seed)=>Uint32Array.from({length:n},(_,i)=>(Math.imul(i,2654435761)+seed)>>>0);
    function reference(kind,input){
      if(kind==='score'){
        const out=new Array(input.length/8);
        for(let row=0;row<out.length;row++){let s=0;for(let j=0;j<8;j++)s=(s+Math.imul(input[row*8+j],weights[j]))>>>0;out[row]=s;}return out;
      }
      const out=new Array(input.length);
      for(let row=0;row<input.length;row++){
        let v=input[row];for(let j=0;j<256;j++){const op=instructions[j*2],word=instructions[j*2+1];v=(op===1?Math.imul(v,word):op===2?v-word:v+word)>>>0;}out[row]=v;
      }return out;
    }
    const equal=(a,b)=>{if(a.length!==b.length)throw Error('length mismatch');for(let i=0;i<a.length;i++)if(a[i]!==b[i])throw Error('word mismatch '+i);};
    const checksum=xs=>xs.reduce((s,x,i)=>(Math.imul(s^x,16777619)+i)>>>0,2166136261);
    const run=async(kind,label,input)=>{
      if(label==='Plain JS')return {value:reference(kind,input.slice())};
      const backend=label==='Ink GPU'?'gpu-required':label==='Ink Wasm'?'cpu':'javascript';
      const reply=await kernels[kind](input,kind==='score'?weights:instructions,{backend});
      if(reply.backend!==(backend==='gpu-required'?'gpu':backend))throw Error('unexpected fallback');
      if(backend==='gpu-required'&&input.length&&(!reply.counters?.dispatches||!reply.counters.readback_bytes))throw Error('GPU receipts required');
      return {value:reply.values.result,backend:reply.backend,counters:reply.counters};
    };
    const labels=['Ink GPU','Ink Wasm','Ink JavaScript','Plain JS'];
    // Fresh engine/model first use, with shared module/browser/driver caches.
    for(const kind of ['score','evaluate'])for(const label of labels)for(let round=0;round<3;round++){
      const input=data(65536*(kind==='score'?8:1),881+round),expected=reference(kind,input);
      const start=performance.now();let value,backend,counters,fresh;
      if(label==='Plain JS'){value=reference(kind,input.slice());backend='javascript';}
      else{
        fresh=await loadInk(new URL('ink/',base));const k=plannerKernels(fresh),b=label==='Ink GPU'?'gpu-required':label==='Ink Wasm'?'cpu':'javascript';
        const r=await k[kind](input,kind==='score'?weights:instructions,{backend:b});value=r.values.result;backend=r.backend;counters=r.counters;
        if(backend!==(b==='gpu-required'?'gpu':b))throw Error('startup fallback');
      }
      const ms=performance.now()-start;equal(value,expected);startup.push({kind,label,n:65536,round,ms,backend,counters});if(fresh)await fresh.close();
    }
    for(const kind of ['score','evaluate'])for(const n of [0,1,63,64,65,257]){
      const input=data(n*(kind==='score'?8:1),4294967295),expected=reference(kind,input),copy=input.slice();
      for(const label of labels){const reply=await run(kind,label,input);equal(reply.value,expected);equal(input,copy);corners.push({kind,n,label,checksum:checksum(reply.value),counters:reply.counters});}
    }
    const sizes=quick?[4096]:[4096,65536,1048576],rounds=quick?2:7;
    for(const kind of ['score','evaluate'])for(const n of sizes){
      for(let round=-2;round<rounds;round++){
        const units=n===4096?8:n===65536?2:1;
        const inputs=Array.from({length:units},(_,i)=>data(n*(kind==='score'?8:1),173+round*997+i*31));
        const expected=inputs.map(x=>reference(kind,x));
        for(const label of round%2?[...labels].reverse():labels){
          const replies=[],start=performance.now();for(const input of inputs)replies.push(await run(kind,label,input));
          const batchMs=performance.now()-start;
          for(let i=0;i<units;i++)equal(replies[i].value,expected[i]);
          if(round>=0)samples.push({kind,n,round,label,units,batchMs,ms:batchMs/units,checksum:checksum(replies.at(-1).value),backend:replies.at(-1).backend,counters:replies.at(-1).counters});
        }
      }
      const input=data(257*(kind==='score'?8:1),7);
      for(const label of labels){const old=await run(kind,label,input),copy=Array.from(old.value);input.fill(0);await run(kind,label,input);equal(old.value,copy);}
      console.log('Measured self-hosted '+kind+' at '+n+' rows');
    }
    const deployed=[],deployedEngines={};
    for(const version of ['before','after']){
      const {loadInk}=await import(new URL(version+'/ink-gpu.mjs',base));deployedEngines[version]=await loadInk(new URL(version+'/',base));
    }
    for(const backend of ['javascript','cpu'])for(const n of sizes)for(let round=-2;round<rounds;round++){
      const units=n===4096?64:n===65536?8:1;
      const inputs=Array.from({length:units},(_,i)=>data(n,811+round*97+i*31)),expected=inputs.map(xs=>Array.from(xs,x=>Math.imul(x,13)>>>0));
      for(const version of round%2?['after','before']:['before','after']){
        const e=deployedEngines[version],replies=[],start=performance.now();
        for(const input of inputs)replies.push(await e.pipeline({steps:[{id:'result',call:'many',args:[input]}],outputs:['result']},{backend}));
        const batchMs=performance.now()-start;for(let i=0;i<units;i++)equal(replies[i].values.result,expected[i]);
        if(round>=0)deployed.push({version,backend,n,round,units,batchMs,ms:batchMs/units,checksum:checksum(replies.at(-1).values.result)});
      }
    }
    for(const e of Object.values(deployedEngines))await e.close();
    await engine.close();return {adapter:adapterInfo,sizes,rounds,samples,corners,deployed,startup,
      scope:'complete captured input and owned result; bounded u32 scoring and straight-line candidate evaluation; samples reject only, independent compiler admits transformations'};
  },{base,quick});
  result.browser=browser.version();result.hostCpu=cpus()[0].model;result.date='2026-10-12';result.quick=quick;result.hashes={};
  for(const path of ['planner/ink_planner/kernels/planner.ink','planner/ink_planner/hosts/planner-kernels.mjs','bench/probabilistic-planner/browser.mjs','build/probabilistic-planner/ink/manifest.json','build/probabilistic-planner/ink/cpu.wasm','build/probabilistic-planner/after/manifest.json','build/probabilistic-planner/selection.json'])result.hashes[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  await mkdir(output,{recursive:true});await writeFile(join(output,quick?'gpu-smoke.json':'gpu.json'),JSON.stringify(result,null,2)+'\n');console.log('All exact checks passed on '+result.hostCpu+' '+JSON.stringify(result.adapter));
} finally {
  if(browser)await browser.close();await new Promise(done=>server.close(done));
}
