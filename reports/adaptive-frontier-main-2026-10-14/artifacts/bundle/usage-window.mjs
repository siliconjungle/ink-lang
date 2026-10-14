import {selectionRequest} from './ink-selection.mjs';
// Operation-site counters: no argument/document traversal, no raw key retention.
// Applications supply stable scoped integer IDs when locality is relevant.
export function captureUsage(event){
 if(event===undefined)return null;
 const result={kind:event.kind};
 if(!['read','write','scan','invalidate'].includes(result.kind))return null;
 for(const key of ['key','path','shape','size','scanned','touched','invalidated']){
  const n=event[key];if(n!==undefined){if(!Number.isSafeInteger(n)||n<0)return null;result[key]=n;}
 }
 return result;
}
export function createUsageWindow({windowCalls=256,sampleEvery=16,maxSamples=256,historyWindows=4}={}){
 for(const [n,max]of [[windowCalls,1000000],[sampleEvery,1000000],[maxSamples,256],[historyWindows,64]])if(!Number.isSafeInteger(n)||n<1||n>max)throw Error('usage window budget');
 let calls=0,total=0,events=[],overflow=false,history=[],previous=null,busy=false;
 return {
  observe(event,failed=false){
   if(busy)throw Error('usage window flush pending');
   calls++;total++;
   if(total%sampleEvery===0){if(events.length>=maxSamples||!event)overflow=true;else events.push({...event,failed});}
   if(calls<windowCalls)return null;
   busy=true;return selectionRequest({operation:'usage-summary',events,overflow,previous}).then(result=>{
   const window={...result,calls,total_calls:total,sample_every:sampleEvery};previous=result.summary;
   history.push(window);if(history.length>historyWindows)history.shift();calls=0;events=[];overflow=false;
   return structuredClone(window);
   }).finally(()=>{busy=false;});
  },
  snapshot(){return {total_calls:total,partial_calls:calls,windows:structuredClone(history)};}
 };
}
