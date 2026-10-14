import {selectionRequest} from './ink-selection.mjs';
import {createAdaptiveRecorder} from './adaptive-profile.mjs';
import {captureUsage,createUsageWindow} from './usage-window.mjs';
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
const read=async url=>url.protocol==='file:'?new Uint8Array(await(await import('node:fs/promises')).readFile(url)):new Uint8Array(await(await fetch(url)).arrayBuffer());

/** Load an offline checked bundle. Imported modules and the deployment are trusted,
 * just like ordinary compiled programs. Hashes bind artifacts, not proof authority.
 * Keep files immutable between verification and import (CSP-friendly module URLs).
 */
export async function loadAdaptiveState(url,options={}){
 url=new URL(url,import.meta.url);const bytes=await read(url);if(bytes.length>4000000)throw Error('adaptive bundle budget');
 const bundle=JSON.parse(new TextDecoder().decode(bytes));
 if(bundle.schema!==1||bundle.kind!=='ink-adaptive-state-v1'||!Array.isArray(bundle.artifacts)||bundle.artifacts.length>16)throw Error('adaptive bundle schema');
 if(options.targetKey!==bundle.binding.target)throw Error('adaptive target provenance mismatch');
 const variants=Object.create(null);
 for(const a of bundle.artifacts){
  if(!/^[a-zA-Z0-9_-]+\.mjs$/.test(a.file)||Object.hasOwn(variants,a.id))throw Error('adaptive artifact path/identity');
  const path=new URL(a.file,url);if(await digest(await read(path))!==bundle.binding.variants[a.id])throw Error('adaptive artifact identity');
  const mod=await import(path.href);if(typeof mod.createState!=='function')throw Error('adaptive state factory missing');
  variants[a.id]={create:()=>mod.createState(),restore:async bytes=>{const state=mod.createState();try{await state.restore(bytes);return state;}catch(e){await state.dispose?.();throw e;}}};
 }
 return createAdaptiveState({...options,binding:bundle.binding,profile:bundle.profile,variants,baseline:bundle.baseline,policy:{...bundle.policy,...options.policy}});
}

/** Trusted compiled adapter boundary: create/restore -> state with bind/checkpoint.
 * Calls are captured synchronously and serialized; transitions never repeat a call.
 * No state references escape this facade. State callbacks must not call this facade.
 */
