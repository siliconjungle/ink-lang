import {generateDocuments, defaultSeed} from '../src/json-search/documents.ts';
import {createGpuSearcher, bufferBytesFor} from '../src/json-search/searcher.ts';
import {requestBatchDevice} from '../src/json-search/gpu/host.ts';
import {functions as baseline} from './ink-baseline.mjs';
import {functions as utf8} from './ink-utf8.mjs';
import {loadInk as loadDfa} from './ink-dfa-gpu/ink-gpu.mjs';
import {loadInk as loadPacked} from './ink-packed-gpu/ink-gpu.mjs';
const parameters=new URL(location.href).searchParams;
const seed=Number(parameters.get('seed')??defaultSeed);
const count=Number(parameters.get('count')??100000);
if(![defaultSeed,20261015].includes(seed)||![100,10000,100000].includes(count))throw Error('unsupported corpus');
const button=document.querySelector<HTMLButtonElement>('#run')!;
const status=document.querySelector('#status')!, output=document.querySelector('#result')!;
const consume=(xs:ArrayLike<number>)=>{let h=0;for(let i=0;i<xs.length;i++)h=(Math.imul(h,31)^xs[i]!)>>>0;return h;};
const median=(xs:number[])=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)]!;
function expected(texts:string[],pattern:string){const re=new RegExp(pattern,'gu');return texts.map(s=>s.match(re)?.length??0);}
function same(xs:ArrayLike<number>,ys:ArrayLike<number>,lane:string){if(xs.length!==ys.length)throw Error(lane+' length');for(let i=0;i<xs.length;i++)if(xs[i]!==ys[i])throw Error(`${lane}: document ${i}: ${xs[i]} != ${ys[i]}`);}
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
button.onclick=async()=>{
 button.disabled=true;
 let hw:any,device:GPUDevice|undefined,dfa:any,packed:any,ds:any,ps:any;
 try{
  status.textContent='Generating exact documents and setting up resident inputs…';await pause(0);
  const texts=generateDocuments(count,seed,0).map(d=>d.text);
  const bytes=new TextEncoder().encode(JSON.stringify(texts));
  const documentsSha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const granted=await requestBatchDevice(bufferBytesFor(texts.length));device=granted.device;
  const hwStart=performance.now();hw=await createGpuSearcher(device,texts);const handwiredSetupMs=performance.now()-hwStart;
  const data=new Uint32Array(texts.length*512), ids=Uint32Array.from({length:texts.length},(_,i)=>i);
  const words=new Uint32Array(texts.length*128);const encodeStart=performance.now();
  for(let row=0;row<texts.length;row++){
   let position=0;for(const c of texts[row]!){if(position>=512)throw Error('text too long');const code=c.codePointAt(0)!;
    data[row*512+position]=code;
    words[(position>>>2)*texts.length+row]!|=(code<256?code:0)<<((position&3)*8);position++;
   }
  }
  const encodingMs=performance.now()-encodeStart;
  dfa=await loadDfa(new URL('./ink-dfa-gpu/',import.meta.url),{device,gpu:true,backend:'gpu-required'});
  const dfaStart=performance.now();
  ds=await dfa.open({inputs:{data,ids,table:new Uint32Array(16*256),width:1},steps:[{id:'counts',call:'counts_encoded',args:[{input:'data'},{input:'ids'},{input:'table'},{input:'width'}]}],outputs:['counts']},{backend:'gpu-required'});
  const dfaSetupMs=performance.now()-dfaStart;
  packed=await loadPacked(new URL('./ink-packed-gpu/',import.meta.url),{device,gpu:true,backend:'gpu-required'});
  const packedStart=performance.now();
  ps=await packed.open({inputs:{words,ids,rows:texts.length,masks:new Uint32Array(256),accept:1},steps:[{id:'counts',call:'counts_packed',args:[{input:'words'},{input:'ids'},{input:'rows'},{input:'masks'},{input:'accept'}]}],outputs:['counts']},{backend:'gpu-required'});
  const packedSetupMs=performance.now()-packedStart;
  if(ds.backend!=='gpu'||ps.backend!=='gpu')throw Error('actual GPU dispatch required');
  function tableFor(pattern:string){const table=new Uint32Array(16*256);if(pattern.length>16)throw Error('literal too wide');
   for(let state=0;state<pattern.length;state++)for(let code=0;code<256;code++){
    const prefix=pattern.slice(0,state)+String.fromCharCode(code);let next=Math.min(pattern.length,prefix.length);
    while(next>0&&!prefix.endsWith(pattern.slice(0,next)))next--;table[state*256+code]=next;
   }return table;
  }
  function masksFor(pattern:string){const masks=new Uint32Array(256);for(let i=0;i<pattern.length;i++)masks[pattern.charCodeAt(i)]!|=1<<i;return {masks,accept:(1<<(pattern.length-1))>>>0};}
  const counters:any[]=[];const rows:any[]=[];let sink=0,shuffleSeed=928173;
  const shuffle=(n:number)=>{const a=Array.from({length:n},(_,i)=>i);for(let i=n-1;i>0;i--){shuffleSeed^=shuffleSeed<<13;shuffleSeed^=shuffleSeed>>>17;shuffleSeed^=shuffleSeed<<5;const j=(shuffleSeed>>>0)%(i+1);[a[i],a[j]]=[a[j]!,a[i]!];}return a;};
  for(const pattern of ['error','connection reset','zzzzzzzz']){
   const want=expected(texts,pattern),digest=consume(want);
   const cpus=[{name:'ink-js-baseline',run:()=>baseline.counts(texts,pattern)},{name:'ink-js-utf8-no-encoding',run:()=>utf8.counts(texts,pattern)},
    {name:'native-regexp',run:()=>expected(texts,pattern)},{name:'handwritten-indexOf',run:()=>texts.map(text=>{let n=0,at=0;while(true){const i=text.indexOf(pattern,at);if(i<0)return n;n++;at=i+pattern.length;}})}];
   const gpus=[{name:'handwired-resident-gpu',run:async()=>{const r=await hw.search({pattern});if(r?.status!=='searched')throw Error(JSON.stringify(r));return r.matchCounts;}},
    {name:'ink-resident-gpu-dfa',run:async()=>{await ds.write('table',tableFor(pattern));await ds.write('width',pattern.length);const dispatch=await ds.step();const read=await ds.read({outputs:['counts']});counters.push({lane:'dfa',dispatch:dispatch.counters,read:read.counters});return read.values.counts;}},
    {name:'ink-resident-gpu-packed',run:async()=>{const {masks,accept}=masksFor(pattern);await ps.write('masks',masks);await ps.write('accept',accept);const dispatch=await ps.step();const read=await ps.read({outputs:['counts']});counters.push({lane:'packed',dispatch:dispatch.counters,read:read.counters});return read.values.counts;}}];
   const retain=(name:string,mode:string,samplesMs:number[])=>rows.push({pattern,lane:name,mode,medianMs:median(samplesMs),samplesMs,digest,matchedDocuments:want.filter(x=>x>0).length,totalMatches:want.reduce((a,b)=>a+b,0)});
   status.textContent='CPU checks and timings: '+pattern;await pause(0);
   const cpuSamples=cpus.map(()=>[] as number[]);
   for(const lane of cpus)same(await lane.run(),want,lane.name);
   for(let round=0;round<9;round++)for(const i of shuffle(cpus.length)){const t=performance.now(),value=await cpus[i]!.run();sink^=consume(value);cpuSamples[i]!.push(performance.now()-t);same(value,want,cpus[i]!.name);}
   cpus.forEach((lane,i)=>retain(lane.name,'cpu',cpuSamples[i]!));
   status.textContent='Warm and paused GPU checks: '+pattern;await pause(0);
   for(const i of shuffle(gpus.length)){
    const lane=gpus[i]!;for(let warm=0;warm<2;warm++)same(await lane.run(),want,lane.name);
    const samples:number[]=[];
    for(let round=0;round<9;round++){const t=performance.now(),value=await lane.run();sink^=consume(value);samples.push(performance.now()-t);same(value,want,lane.name);}
    retain(lane.name,'back-to-back',samples);
   }
   const paused=gpus.map(()=>[] as number[]);
   for(let round=0;round<5;round++)for(const i of shuffle(gpus.length)){
    await pause(250);const t=performance.now(),value=await gpus[i]!.run();sink^=consume(value);paused[i]!.push(performance.now()-t);same(value,want,gpus[i]!.name);
   }
   gpus.forEach((lane,i)=>retain(lane.name,'after-250ms-pause',paused[i]!));
  }
  const result={schema:1,status:'measured',date:new Date().toISOString(),experiment:'packed-circuits-v1',handwired:'09f23d276d3b9284cea4eec61ffd934950cc979e',ink:'933f427f967e1a8f60c7883bfd75af6d1eae9332 plus uncommitted library/UTF8 work',documents:count,seed,invalidFraction:0,documentsSha256,documentJsonBytes:bytes.length,encodingMs,handwiredSetupMs,dfaSetupMs,packedSetupMs,dfaSessionUpload:ds.counters,packedSessionUpload:ps.counters,counters,adapter:granted.adapterInfo,userAgent:navigator.userAgent,sink,rows,scope:'Exact non-overlapping ASCII literal counts on all characters. All output counts checked. Ink bit-state and DFA algorithms explicitly authored; no automatic regex substitution. Four mapped code points per u32, transposed; non-octet symbols mapped to zero, no NUL patterns. Resident inputs; setup and encoding reported separately. Warm blocks and 250ms pause measurements separated. CPU trusted JS calls. One page load per receipt.'};
  const saved=await fetch('http://127.0.0.1:4325/receipt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});if(!saved.ok)throw Error('receipt save failed');output.textContent=JSON.stringify(result,null,2);status.textContent='Complete; all counts matched. '+JSON.stringify(await saved.json());
 }catch(e){status.textContent='Failed: '+String(e);output.textContent=String(e instanceof Error?e.stack:e);}
 finally{if(ds)await ds.close();if(ps)await ps.close();if(dfa)await dfa.close();if(packed)await packed.close();hw?.destroy();device?.destroy();button.disabled=false;}
};
