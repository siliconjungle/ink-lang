import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {provenance} from './provenance.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),id=Number(process.argv[2]),files=process.argv.slice(3);
if(!Number.isSafeInteger(id)||files.length!==2)throw Error('process ID and control/candidate modules required');
const output=path.join(root,`reports/frontier-json-2026-10-13/fused-wire-reader-${id}.json`);
if(fs.existsSync(output))throw Error('report exists');
const options={native:false,artifacts:['bench/frontier-json/fused-wire-reader.mjs','bench/frontier-json/provenance.mjs','bench/frontier-json/state.ink',...files],repositories:['.','abi','lowerings/js','knowledge']};
const before=provenance(root,options),modules=[];
for(const [index,file]of files.entries()){
 const ink=await import(pathToFileURL(path.join(root,file)).href),entry=ink.compiledValues.set_document;
 modules.push({label:index?'fused':'control',ink,entry,codec:entry.params[0],json:new ink.JsonCodec(ink.valueCodecs.identity.result)});
}
let checksum=0,rng=id>>>0;const rows=[],validation=[];
const shuffle=keys=>{const a=keys.slice();for(let i=a.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=rng%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const measure=(run,count)=>{const at=process.hrtime.bigint();let sum=0;for(let i=0;i<count;i++)sum^=run();checksum^=sum;return Number(process.hrtime.bigint()-at);};
for(const fields of [4,64,512]){
 const document=Object.fromEntries(Array.from({length:fields},(_,i)=>['k'+i,i]));document.extra={children:['雪',true,null,3]};
 const text=JSON.stringify(document),lanes={};let portable,compact,replyPortable,replyCompact;
 for(const {label,ink,entry,codec,json}of modules){
  const handle=json.parseCompiled(codec,text),key=entry.params[1].capture('k0'),value=codec.capture(json.parse('777'));
  const bytes=codec.encode(handle),short=codec.encodeCompact(handle);portable??=bytes;compact??=short;
  assert.deepEqual(bytes,portable);assert.deepEqual(short,compact);
  assert.equal(json.stringifyCompiled(codec,codec.decode(bytes)),text);assert.equal(json.stringifyCompiled(codec,codec.decodeCompact(short)),text);
  const update=h=>ink.callCompiled('set_document',[h,key,value]);
  const reply=update(handle),replyBytes=entry.result.encode(reply),replyShort=entry.result.encodeCompact(reply);replyPortable??=replyBytes;replyCompact??=replyShort;
  assert.deepEqual(replyBytes,replyPortable);assert.deepEqual(replyShort,replyCompact);
  assert.deepEqual(JSON.parse(json.stringifyCompiled(entry.result,reply,{unwrapResult:true})),{k0:777,...Object.fromEntries(Object.entries(document).filter(([key])=>key!=='k0'))});
  lanes[label+'/portable-decode']=()=>Object.isFrozen(codec.decode(bytes))?1:0;
  lanes[label+'/compact-decode']=()=>Object.isFrozen(codec.decodeCompact(short))?1:0;
  lanes[label+'/portable-edit-portable']=()=>entry.result.encode(update(codec.decode(bytes))).length;
  lanes[label+'/compact-edit-compact']=()=>entry.result.encodeCompact(update(codec.decodeCompact(short))).length;
 }
 const counts={};for(const [name,run]of Object.entries(lanes)){for(let i=0;i<100;i++)run();const ns=measure(run,20);counts[name]=Math.max(10,Math.min(100000,Math.ceil(10000000/(ns/20))));}
 for(let round=0;round<9;round++)for(const name of shuffle(Object.keys(lanes))){const calls=counts[name],ns=measure(lanes[name],calls);rows.push({fields,lane:name,round,calls,elapsed_ns:String(ns)});}
 validation.push({fields,exact_documents:true,complete_edit_outputs:true,exact_portable_and_compact_input_and_reply_bytes:true});console.error(`${id}: fields=${fields}`);
}
assert.deepEqual(provenance(root,options).hashes,before.hashes);
fs.writeFileSync(output,JSON.stringify({schema:1,process:id,node:process.version,provenance:before,measurements:rows,validation,checksum,scope:'Paired same-source/layout opaque-value decoders and complete binary edit lifecycles. No JSON format-invariant validation skip. The control prevalidates; candidate validates while constructing. No matched Frontier claim. Shared host; three fresh processes required. Setup/retained heap not measured.'},null,2)+'\n',{flag:'wx'});
console.log(output);