export async function createAdaptiveState({binding,profile,variants,baseline,policy,recording={},usage=null,maxPending=64,maxSnapshotBytes=64*1024*1024,maxCaptureBytes=8*1024*1024,onDiagnostic=()=>{},clock=()=>performance.now(),enabled=true}){
 binding=structuredClone(binding);profile=structuredClone(profile);policy=structuredClone(policy);variants={...variants};
 if(Object.keys(variants).sort().join('\0')!==Object.keys(binding.variants).sort().join('\0')||!Object.hasOwn(variants,baseline))throw Error('adaptive factory binding');
 for(const n of [maxPending,maxSnapshotBytes,maxCaptureBytes])if(!Number.isSafeInteger(n)||n<1||n>Number.MAX_SAFE_INTEGER)throw Error('adaptive host limit');
 let current=baseline,state={pending:'',confirmations:0,last_switch_call:0,switches:0};
 const request=window=>({operation:'adaptive-state',request:{binding,profile,policy,state,window,current}});
 // Load/validate the common Rust/Wasm engine before accepting the first call.
 if(recording===false&&enabled)throw Error('adaptive execution requires recording');
 if(enabled||recording!==false)await selectionRequest(request({counts:{'validate@0':1},calls:1,total_calls:1,state_elements:0,saturated:false}));
 let live=await variants[current].create(),tail=Promise.resolve(),pending=0,capturedBytes=0,closed=false,disabled=!enabled;
 let bindings=new Map();
 const recorder=recording===false?null:createAdaptiveRecorder({...recording,clock});
 let usageRecorder=usage===null?null:createUsageWindow(usage);
 const emit=event=>{try{onDiagnostic(structuredClone(event));}catch{}};
 const time=()=>{try{const n=clock();return Number.isFinite(n)?n:null;}catch{return null;}};
 async function dispose(value){try{await value?.dispose?.();}catch(e){emit({kind:'dispose-failed',error:String(e)});}}
 async function consider(window){
  if(disabled||!window)return;
  if(window.saturated){state.pending='';state.confirmations=0;return;}
  const start=time();let next=null;
  try{
   const decision=await selectionRequest(request(window));state=decision.state;emit({kind:'decision',...decision});
   if(decision.selected===current)return;
   const checkpoint=await live.checkpoint();
   if(!(checkpoint instanceof Uint8Array)||checkpoint.byteLength>maxSnapshotBytes)throw Error('adaptive snapshot budget');
   next=await variants[decision.selected].restore(checkpoint.slice());
   // One check at migration, not per-call logical materialisation. Also protects
   // replies/events/version/acknowledgements carried by the portable snapshot.
   const restored=await next.checkpoint();
   if(!(restored instanceof Uint8Array)||restored.length!==checkpoint.length||restored.some((v,i)=>v!==checkpoint[i]))throw Error('adaptive restore changed snapshot');
   const end=time(),elapsed=start!==null&&end!==null&&end>=start?(end-start)*1e6:null;
   if(elapsed===null||elapsed>policy.max_pause_ns)throw Error('adaptive observed pause budget');
   const old=live,previous=current;live=next;bindings=new Map();next=null;current=decision.selected;
   state={pending:'',confirmations:0,last_switch_call:window.total_calls,switches:state.switches+1};
   await dispose(old);emit({kind:'switched',from:previous,to:current,total_calls:window.total_calls,elapsed_ns:elapsed});
  }catch(error){await dispose(next);disabled=true;state.pending='';state.confirmations=0;emit({kind:'adaptation-disabled',current,error:String(error)});}
 }
 function enqueue(operation,bytes=0){
  if(closed)throw Error('adaptive host closed');
  if(pending>=maxPending||capturedBytes+bytes>maxCaptureBytes)throw Error('INK_BACKPRESSURE');
  pending++;capturedBytes+=bytes;
  const work=tail.then(operation).finally(()=>{pending--;capturedBytes-=bytes;});tail=work.catch(()=>{});return work;
 }
 // Bounded structural capture accounting, not a process-heap measurement. Native
 // handles and cyclic/shared graphs are outside this facade's owned-value boundary.
 function capture(args){
  let bytes=0,nodes=0;const seen=new Set();
  function count(v,depth){
   if(++nodes>100000||depth>64)throw Error('adaptive capture budget');
   if(v===null||v===undefined){bytes+=8;}
   else if(typeof v==='bigint'||typeof v==='string'){bytes+=16+String(v).length*2;}
   else if(typeof v==='number'||typeof v==='boolean'){bytes+=8;}
   else if(ArrayBuffer.isView(v)){bytes+=32+v.byteLength;}
   else if(v instanceof ArrayBuffer){bytes+=32+v.byteLength;}
   else if(typeof v==='object'){
    if(seen.has(v))throw Error('adaptive owned capture requires a tree');seen.add(v);bytes+=32;
    if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw Error('adaptive unsupported capture');
    for(const [k,d]of Object.entries(Object.getOwnPropertyDescriptors(v))){if(!Object.hasOwn(d,'value'))throw Error('adaptive capture accessor');bytes+=k.length*2;count(d.value,depth+1);}
   }else throw Error('adaptive unsupported capture');
   if(bytes>maxCaptureBytes-capturedBytes)throw Error('INK_BACKPRESSURE');
  }
  count(args,0);return {value:structuredClone(args),bytes};
 }
 return {
  call(name,args=[],features={}){
   if(!/^[A-Za-z0-9_]{1,128}$/.test(name))throw Error('adaptive action name');
   if(closed||pending>=maxPending)throw Error('INK_BACKPRESSURE');
   const owned=capture(args),meta={shape:features.shape,state_elements:features.state_elements,usage:usageRecorder?captureUsage(features.usage):null};
   return enqueue(async()=>{
    const stamp=recorder?.start();let result,error,failed=false;
    try{if(!bindings.has(name)){if(bindings.size>=64)bindings.delete(bindings.keys().next().value);bindings.set(name,live.bind(name));}result=await bindings.get(name)(...owned.value);}catch(e){failed=true;error=e;}
    let window=null;try{window=recorder?.finish('action:'+name,meta.shape??'unknown',stamp,{failed,state_elements:meta.state_elements??0});}catch{}
    if(usageRecorder){try{const flush=usageRecorder.observe(meta.usage,failed);const stats=flush?await flush:null;if(stats)emit({kind:'usage-window',...stats});}catch(error){usageRecorder=null;emit({kind:'usage-failed',error:String(error)});}}
    await consider(window);
    if(failed)throw error;return result;
   },owned.bytes);
  },
  checkpoint(){return enqueue(async()=>{const bytes=await live.checkpoint();if(!(bytes instanceof Uint8Array)||bytes.length>maxSnapshotBytes)throw Error('adaptive snapshot budget');return bytes.slice();});},
  restore(bytes){
   if(!(bytes instanceof Uint8Array)||bytes.length>maxSnapshotBytes)throw Error('adaptive snapshot budget');const owned=bytes.slice();
   return enqueue(async()=>{const next=await variants[current].restore(owned);const old=live;live=next;bindings=new Map();await dispose(old);disabled=true;emit({kind:'adaptation-disabled',reason:'external restore invalidates recent usage'});},owned.length);
  },
  // Acknowledgement must be serialized with calls/migrations too.
  acknowledge(commit,position){return enqueue(()=>{const ack=live.acknowledge??live.acknowledgeThrough??live.acknowledge_through;if(!ack)throw Error('state acknowledgement unavailable');return ack.call(live,commit,position);});},
  status(){return {current,disabled,pending,captured_bytes:capturedBytes,state:{...state},usage:recorder?.snapshot()??null,access:usageRecorder?.snapshot()??null};},
  async close(){if(closed)return tail;closed=true;await tail;await dispose(live);}
 };
}
