import {attributeCalls} from './attribution.mjs';
const digest=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function runAttribution(root,gate){
 const base=new URL('reports/web-stack-engine-40-2026-10-11/transport/',root),raw=await(await fetch(new URL('attribution-protocol.json',base))).arrayBuffer(),protocol=JSON.parse(new TextDecoder().decode(raw));
 if(!gate?.authorized||!gate.instrumented_attribution||gate.protocol_sha256!==await digest(raw))throw Error('matching exclusive protocol gate required');
 for(const[p,h]of Object.entries(protocol.bindings))if(await digest(await(await fetch(new URL(p,root))).arrayBuffer())!==h)throw Error('attribution protocol binding drift '+p);
 const reports={},outputs={};
 for(const[version,folder]of [['original','attribution-original-final'],['candidate','attribution-candidate-final-3']]){
  const url=new URL(folder+'/',base),manifest=await(await fetch(new URL('manifest.json',url))).json(),{profileScope}=await import(new URL('backend-selection.mjs',url)),targetKey='transport40-attribution-unmeasured',costProfile={schema:1,target_key:targetKey,models:{[profileScope(manifest,protocol.entry)]:{boundary:'captured-owned',domains:{},backends:{cpu:{intercept_ns:1000,terms:{}},javascript:{intercept_ns:1,terms:{}},gpu:{intercept_ns:1000000,terms:{}}}}}},receipt=await(await fetch(new URL('attribution-preparation.json',url))).json(),requests=[];
  for(const n of protocol.sizes)for(const values of protocol.values)for(const backend of protocol.targets)for(let repeat=0;repeat<protocol.repeats_per_context;repeat++){
   const xs=Uint32Array.from({length:n},(_,i)=>values==='low'?(i*17+3)>>>0:Math.imul(i,2654435761)>>>0),ys=Uint32Array.from({length:Math.ceil(n/2)},(_,i)=>(i*7+11)>>>0);requests.push({name:protocol.entry,args:[xs,ys,0xffffffff,13],backend:backend==='cpu'?'cpu':'auto',context:{n,values,backend,repeat}});
  }
  outputs[version]=[];
  reports[version]=await attributeCalls(url,requests,{gate:{...gate,original_host_sha256:receipt.original_host_sha256},runtimeOptions:{policy:'adaptive',costProfile,targetKey},consume:value=>{outputs[version].push(value);let checksum=value.length>>>0;for(let i=0;i<value.length;i++)checksum=(checksum+Math.imul(i+1,value[i]))>>>0;return{length:value.length,checksum,consumed_elements:value.length}}});
  reports[version].calls.forEach((call,i)=>{call.context=requests[i].context;if(call.actual_backend!==(requests[i].backend==='cpu'?'cpu':'javascript'))throw Error('unexpected attribution route')});
 }
 for(let i=0;i<outputs.original.length;i++){const a=outputs.original[i],b=outputs.candidate[i];if(a.length!==b.length||a.some((x,j)=>x!==b[j]))throw Error('complete output mismatch '+i)}
 return{status:'passed',instrumented:true,excluded_from_performance_comparisons:true,protocol_sha256:await digest(raw),reports,complete_original_candidate_output_equality:true,outputs_survive_runtime_close:true,timing_calls:32,limits:protocol.limits};
}
