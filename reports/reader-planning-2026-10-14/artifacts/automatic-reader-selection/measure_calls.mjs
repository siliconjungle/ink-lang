// Installed offline ABI adapter. Timing never grants rewrite authority.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const {artifacts,phases,measurement={}}=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const rounds=measurement.rounds??11,minBatch=measurement.minimum_batch_ms??5,maxCalls=measurement.maximum_calls_per_sample??1024;
if(!Number.isInteger(rounds)||rounds<9||rounds>64||!Number.isInteger(minBatch)||minBatch<1||minBatch>50||!Number.isInteger(maxCalls)||maxCalls<1||maxCalls>65536)throw Error('bounded measurement controls required');
const rows=[],rejected=[],lanes=[];
let sink=0,seed=0x7193abef;
const bits=new DataView(new ArrayBuffer(8));
function consume(v){
 if(v===null||v===undefined)return 0;
 if(typeof v==='number'){bits.setFloat64(0,v,true);return bits.getUint32(0,true)^bits.getUint32(4,true);}
 if(typeof v==='boolean')return Number(v);
 if(typeof v==='string'){let h=0;for(let i=0;i<v.length;i++)h=Math.imul(h,31)^v.charCodeAt(i);return h;}
 if(v instanceof Uint8Array){let h=0;for(let i=0;i<v.length;i++)h=Math.imul(h,31)^v[i];return h;}
 let h=0;for(const x of Object.values(v))h=Math.imul(h,31)^consume(x);return h;
}
function shuffle(v){for(let i=v.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[v[i],v[j]]=[v[j],v[i]];}return v;}
function jsonCompatible(t,named,active=new Set()){
 if(!t||typeof t!=='object')return false;
 if(['u32','i32','f32','bool','string'].includes(t.kind))return true;
 if(['list','vector'].includes(t.kind))return jsonCompatible(t.element,named,active);
 // Exact word/Int adapters need an explicit decimal transfer boundary. Refuse
 // them here rather than rounding values through JSON numbers.
 if(t.kind==='record')return t.fields.every(x=>jsonCompatible(x.type,named,active));
 return false;
}
function normalizedInput(value,type){
 if(type.kind==='f32'){
  const words=new Uint32Array(1),floats=new Float32Array(words.buffer);
  if(value&&typeof value==='object'&&Object.hasOwn(value,'F32Bits'))words[0]=value.F32Bits;else floats[0]=value;
  return {f32_bits:words[0]};
 }
 if(['list','vector'].includes(type.kind))return value.map(v=>normalizedInput(v,type.element));
 if(type.kind==='record')return type.fields.map(f=>[f.name,normalizedInput(value[f.name],f.type)]);
 return value;
}
function prepareCall(mod,c,f){
 const boundary=c.boundary??'trusted';
 if(boundary==='trusted'){
  if(!f.params.every(p=>jsonCompatible(p.type,mod.metadata.named_types))||!jsonCompatible(f.result,mod.metadata.named_types))throw Error('unsupported JSON transfer descriptor');
  return {invoke:()=>mod.call(c.function,c.args),expected:c.expected};
 }
 if(!['portable','compact'].includes(boundary))throw Error('unsupported call boundary');
 const codecs=mod.valueCodecs?.[c.function];if(!codecs)throw Error('missing typed wire interface');
 const short=boundary==='compact',input=short?codecs.arguments.compact():codecs.arguments,output=short?codecs.result.compact():codecs.result;
 const bytes=input.encode(Object.fromEntries(f.params.map((p,i)=>[p.name,c.args[i]]))),original=bytes.slice(),expected=output.encode(c.expected);
 const invoke=()=>mod[short?'callCompact':'callBinary'](c.function,bytes);
 return {invoke,expected,validate(){assert.deepStrictEqual(bytes,original,'candidate mutated encoded input');assert.deepStrictEqual(invoke(),expected,'candidate changed complete encoded output');}};
}
const input_fingerprints=new Set();
for(const a of artifacts){
 try{
  const started=performance.now(),mod=await import(pathToFileURL(a.path));
  if(!mod.metadata||typeof mod.call!=='function')throw Error('artifact has no pure-call entries (a state representation module); the pure-call adapter measures pure entries only');
  const module_load_ms=String(performance.now()-started),validation_started=performance.now();
  if(mod.metadata.state!==null&&Object.values(phases).flat().some(c=>!c.boundary))throw Error('pure-call adapter does not measure state lifecycles');
  const captured=structuredClone(phases),calls=Object.values(captured).flat(),prepared=new Map();
  for(const c of calls){
   const f=mod.metadata.functions.find(f=>!f.internal&&f.name===c.function);
   if(!f)throw Error('missing source function');
   const before=structuredClone(c.args);
   const call=prepareCall(mod,c,f);prepared.set(c,call);assert.deepStrictEqual(call.invoke(),call.expected);call.validate?.();
   assert.deepStrictEqual(c.args,before,'candidate mutated captured input');
   if(a.measurement===artifacts[0].measurement){
    const input=JSON.stringify([c.function,c.args.map((v,i)=>normalizedInput(v,f.params[i].type)),c.boundary??'trusted']);
    input_fingerprints.add(createHash('sha256').update(input).digest('hex'));
   }
  }
  lanes.push({...a,mod,phases:captured,prepared,original:structuredClone(captured),module_load_ms,validation_ms:String(performance.now()-validation_started)});
 }catch(e){rejected.push({measurement:a.measurement,reason:String(e)});}
}
if(!lanes.some(l=>l.measurement===artifacts[0].measurement))throw Error('baseline failed independent validation');
for(const [phase,calls] of Object.entries(phases)){
 const invoke=l=>{for(const c of l.phases[phase])sink^=consume(l.prepared.get(c).invoke());};
 const counts=new Map(),samples=new Map();
 for(const l of shuffle([...lanes])){
  for(let i=0;i<8;i++)invoke(l);
  let n=1,elapsed;do{const start=performance.now();for(let i=0;i<n;i++)invoke(l);elapsed=performance.now()-start;if(elapsed>=minBatch||n>=maxCalls)break;n=Math.min(n*2,maxCalls);}while(true);
  counts.set(l.measurement,n);samples.set(l.measurement,[]);
 }
 for(let round=0;round<rounds;round++)for(const l of shuffle([...lanes])){
  const n=counts.get(l.measurement),start=performance.now();for(let i=0;i<n;i++)invoke(l);
  samples.get(l.measurement).push(String(Math.max(0,Math.round((performance.now()-start)*1e6/n/calls.length))));
 }
 for(const l of lanes)rows.push({measurement:l.measurement,phase,complete_call_ns:samples.get(l.measurement),calls_per_sample:counts.get(l.measurement),phase_calls:calls.length});
}
const valid=new Set();
for(const l of lanes){try{
 assert.deepStrictEqual(l.phases,l.original,'candidate mutated input during measurement');
 for(const c of Object.values(l.phases).flat()){const call=l.prepared.get(c);assert.deepStrictEqual(call.invoke(),call.expected);call.validate?.();}
 valid.add(l.measurement);
}catch(e){rejected.push({measurement:l.measurement,reason:String(e)});}}
if(!valid.has(artifacts[0].measurement))throw Error('baseline failed post-measurement validation');
console.log(JSON.stringify({schema:1,node:process.version,input_fingerprints:[...input_fingerprints].sort(),rows:rows.filter(r=>valid.has(r.measurement)),rejected,module_load:lanes.map(l=>({measurement:l.measurement,module_load_ms:l.module_load_ms,validation_ms:l.validation_ms})),sink}));
