import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {applyPatch} from '@shapeshift-labs/frontier/apply';
import {OP_SET} from '@shapeshift-labs/frontier/constants';
import {provenance} from './provenance.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const processId=Number(process.argv[2]);
if(!Number.isSafeInteger(processId))throw Error('process ID required');
const output=path.join(root,`reports/frontier-json-2026-10-13/native-ingress-${processId}.json`);
if(fs.existsSync(output))throw Error('report exists');
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files=['bench/frontier-json/native-ingress.mjs','bench/frontier-json/provenance.mjs','bench/frontier-json/state.ink','bench/frontier-json/package-lock.json','build/typed-reduction/native-ingress.mjs','build/typed-reduction/flat.mjs'];
// Bind the actual installed Frontier JavaScript, including local chunks. A Git
// revision alone does not identify generated package output.
let packageRoot=path.dirname(fileURLToPath(import.meta.resolve('@shapeshift-labs/frontier/apply')));
while(!fs.existsSync(path.join(packageRoot,'package.json'))){const parent=path.dirname(packageRoot);if(parent===packageRoot)throw Error('Frontier package root');packageRoot=parent;}
const dependencyFiles=[];
const collect=directory=>{for(const item of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isDirectory()&&item.name!=='node_modules'&&item.name!=='.git')collect(file);else if(item.isFile()&&/\.(?:mjs|cjs|js)$/.test(item.name))dependencyFiles.push(file);}};
collect(packageRoot);dependencyFiles.push(path.join(packageRoot,'package.json'));dependencyFiles.sort();
const dependencies=Object.fromEntries(dependencyFiles.map(file=>[path.relative(packageRoot,file),hash(file)]));
const provenanceOptions={native:false,artifacts:files,repositories:['.','abi','lowerings/js','knowledge','planner','build/frontier']};
const before=provenance(root,provenanceOptions);
const ink=await import(pathToFileURL(path.join(root,'build/typed-reduction/flat.mjs')).href);
const {parseCanonical}=await import(pathToFileURL(path.join(root,'build/typed-reduction/native-ingress.mjs')).href);
const entry=ink.compiledValues.set_document,codec=entry.params[0],json=new ink.JsonCodec(ink.valueCodecs.identity.result);
const rows=[],validation=[];let checksum=0,rng=(processId*555+12345)>>>0;
const shuffle=keys=>{const a=keys.slice();for(let i=a.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=rng%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const measure=(run,count)=>{const at=process.hrtime.bigint();let sum=0;for(let i=0;i<count;i++)sum^=run();checksum^=sum;return Number(process.hrtime.bigint()-at);};
for(const fields of [4,64,512]){
 const document=Object.fromEntries(Array.from({length:fields},(_,i)=>['k'+String(i).padStart(5,'0'),i]));document.unknown={nested:['雪',true,null,3],enabled:false};
 const text=JSON.stringify(document),key=entry.params[1].capture('k00000'),value=codec.capture(json.parse('777')),patch=[[OP_SET,['k00000'],777]],target={...document,k00000:777};
 const ordinary=()=>codec.capture(json.parse(text));
 const constructed=()=>json.parseCompiled(codec,text);
 const canonical=()=>parseCanonical(json,codec,text);
 assert.deepEqual(codec.encode(canonical()),codec.encode(ordinary()));assert.deepEqual(codec.encodeCompact(canonical()),codec.encodeCompact(ordinary()));
 const pipeline=input=>json.stringifyCompiled(entry.result,ink.callCompiled('set_document',[input(),key,value]),{unwrapResult:true});
 for(const input of [ordinary,constructed,canonical])assert.deepEqual(JSON.parse(pipeline(input)),target);
 const frontier=()=>JSON.stringify(applyPatch(JSON.parse(text),patch,{cloneValues:true}));assert.deepEqual(JSON.parse(frontier()),target);
 const lanes={
  'parse-capture':()=>Object.isFrozen(ordinary())?1:0,
  'parse-constructed':()=>Object.isFrozen(constructed())?1:0,
  'parse-native-guarded':()=>Object.isFrozen(canonical())?1:0,
  'capture-edit-direct-text':()=>pipeline(ordinary).length,
  'constructed-edit-direct-text':()=>pipeline(constructed).length,
  'native-guarded-edit-direct-text':()=>pipeline(canonical).length,
  'frontier/text-edit-text':()=>frontier().length,
 },counts={};
 for(const [name,run]of Object.entries(lanes)){for(let i=0;i<150;i++)run();const ns=measure(run,20);counts[name]=Math.max(10,Math.min(100000,Math.ceil(20000000/(ns/20))));}
 for(let round=0;round<9;round++)for(const name of shuffle(Object.keys(lanes))){const calls=counts[name],ns=measure(lanes[name],calls);rows.push({fields,lane:name,round,calls,elapsed_ns:String(ns)});}
 validation.push({fields,complete_outputs:true,exact_portable_and_compact_bytes:true});console.error(`${processId}: fields=${fields}`);
}
assert.deepEqual(provenance(root,provenanceOptions).hashes,before.hashes);
assert.deepEqual(Object.fromEntries(dependencyFiles.map(file=>[path.relative(packageRoot,file),hash(file)])),dependencies);
fs.writeFileSync(output,JSON.stringify({schema:1,process:processId,provenance:before,dependency:{package_root:packageRoot,hashes:dependencies},measurements:rows,validation,checksum,scope:'Experimental native JSON round-trip guard with exact-parser fallback. No default or proof authority. Shared finite-integer/Unicode workload; Frontier native JSON has different validation/lexeme/resource contracts. Shared host, rotated paired lanes, three fresh processes required.'},null,2)+'\n',{flag:'wx'});
