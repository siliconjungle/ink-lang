import {provenance} from './provenance.mjs';
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import {fileURLToPath,pathToFileURL}from'node:url';import{createHash}from'node:crypto';import {diff}from'@shapeshift-labs/frontier/diff';import {applyPatch,applyPatchImmutable}from'@shapeshift-labs/frontier/apply';import {assertJsonValue}from'@shapeshift-labs/frontier/validate';import {OP_SET}from'@shapeshift-labs/frontier/constants';import {encodePatch,decodePatch}from'@shapeshift-labs/frontier-codec';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),OUT=path.join(ROOT,'reports/frontier-json-2026-10-13');fs.mkdirSync(OUT,{recursive:true});const processIndex=Number(process.argv[2]??0),smoke=process.argv.includes('--smoke'),rounds=smoke?1:9,rows=[],validation=[],sizes=[];
const provenanceAtStart=provenance(ROOT);
const flag=name=>process.argv.find(a=>a.startsWith('--'+name+'='))?.split('=')[1],fieldFilter=flag('fields'),operationFilter=flag('operation'),laneFilter=flag('lane'),targetMs=Number(flag('target-ms')??10);
const modulePath=flag('ink-module')??'build/frontier-json/ink.mjs';const ink=await import(pathToFileURL(path.resolve(ROOT,modulePath)).href);
const reportPath=path.join(OUT,`json-${fieldFilter||operationFilter||laneFilter?'targeted-': ''}${smoke?'smoke-'+processIndex:processIndex}.json`);
if(fs.existsSync(reportPath))throw Error('report exists; choose a fresh process ID');
provenanceAtStart.hashes[modulePath]=createHash('sha256').update(fs.readFileSync(path.resolve(ROOT,modulePath))).digest('hex');
if(!Number.isFinite(targetMs)||targetMs<=0||targetMs>1000)throw Error('invalid timing target');
let sink=0,rng=(12345+processIndex*555)>>>0;const encoder=new TextEncoder();function shuffled(a){a=a.slice();for(let i=a.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=rng%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function measure(run,count){let hash=0;const at=process.hrtime.bigint();for(let i=0;i<count;i++)hash=(hash+run(i))>>>0;const ns=process.hrtime.bigint()-at;sink^=hash;return Number(ns);}
const json=new ink.JsonCodec(ink.valueCodecs.identity.result),args=ink.valueCodecs.set_document.arguments;
for(const n of (smoke?[4]:[4,64,512]).filter(n=>fieldFilter===undefined||n===Number(fieldFilter))){
 const doc=Object.fromEntries(Array.from({length:n},(_,i)=>['k'+String(i).padStart(5,'0'),i]));doc.unknown={nested:['雪',true,null,3],enabled:false};
 const text=JSON.stringify(doc),key='k00000',next=777,target={...doc,[key]:next},value=ink.parseJson(String(next)),compiled=json.parse(text),wire=json.parseBinary(text),valueWire=json.parseBinary(String(next)),patch=[[OP_SET,[key],next]],patchWire=encodePatch(patch);
 const message=await ink.createValueCodec({kind:'record',name:'Update',fields:[{name:'key',type:{kind:'string'}},{name:'value',type:json.values.descriptor.root}]},json.values.descriptor.named),typedMessage={key,value},messageWire=message.encode(typedMessage);
 const compactMessage=message.compact(),compactMessageWire=compactMessage.encode(typedMessage),compactDocument=json.values.compact().encode(compiled);
 sizes.push({fields:n,json_bytes:Buffer.byteLength(text),ink_document_bytes:wire.length,ink_compact_document_bytes:compactDocument.length,frontier_patch_bytes:patchWire.length,ink_update_bytes:messageWire.length,ink_compact_update_bytes:compactMessageWire.length});
 const request=()=>args.encodeWith(w=>w.frame(w=>{w.bytes(wire.subarray(40));w.frame(w=>w.bytes(encoder.encode(key)));w.bytes(valueWire.subarray(40));}));
 const requestWire=request();const reply=ink.callBinary('set_document',requestWire);assert.equal(reply[44],0);const resultWire=new Uint8Array(40+reply.length-45);resultWire.set(wire.subarray(0,40));resultWire.set(reply.subarray(45),40);
 assert.deepEqual(JSON.parse(json.stringifyBinary(resultWire)),target);assert.deepEqual(JSON.parse(json.stringify(ink.call('set_document',[compiled,key,value]).Ok)),target);assert.deepEqual(applyPatchImmutable(doc,patch,{cloneValues:true}),target);assert.deepEqual(doc[key],0);assert.deepEqual(decodePatch(patchWire),patch);assert.deepEqual(message.decode(messageWire),typedMessage);assert.deepEqual(compactMessage.decode(compactMessageWire),typedMessage);assert.deepEqual(json.values.compact().decode(compactDocument),compiled);
 // Both plain Ink and Frontier's single-set path share unchanged subtrees.
 // Fully detached mutable outputs are a separate, matched ownership boundary.
 const ownedEdit=()=>ink.callOwned('set_document',[compiled,key,value]).Ok;
 const checkedOwnedEdit=()=>json.values.capture(ink.call('set_document',[compiled,key,value]).Ok);
 const ownedFrontier=()=>structuredClone(applyPatchImmutable(doc,patch,{cloneValues:true}));
 const detached=ownedEdit();assert.deepEqual(JSON.parse(json.stringify(detached)),target);
 detached.payload.Err.Err.Err.Err.Err.item0[0].value.payload.Err.Err.Ok.item0='999';
 assert.equal(JSON.parse(json.stringify(value)),777);assert.equal(JSON.parse(json.stringify(compiled))[key],0);
 const identities=v=>{const objects=new Set(),visit=x=>{if(x&&typeof x==='object'&&!objects.has(x)){objects.add(x);for(const y of Object.values(x))visit(y);}};visit(v);return objects;};
 const disjoint=(result,...sources)=>{const objects=identities(result);for(const source of sources)for(const object of identities(source))assert.equal(objects.has(object),false,'owned output aliases caller input');};
 disjoint(ownedEdit(),compiled,value);disjoint(ownedFrontier(),doc,patch);
 assert.equal(applyPatchImmutable(doc,patch,{cloneValues:true}).unknown,doc.unknown);
 const groups={
  'known-edit-immutable':{
    'ink-js-compiled-json-set':()=>ink.call('set_document',[compiled,key,value]).Ok.payload?next:0,
    'frontier-immutable-known-patch':()=>applyPatchImmutable(doc,patch,{cloneValues:true})[key],
  },
  'known-edit-detached':{
    'ink-js-owned-json-set':()=>ownedEdit().payload?next:0,
    'ink-js-checked-owned-json-set':()=>checkedOwnedEdit().payload?next:0,
    'ink-js-structured-clone-json-set':()=>structuredClone(ink.call('set_document',[compiled,key,value]).Ok).payload?next:0,
    'frontier-owned-known-patch':()=>ownedFrontier()[key],
  },
  'snapshot-difference-and-immutable-apply':{
    'frontier-full-diff-and-apply':()=>{const target={...doc,[key]:next};return applyPatchImmutable(doc,diff(doc,target),{cloneValues:true})[key];},
    'frontier-dirty-diff-and-apply':()=>{const target={...doc,[key]:next};return applyPatchImmutable(doc,diff(doc,target,{dirtyPaths:[[key]]}),{cloneValues:true})[key];},
  },
  'json-text-input-edit-text-output':{
    'ink-json-text-pipeline':()=>json.stringify(ink.call('set_document',[json.parse(text),key,value]).Ok).length,
    'ink-binary-pipeline':()=>{const docWire=json.parseBinary(text),request=args.encodeWith(w=>w.frame(w=>{w.bytes(docWire.subarray(40));w.frame(w=>w.bytes(encoder.encode(key)));w.bytes(valueWire.subarray(40));})),reply=ink.callBinary('set_document',request);if(reply[44])throw Error('compiled JSON edit failed');const result=new Uint8Array(40+reply.length-45);result.set(docWire.subarray(0,40));result.set(reply.subarray(45),40);return json.stringifyBinary(result).length;},
    'frontier-json-text-known-edit':()=>JSON.stringify(applyPatch(JSON.parse(text),patch,{cloneValues:true})).length,
  },
  'external-document-validate':{
    'ink-binary-json-validate':()=>{json.validateBinary(wire);return n;},
    'frontier-json-text-parse-validate':()=>{assertJsonValue(JSON.parse(text));return n;},
  },
  'edit-message-encode':{
    'ink-typed-wire-encode':()=>message.encode(typedMessage).length,
    'ink-agreed-schema-encode':()=>compactMessage.encode(typedMessage).length,
    'frontier-patch-encode':()=>encodePatch(patch).length,
  },
  'edit-message-decode':{
    'ink-typed-wire-decode':()=>message.decode(messageWire).key.length,
    'ink-agreed-schema-decode':()=>compactMessage.decode(compactMessageWire).key.length,
    'frontier-patch-decode':()=>decodePatch(patchWire)[0][1][0].length,
  },
 };
 for(const [operation,allCandidates]of Object.entries(groups)){
  if(operationFilter&&operation!==operationFilter)continue;const candidates=Object.fromEntries(Object.entries(allCandidates).filter(([lane])=>!laneFilter||lane===laneFilter));if(!Object.keys(candidates).length)continue;
  const counts={};for(const [lane,run]of Object.entries(candidates)){measure(run,3);const pilot=measure(run,10);counts[lane]=smoke?3:Math.max(10,Math.min(100000,Math.ceil(targetMs*1000000/(pilot/10))));}
  for(let round=0;round<rounds;round++)for(const lane of shuffled(Object.keys(candidates))){global.gc?.();const count=counts[lane],elapsed_ns=measure(candidates[lane],count);rows.push({operation,fields:n,lane,process:processIndex,round,calls:count,elapsed_ns:String(elapsed_ns)});}
 }
 validation.push({fields:n,source_unchanged:true,known_edit_value:true,owned_edit_detached:true,binary_pipeline_value:true,edit_message_roundtrip:true});console.error(`${processIndex}: JSON fields=${n} validated and measured`);
}
if(!rows.length)throw Error('no benchmark lanes matched');
fs.writeFileSync(reportPath,JSON.stringify({schema:1,provenance:provenanceAtStart,instrumented:process.execArgv.some(a=>a.startsWith("--cpu-prof")||a.startsWith("--prof")||a.startsWith("--trace")),node:process.version,process:processIndex,rounds,measurements:rows,sizes,validation,sink,capability_gap:'Ink does not currently expose a general arbitrary JSON snapshot diff or the Frontier patch opcode vocabulary. Diff-discovery controls are Frontier-only; compiled Ink receives known source edits.',scope:'Shared safe-integer/Unicode JSON domain; JSON member order and exact number token spelling are additional Ink observations not measured here; binary formats carry distinct schema/protocol overhead. Agreed-schema transport requires exact format/schema negotiation outside the message; portable wire and checkpoints remain separate.'},null,2)+'\n',{flag:'wx'});
