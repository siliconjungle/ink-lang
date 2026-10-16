// Complete warm pure-call measurements; explicit backends, no policy admission.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const [chrome,previous,grouped,framesPath,output,pairText='0']=process.argv.slice(2);
if(!output)throw Error('Chrome PREVIOUS_ARTIFACT GROUPED_ARTIFACT FRAMES OUTPUT [PAIR]');
const root=process.cwd(),pair=Number(pairText),frames=JSON.parse(await fs.readFile(framesPath));
const hash=b=>createHash('sha256').update(b).digest('hex');
const images={};
for(const [name,folder] of [['previous',previous],['grouped',grouped]]){
 const m=JSON.parse(await fs.readFile(path.join(folder,'artifact.json')));
 images[name]={manifest:hash(await fs.readFile(path.join(folder,'artifact.json'))),files:m.files};
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside fixture');
 const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');res.end(bytes);
 }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu',...(process.platform==='linux'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
 const page=await browser.newPage();page.on('pageerror',e=>console.error(e));
 await page.goto(`http://127.0.0.1:${server.address().port}/${framesPath}`);
 const result=await page.evaluate(async({previous,grouped,frames,pair})=>{
  const base=new URL('/',location.href),hosts={},setup={};
  for(const [name,folder] of [['previous',previous],['grouped',grouped]]){
   const bundle=new URL(folder+'/program/',base),started=performance.now();
   const {loadInk}=await import(new URL('ink-gpu.mjs',bundle));hosts[name]=await loadInk(bundle);setup[name]=(performance.now()-started)*1e6;
  }
  const helpers=hosts.grouped.manifest.functions.filter(f=>f.name.startsWith('__frozen_proposal_'));
  if(helpers.length!==7)throw Error('expected the recorded seven-helper fixture');
  const cases=[{name:'previous64gpu',host:'previous',helper:helpers[3].name,count:64,backend:'gpu-required',dispatches:64},
   {name:'grouped64gpu',host:'grouped',helper:helpers[3].name,count:64,backend:'gpu-required',dispatches:1},
   {name:'grouped512gpu',host:'grouped',helper:helpers[6].name,count:512,backend:'gpu-required',dispatches:1},
   {name:'grouped512cpu',host:'grouped',helper:helpers[6].name,count:512,backend:'cpu'},
   {name:'grouped512javascript',host:'grouped',helper:helpers[6].name,count:512,backend:'javascript'}];
  if(pair%2)cases.reverse();
  const rows=[];
  try{for(const cell of cases){
   const samples=[],counters=[];let checksum=0,initialization_ns;
   const invoke=async index=>{
    const frame=frames.frames[index%frames.frames.length];
    const result=await hosts[cell.host].call(cell.helper,frame.args,{backend:cell.backend});
    if(JSON.stringify(result.value)!==JSON.stringify(frame.expected[String(cell.count)]))throw Error(cell.name+' value mismatch');
    if(cell.backend==='gpu-required'&&(result.backend!=='gpu'||result.counters.dispatches!==cell.dispatches))throw Error(cell.name+' dispatch mismatch');
    checksum+=result.value;return result.counters;
   };
   let started=performance.now();await invoke(0);initialization_ns=(performance.now()-started)*1e6;
   for(let i=0;i<12;i++)await invoke(i);
   for(let sample=0;sample<7;sample++){
    started=performance.now();let last;
    for(let i=0;i<24;i++)last=await invoke(i);
    samples.push((performance.now()-started)*1e6/24);counters.push(last);
   }
   rows.push({...cell,samples_ns:samples,counters,checksum,initialization_ns});
  }}finally{for(const host of Object.values(hosts))await host.dispose();}
  return {rows,setup_ns:setup,userAgent:navigator.userAgent,order:cases.map(c=>c.name)};
 },{previous,grouped,frames,pair});
 assert.equal(result.rows.length,5);
 await fs.writeFile(output,JSON.stringify({schema:1,pair,process:randomUUID(),images,frames_sha256:hash(await fs.readFile(framesPath)),...result,
  scope:'Explicit complete warm async pure calls on one workstation, including input capture, device uploads/dispatch/readback, result decoding and full oracle comparison. Imports/initial shader setup are recorded separately. No automatic selection, exclusive-machine, cold-start, upstream or GPU-training claim.'},null,2)+'\n');
 console.log(JSON.stringify({pair,order:result.order,medians:result.rows.map(r=>({name:r.name,ns:[...r.samples_ns].sort((a,b)=>a-b)[3]}))}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
