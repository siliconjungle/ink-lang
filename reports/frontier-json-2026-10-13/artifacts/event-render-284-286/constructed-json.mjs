// Compare exact source layouts at the text ingress and complete text lifecycle.
// Format-specific validations remain in JsonCodec. Native JSON is measured on
// the shared finite integer/Unicode domain, with its different contract recorded.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {applyPatch} from '@shapeshift-labs/frontier/apply';
import {OP_SET} from '@shapeshift-labs/frontier/constants';
import {provenance} from './provenance.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const id=Number(process.argv[2]),filenames=process.argv.slice(3);
if(!Number.isSafeInteger(id)||filenames.length!==4)throw Error('process ID and four modules required (two controls, two candidates)');
const output=path.join(root,`reports/frontier-json-2026-10-13/constructed-json-${id}.json`);
if(fs.existsSync(output))throw Error('report exists; choose a fresh ID');
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const runner=fileURLToPath(import.meta.url),runnerHash=sha(runner),before=provenance(root,{native:false});
const modules=[];
for(const [i,filename]of filenames.entries()){
 const file=path.resolve(root,filename),at=process.hrtime.bigint(),ink=await import(pathToFileURL(file).href),importNs=String(process.hrtime.bigint()-at);
 const start=process.hrtime.bigint(),entry=ink.compiledValues.set_document,codec=entry.params[0],json=new ink.JsonCodec(ink.valueCodecs.identity.result);
 modules.push({label:['control-records','control-records-sums','candidate-records','candidate-records-sums'][i],file,filename,sha256:sha(file),bytes:fs.statSync(file).size,import_ns:importNs,codec_factory_ns:String(process.hrtime.bigint()-start),ink,entry,codec,json});
}
let sink=0,rng=(id*555+12345)>>>0;const measurements=[],validation=[];
const measure=(run,calls)=>{const at=process.hrtime.bigint();let sum=0;for(let i=0;i<calls;i++)sum=(sum+run())>>>0;sink^=sum;return Number(process.hrtime.bigint()-at);};
const shuffle=keys=>{const a=keys.slice();for(let i=a.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=rng%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
for(const fields of [4,64,512]){
 const document=Object.fromEntries(Array.from({length:fields},(_,i)=>['k'+String(i).padStart(5,'0'),i]));document.unknown={nested:['雪',true,null,3],enabled:false};
 const text=JSON.stringify(document),key='k00000',target={...document,[key]:777},patch=[[OP_SET,[key],777]],lanes={};
 for(const m of modules){
  const {json,codec,entry,ink}=m,plain=json.parse(text),value=entry.params[2].capture(json.parse('777')),name=entry.params[1].capture(key);
  const ordinary=()=>codec.capture(json.parse(text)),constructed=()=>json.parseCompiled(codec,text);
  assert.deepEqual(codec.encode(ordinary()),codec.encode(constructed()));assert.deepEqual(codec.encodeCompact(ordinary()),codec.encodeCompact(constructed()));
  const pipeline=input=>json.stringify(entry.result.materialize(ink.callCompiled('set_document',[input(),name,value])).Ok);
  for(const input of [ordinary,constructed])assert.deepEqual(JSON.parse(pipeline(input)),target);
  if(typeof json.stringifyCompiled==='function'){
   const direct=()=>json.stringifyCompiled(entry.result,ink.callCompiled('set_document',[constructed(),name,value]),{unwrapResult:true});
   assert.deepEqual(JSON.parse(direct()),target);lanes[m.label+'/constructed-edit-direct-text']=()=>direct().length;
  }
  assert.deepEqual(json.parse(text),plain);
  lanes[m.label+'/parse-capture']=()=>Object.isFrozen(ordinary())?1:0;
  lanes[m.label+'/parse-constructed']=()=>Object.isFrozen(constructed())?1:0;
  lanes[m.label+'/capture-edit-text']=()=>pipeline(ordinary).length;
  lanes[m.label+'/constructed-edit-text']=()=>pipeline(constructed).length;
 }
 const frontier=()=>JSON.stringify(applyPatch(JSON.parse(text),patch,{cloneValues:true}));assert.deepEqual(JSON.parse(frontier()),target);
 lanes['frontier/text-edit-text']=()=>frontier().length;
 const counts={};for(const [name,run]of Object.entries(lanes)){for(let i=0;i<150;i++)run();const ns=measure(run,20);counts[name]=Math.max(10,Math.min(100000,Math.ceil(20000000/(ns/20))));}
 for(let round=0;round<9;round++)for(const name of shuffle(Object.keys(lanes))){const calls=counts[name],elapsed=measure(lanes[name],calls);measurements.push({fields,lane:name,round,calls,elapsed_ns:String(elapsed)});}
 validation.push({fields,complete_text_outputs:true,source_unchanged:true,exact_portable_and_compact_bytes:true});
 console.error(`${id}: fields=${fields} validated and measured`);
}
assert.equal(sha(runner),runnerHash);for(const m of modules)assert.equal(sha(m.file),m.sha256);assert.deepEqual(provenance(root,{native:false}).hashes,before.hashes);
fs.writeFileSync(output,JSON.stringify({schema:1,process:id,node:process.version,provenance:before,runner_sha256:runnerHash,modules:modules.map(({ink,entry,codec,json,file,...metadata})=>metadata),measurements,validation,sink,scope:'Paired same-process boundary implementations, with exact source layout controls and complete text lifecycles. Three fresh processes required. Shared finite integer/Unicode JSON inputs: Ink additionally rejects duplicate keys and preserves exact numeric tokens/member order; Frontier native JSON has a different ingress contract. Import/codec setup diagnostics are order-dependent. No selection authority or all-metrics claim.'},null,2)+'\n',{flag:'wx'});
console.log(output);
