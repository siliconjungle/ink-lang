// Recent windows are diagnostic usage evidence, never proof premises.
export function createAdaptiveRecorder({windowCalls=128,maxCells=64,historyWindows=4,sampleEvery=16,maxObservationNs=10000,clock=()=>performance.now()}={}){
 const integer=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
 if(!integer(windowCalls,1,1000000)||!integer(maxCells,1,64)||!integer(historyWindows,1,64)||!integer(sampleEvery,1,1000000)||!Number.isFinite(maxObservationNs)||maxObservationNs<0)throw Error('adaptive recording budget');
 let counts=Object.create(null),latency=Object.create(null),calls=0,total=0,saturated=false,stateElements=0,history=[],samples=0,overhead=0,timingEnabled=true,sequence=0;
 const now=()=>{try{const n=clock();return Number.isFinite(n)?n:null;}catch{return null;}};
 return {
  start(){sequence++;const sampled=timingEnabled&&sequence%sampleEvery===0;return sampled?now():null;},
  finish(phase,shape,start,{failed=false,state_elements=0}={}){
   const end=start===null?null:now();
   try {
    total++;calls++;
    if(!/^[A-Za-z0-9:_\-.]{1,128}$/.test(phase)||typeof shape!=='string'||!/^[A-Za-z0-9:_.,\-]{1,64}$/.test(shape)||!integer(state_elements,0,Number.MAX_SAFE_INTEGER)){saturated=true;}
    else {
     stateElements=state_elements;
     const cell=(failed?'failed:':'')+phase+'@'+shape;
     if(!Object.hasOwn(counts,cell)&&Object.keys(counts).length>=maxCells)saturated=true;
     else {counts[cell]=(counts[cell]??0)+1;
      if(start!==null&&end!==null&&end>=start){const ns=(end-start)*1e6;if(Number.isFinite(ns)){const l=latency[cell]??={samples:0,total_ns:0,max_ns:0};l.samples++;l.total_ns+=ns;l.max_ns=Math.max(l.max_ns,ns);}}
     }
    }
   }catch{saturated=true;}
   if(end!==null){const finish=now();if(finish!==null&&finish>=end){samples++;overhead+=(finish-end)*1e6;if(overhead/samples>maxObservationNs)timingEnabled=false;}}
   if(calls<windowCalls)return null;
   const window={counts:{...counts},calls,total_calls:total,state_elements:stateElements,saturated};
   const diagnostic={...window,latency:structuredClone(latency),timing_enabled:timingEnabled,sampled_observation_ns:samples?overhead/samples:null};
   history.push(diagnostic);if(history.length>historyWindows)history.shift();
   counts=Object.create(null);latency=Object.create(null);calls=0;saturated=false;
   // An overflowing window has incomplete counts and cannot enter the decision engine.
   return window;
  },
  snapshot(){return {total_calls:total,partial_calls:calls,timing_enabled:timingEnabled,windows:structuredClone(history)};}
 };
}
