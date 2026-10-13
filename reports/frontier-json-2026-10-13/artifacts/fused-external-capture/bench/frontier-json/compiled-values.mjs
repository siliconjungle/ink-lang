// Matched ownership boundaries with captured private inputs. Capture, import and
// retained memory are reported separately; no JSON-rendering work is timed.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath}from'node:url';import {createHash}from'node:crypto';
import {applyPatchImmutable}from'@shapeshift-labs/frontier/apply';import {OP_SET}from'@shapeshift-labs/frontier/constants';
import {provenance}from'./provenance.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const id=Number(process.argv[2]),modulePath=process.argv[3],out=path.join(root,'reports/frontier-json-2026-10-13',`compiled-values-${id}.json`);
if(!Number.isSafeInteger(id)||!modulePath||fs.existsSync(out))throw Error('fresh process ID and module path required');
const filename=path.resolve(root,modulePath),hash=()=>createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const before=provenance(root),moduleHash=hash(),runnerFile=fileURLToPath(import.meta.url),runnerHash=createHash('sha256').update(fs.readFileSync(runnerFile)).digest('hex'),started=process.hrtime.bigint();
const ink=await import(pathToFileURL(filename).href),importNs=String(process.hrtime.bigint()-started);
const document={...Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),i])),unknown:{nested:['雪',true,null,3],enabled:false}};
const text=JSON.stringify(document),key='k00000',target={...document,[key]:777},json=new ink.JsonCodec(ink.valueCodecs.identity.result);
const logical=json.parse(text),value=json.parse('777');
const timed=fn=>{const at=process.hrtime.bigint(),value=fn();return{value,ns:String(process.hrtime.bigint()-at)};};
const factory=timed(()=>{const binding=ink.compiledValues.set_document;binding.params;binding.result;return binding;}),entry=factory.value;
const captured=timed(()=>[entry.params[0].capture(logical),entry.params[1].capture(key),entry.params[2].capture(value)]);
const nativeCaptured=timed(()=>structuredClone(document)),patch=[[OP_SET,[key],777]];
const identityCodec=ink.compiledValues.identity.params[0],compact=json.parseCompact(text);
const direct=timed(()=>identityCodec.decodeCompact(compact));assert.equal(json.stringify(identityCodec.materialize(direct.value)),text);
const edit=()=>ink.callCompiled('set_document',captured.value);
const detach=()=>entry.result.materialize(edit()).Ok;
const nativeDetach=()=>structuredClone(applyPatchImmutable(nativeCaptured.value,patch,{cloneValues:true}));
assert.deepEqual(JSON.parse(json.stringify(detach())),target);assert.deepEqual(nativeDetach(),target);
const objects=v=>{const found=new Set(),visit=x=>{if(x&&typeof x==='object'&&!found.has(x)){found.add(x);Object.values(x).forEach(visit);}};visit(v);return found;};
const original=objects(logical);for(const node of objects(detach()))assert.equal(original.has(node),false);
const mutation=detach();mutation.payload.Err.Err.Err.Err.Err.item0[0].value.payload.Err.Err.Ok.item0='999';assert.deepEqual(JSON.parse(json.stringify(detach())),target);assert.equal(JSON.parse(json.stringify(logical))[key],0);
const result=edit(),portable=entry.result.encode(result),wireExpected=ink.valueCodecs.set_document.result.encode(ink.callOwned('set_document',[logical,key,value]));assert.deepEqual(portable,wireExpected);
const short=entry.result.encodeCompact(result);assert.deepEqual(short,ink.valueCodecs.set_document.result.compact().encode(ink.callOwned('set_document',[logical,key,value])));
let sink=0,rng=(id+8192)>>>0;const raw=[];
const lanes={
 'ink-capture-all-inputs':()=>{const h=[entry.params[0].capture(logical),entry.params[1].capture(key),entry.params[2].capture(value)];return h.length;},
 'frontier-clone-input':()=>Object.keys(structuredClone(document)).length,
 'ink-capture-edit-owned':()=>entry.result.materialize(ink.callCompiled('set_document',[entry.params[0].capture(logical),entry.params[1].capture(key),entry.params[2].capture(value)])).Ok.payload.Err.Err.Err.Err.Err.item0.length,
 'frontier-clone-edit-owned':()=>Object.keys(structuredClone(applyPatchImmutable(structuredClone(document),patch,{cloneValues:true}))).length,
 'ink-captured-edit-owned':()=>detach().payload.Err.Err.Err.Err.Err.item0.length,
 'ink-logical-edit-owned':()=>ink.callOwned('set_document',[logical,key,value]).Ok.payload.Err.Err.Err.Err.Err.item0.length,
 'frontier-captured-edit-owned':()=>Object.keys(nativeDetach()).length,
 'ink-captured-edit-private':()=>{const h=edit();return Object.isFrozen(h)?513:0;},
 'ink-captured-edit-compact-output':()=>entry.result.encodeCompact(edit()).length,
};
const measure=(fn,n)=>{let checksum=0;const at=process.hrtime.bigint();for(let i=0;i<n;i++)checksum=(checksum+fn())>>>0;sink^=checksum;return{ns:Number(process.hrtime.bigint()-at),checksum};};
const counts={};for(const [name,run]of Object.entries(lanes)){for(let i=0;i<200;i++)run();const pilot=measure(run,20);counts[name]=Math.max(1,Math.min(100000,Math.ceil(50000000/(pilot.ns/20))));}
const shuffle=values=>{const a=values.slice();for(let i=a.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=rng%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
for(let round=0;round<9;round++)for(const name of shuffle(Object.keys(lanes))){const calls=counts[name],m=measure(lanes[name],calls);raw.push({lane:name,round,calls,elapsed_ns:String(m.ns),checksum:m.checksum});}
assert.equal(createHash('sha256').update(fs.readFileSync(runnerFile)).digest('hex'),runnerHash);assert.equal(hash(),moduleHash);assert.deepEqual(provenance(root).hashes,before.hashes);
fs.writeFileSync(out,JSON.stringify({schema:1,process:id,module:modulePath,module_sha256:moduleHash,provenance:before,node:process.version,import_ns:importNs,compiled_codec_factory_ns:factory.ns,benchmark_sha256:runnerHash,capture_ns:captured.ns,frontier_capture_ns:nativeCaptured.ns,direct_compact_decode_ns:direct.ns,measurements:raw,sink,validation:{complete_outputs:true,source_unchanged:true,owned_outputs:true,exact_portable_and_compact_bytes:true},scope:'Prepared independently captured inputs, capture excluded from hot calls and reported separately. Both owned lanes return detached mutable complete outputs. Private-only and encoded-output lanes are different boundaries and have no matched Frontier claim. Warm capture lanes measure ingress separately. Ink validates and owns all three typed arguments; Frontier clone lane only clones the native document and does not provide matching validation. Shared host; three fresh processes required.'},null,2)+'\n',{flag:'wx'});
console.log(out);
