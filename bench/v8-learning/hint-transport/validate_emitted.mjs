// Required conformance only: no timings, profitability observations or policy.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {browserHost} from '../../../planner/ink_planner/browser_host.mjs';
const [browser,requestPath,sealed]=process.argv.slice(2),raw=await fs.readFile(requestPath);
if(createHash('sha256').update(raw).digest('hex')!==sealed)throw Error('validation request hash mismatch');
const request=JSON.parse(raw),helpers={};
for(const [url,name]of [['transfer','value_transfer'],['values','gpu_measurement_values'],['device','gpu_device']])helpers['/adapter/'+url+'.mjs']=fileURLToPath(new URL('../../../planner/ink_planner/'+name+'.mjs',import.meta.url));
const report=await browserHost(browser,request.artifacts.map(a=>a.path),helpers,async host=>{
 const result=await host.evaluate(`(${validate.toString()})(${JSON.stringify(request)},${JSON.stringify(host.base)})`,60000);
 return {...result,browserVersion:host.browserVersion};
},{timeout_ms:65000});
console.log(JSON.stringify({...report,request_sha256:sealed,scope:'Exact merged-emitter source/oracle and actual provided-device conformance; no performance samples or automatic selection authority.'}));
async function validate(request,base){
 const {unpackTransfer}=await import(base+'/adapter/transfer.mjs');
 const {same,normalized}=await import(base+'/adapter/values.mjs');
 const {openMeasurementDevice}=await import(base+'/adapter/device.mjs');
 const {device,identity,actual}=await openMeasurementDevice();
 const results=[];
 try{
  if(identity.isFallbackAdapter!==false)throw Error('actual hardware required');
  for(let i=0;i<request.artifacts.length;i++){
   const artifact=request.artifacts[i],root=base+'/artifact/'+i+'/',manifest=await(await fetch(root+'manifest.json')).json();
   if(manifest.core_sha256!==artifact.selected_core_sha256||manifest.runtime_abi!=='ink-packed-pipeline-v2')throw Error('source/ABI mismatch');
   const module=await import(root+'ink-gpu.mjs'),host=await module.loadInk(root,{device});
   try{
    const phases=structuredClone(unpackTransfer(request.phases)),beforeInputs=structuredClone(phases);
    for(const [split,calls]of Object.entries(phases))for(const call of calls){
     const before={...actual},output=await host.call(call.function,call.args,{backend:'gpu-required'});
     const observed={dispatches:actual.dispatches-before.dispatches,submissions:actual.submissions-before.submissions,readbacks:actual.readbacks-before.readbacks};
     if(output.backend!=='gpu'||!Number.isSafeInteger(output.counters.dispatches)||output.counters.dispatches<=0||observed.dispatches!==output.counters.dispatches||observed.submissions<=0||observed.readbacks<=0||output.counters.readback_bytes<=0)throw Error('actual device work missing/mismatched');
     const fn=manifest.functions.find(f=>f.name===call.function);if(!fn||!same(normalized(output.value,fn.result),normalized(call.expected,fn.result,true)))throw Error('source-oracle result mismatch');
     results.push({measurement:artifact.measurement,split,input_sha256:call.input_sha256,observed,reported:output.counters});
    }
    if(!same(phases,beforeInputs))throw Error('captured input mutated');
   }finally{if(host.dispose)await host.dispose();else await host.close?.();}
  }
  return {schema:1,device:identity,results};
 }finally{device.destroy();}
}
