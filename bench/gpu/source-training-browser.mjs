// BASE_URL FIXTURE_DIRECTORY OUTPUT_JSON CHROME_EXECUTABLE
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function checkSourceTraining(page,base,root){
 const script=JSON.parse(await fs.readFile(path.join(root,'native-cpu-script.json'),'utf8'));
 const native=(await fs.readFile(path.join(root,'native-cpu-history.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 if(script.length!==native.length)throw Error('incomplete native source control');
 const expected=Object.fromEntries(script.flatMap((op,i)=>op.read?[[op.label,native[i].values]]:[]));
 const result=await page.evaluate(async({base,script,expected})=>{
  const {loadInk}=await import(new URL('ink-gpu.mjs',base));
  let uploads=0,readbacks=0;
  const write=GPUQueue.prototype.writeBuffer,map=GPUBuffer.prototype.mapAsync;
  GPUQueue.prototype.writeBuffer=function(...args){uploads++;return Reflect.apply(write,this,args);};
  GPUBuffer.prototype.mapAsync=function(...args){readbacks++;return Reflect.apply(map,this,args);};
  function normalize(value){
   if(typeof value==='number'&&Object.is(value,-0))return {F32Bits:2147483648};
   if(Array.isArray(value))return value.map(normalize);
   if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalize(value[k])]));
   return value;
  }
  const same=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
  const engine=await loadInk(base);
  const histories={},receipts={};
  for(const backend of ['cpu','gpu-required']){
   let session;
   histories[backend]={};receipts[backend]=[];
   for(const op of script){
    if(op.open){
     session=await engine.open(op.open,{backend});
     if(session.backend!==(backend==='cpu'?'cpu':'gpu'))throw Error('session fallback');
    }else if(op.step){
     const before={uploads,readbacks};
     const receipt=await session.step(op.step);
     receipt.observed_transfers={uploads:uploads-before.uploads,readbacks:readbacks-before.readbacks};
     receipts[backend].push(receipt);
     if(backend==='gpu-required'&&(!(receipt.counters.dispatches>0)||receipt.backend!=='gpu'||receipt.observed_transfers.uploads!==0||receipt.observed_transfers.readbacks!==0))throw Error('nonresident GPU iteration');
    }else if(op.read){
     const reply=await session.read(op.read);
     if(!same(reply.values,expected[op.label]))throw Error(`${backend}: complete source mismatch at ${op.label}`);
     histories[backend][op.label]=normalize(reply.values);
    }else if(op.write){await session.write(op.write.input,op.write.value);
    }else if(op.close){await session.close();}
   }
  }
  const p=script[0].open.inputs;
  const javascript=await engine.call('gradients',[p.parameters,p.features,p.targets,p.rows],{backend:'javascript'});
  if(javascript.backend!=='javascript'||!same(javascript.value,expected.first.gradient))throw Error('JavaScript source gradient mismatch');
  const precision={};
  for(const backend of ['cpu','javascript']){
   const result=await engine.call('precise_gradient',[1.0000000000000002],{backend});
   if(result.backend!==backend||result.value!==2.0000000000000004)throw Error(`${backend}: binary64 companion precision lost`);
   precision[backend]=result.value;
  }
  let rejected=false;
  try{await engine.call('precise_gradient',[1.0000000000000002],{backend:'gpu-required'});}catch(error){if(!String(error).includes('binary64 device arithmetic'))throw error;rejected=true;}
  if(!rejected)throw Error('binary64 companion unexpectedly dispatched');
  const adapter=await navigator.gpu.requestAdapter();
  return {host:'browser',adapter:adapter.info,userAgent:navigator.userAgent,histories,receipts,javascript_initial_gradient_exact:true,binary64_companion:precision,binary64_gpu_required_rejected:rejected};
 },{base,script,expected});
 return result;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const [base,root,output,chrome]=process.argv.slice(2);
 const spec=process.env.INK_PLAYWRIGHT_MODULE??'playwright-core';
 const {chromium}=await import(spec.startsWith('/')?pathToFileURL(spec).href:spec);
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-webgpu',...(process.platform==='linux'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
 try{
  const page=await browser.newPage();await page.goto(base);
  const result=await checkSourceTraining(page,base,root);
  await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({host:result.host,complete_reads:Object.fromEntries(Object.entries(result.histories).map(([k,v])=>[k,Object.keys(v).length])),javascript_initial_gradient_exact:true}));
 }finally{await browser.close();}
}
