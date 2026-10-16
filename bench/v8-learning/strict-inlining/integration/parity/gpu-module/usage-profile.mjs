// Observed frequencies and shapes, never user estimates or semantic premises.
// Bounded aggregation stores no argument values. The caller publishes a snapshot
// offline; recording does not run probes or choose an implementation.
export function createUsageRecorder({source,target,workload,maxEvents=1000000}){
 if(!/^[0-9a-f]{64}$/.test(source)||!target?.backend||!Number.isSafeInteger(maxEvents)||maxEvents<1||maxEvents>1000000000)throw Error('invalid usage recorder binding');
 target=structuredClone(target);workload=workload?structuredClone(workload):null;
 const recordingId=globalThis.crypto.randomUUID();
 const counts=Object.create(null),shapes=new Map();let events=0,peakPending=0,peakBytes=0,failed=0,saturated=false;
 function observe(e){
  if(e.source&&e.source!==source)throw Error('usage event source mismatch');
  if(events>=maxEvents){saturated=true;return;}events++;
  if(e.event==='accepted'){peakPending=Math.max(peakPending,e.pending??1);peakBytes=Math.max(peakBytes,e.pending_bytes??e.input_bytes??0);}
  const isFailure=e.event==='failed';if(isFailure)failed++;
  if(e.event!=='completed'&&!isFailure)return;
  e={...e,phase:isFailure?'failed:'+e.phase:e.phase};
  if(!/^[A-Za-z0-9:_\-.]{1,128}$/.test(e.phase))throw Error('invalid observed phase');
  if(!Object.hasOwn(counts,e.phase)&&Object.keys(counts).length>=64){saturated=true;return;}
  counts[e.phase]=(counts[e.phase]??0)+1;
  const key=JSON.stringify([e.function??null,e.input_elements??0,e.input_bytes??0]);
  if(!shapes.has(key)&&shapes.size>=256){saturated=true;return;}shapes.set(key,(shapes.get(key)??0)+1);
 }
 return {observe,snapshot(){return {schema:1,semantics:'ink-observed-usage-v1',recording_id:recordingId,source,target:structuredClone(target),workload:workload?structuredClone(workload):{shape:{observed:[...shapes].map(([key,count])=>({shape:JSON.parse(key),count}))},distribution:{recorded_frequencies:{...counts}},concurrency:Math.max(1,peakPending),residency:'captured-owned'},counts:{...counts},peak_pending:peakPending,peak_pending_bytes:peakBytes,failed,saturated,events,shapes:[...shapes].map(([key,count])=>({shape:JSON.parse(key),count}))};}};
}
// Works with synchronous or asynchronous literal adapters, including lifecycle
// operations (construction, migration, checkpoint, update, query, disposal).
export function recordCall(recorder,phase,invoke,features={}){
 const event={...features,phase};const observe=e=>{try{recorder.observe(e);}catch{}};observe({...event,event:'accepted'});
 try{const value=invoke();if(value&&typeof value.then==='function')return value.then(v=>{observe({...event,event:'completed'});return v;},e=>{observe({...event,event:'failed'});throw e;});observe({...event,event:'completed'});return value;}
 catch(error){observe({...event,event:'failed'});throw error;}
}
