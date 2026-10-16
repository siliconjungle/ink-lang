// One owned engine, one complete session and one full owned output read.
// The caller's loader binds the distinct engine-lifetime cost scope. No timers
// or speculative executions belong here; observations are acquired offline.
import {captureCostProfile} from './backend-selection.mjs';
export const COMPLETE_ENGINE_LIFECYCLE='engine-create/session-open/steps/full-read/session-close/engine-close-v1';
export async function completeSession(load,base,plan,{iterations=plan?.iterations??1,backend='auto',...options}={}){
 if(!Number.isSafeInteger(iterations)||iterations<1||iterations>1_000_000)throw Error('complete session iteration limit');
 if(!['auto','cpu','gpu','gpu-required'].includes(backend))throw Error('complete session backend');
 // Capture before loading can yield. Input/profile copying is part of the
 // measured engine lifetime, and never changes the caller's plan or profile.
 // Already prepared immutable profiles retain their private snapshot.
 const captured=structuredClone(plan);
 if(Object.hasOwn(options,'costProfile'))options.costProfile=captureCostProfile(options.costProfile);
 const engine=await load(base,options);
 let session,result,advanced;
 try{
  session=await engine.open(captured,{backend,workload:{iterations,readbacks:1}});
  advanced=await session.step(iterations);
  await session.finish();
  result=await session.read({outputs:captured.outputs??[captured.steps.at(-1).id]});
 }finally{
  try{await session?.close();}finally{await engine.close();}
 }
 return {...result,lifecycle:COMPLETE_ENGINE_LIFECYCLE,backend:session.backend,reason:session.reason,profile:session.profile,
  context:session.costContext,
  counters:{...session.counters,dispatches:advanced.counters?.dispatches??0,readback_bytes:result.counters?.readback_bytes??0}};
}
