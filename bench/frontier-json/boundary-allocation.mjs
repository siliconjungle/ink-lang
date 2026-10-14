// Paired experiment: generic builder scratch and JSON consumer allocation.
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
if(!Number.isSafeInteger(id)||filenames.length!==3)throw Error('process ID and control/builder/consumer modules required');
const output=path.join(root,`reports/frontier-json-2026-10-13/boundary-allocation-${id}.json`);
if(fs.existsSync(output))throw Error('report exists');
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let packageRoot=path.dirname(fileURLToPath(import.meta.resolve('@shapeshift-labs/frontier/apply')));
while(!fs.existsSync(path.join(packageRoot,'package.json'))){const parent=path.dirname(packageRoot);if(parent===packageRoot)throw Error('Frontier package root');packageRoot=parent;}
const dependencyFiles=[];
const collect=directory=>{for(const item of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isDirectory()&&item.name!=='node_modules'&&item.name!=='.git')collect(file);else if(item.isFile()&&/\.(?:mjs|cjs|js)$/.test(item.name))dependencyFiles.push(file);}};
collect(packageRoot);dependencyFiles.push(path.join(packageRoot,'package.json'));dependencyFiles.sort();
const dependencies=()=>Object.fromEntries(dependencyFiles.map(file=>[path.relative(packageRoot,file),hash(file)])),beforeDependencies=dependencies();
const artifacts=['bench/frontier-json/boundary-allocation.mjs','bench/frontier-json/provenance.mjs','bench/frontier-json/state.ink','bench/frontier-json/package-lock.json',...filenames];
const provenanceOptions={native:false,artifacts,repositories:['.','abi','lowerings/js','knowledge','planner','build/frontier']},before=provenance(root,provenanceOptions);
const modules=[];
for(const [index,file]of filenames.entries()){
 const ink=await import(pathToFileURL(path.join(root,file)).href),entry=ink.compiledValues.set_document;
 modules.push({label:['control','builder','consumer'][index],file,ink,entry,codec:entry.params[0],json:new ink.JsonCodec(ink.valueCodecs.identity.result)});
}
const rows=[],validation=[];let checksum=0,rng=(id*555+12345)>>>0;
const shuffle=keys=>{const a=keys.slice();for(let i=a.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=rng%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const measure=(run,count)=>{const at=process.hrtime.bigint();let sum=0;for(let i=0;i<count;i++)sum^=run();checksum^=sum;return Number(process.hrtime.bigint()-at);};
for(const fields of [4,64,512]){
 const document=Object.fromEntries(Array.from({length:fields},(_,i)=>['k'+String(i).padStart(5,'0'),i]));document.unknown={nested:['雪',true,null,3],enabled:false};
 const text=JSON.stringify(document),target={...document,k00000:777},patch=[[OP_SET,['k00000'],777]],lanes={};let portable,compact;
 for(const {label,ink,entry,codec,json}of modules){
  const key=entry.params[1].capture('k00000'),value=codec.capture(json.parse('777')),input=()=>json.parseCompiled(codec,text),handle=input();
  assert.deepEqual(codec.encode(handle),codec.encode(codec.capture(json.parse(text))));
  portable??=codec.encode(handle);compact??=codec.encodeCompact(handle);
  assert.deepEqual(codec.encode(handle),portable);assert.deepEqual(codec.encodeCompact(handle),compact);
  const render=handle=>json.stringifyCompiled(entry.result,handle,{unwrapResult:true});
  const result=ink.callCompiled('set_document',[handle,key,value]);
  assert.equal(render(result),JSON.stringify(target));assert.deepEqual(codec.materialize(handle),json.parse(text));
  lanes[label+'/input']=()=>Object.isFrozen(input())?1:0;
  lanes[label+'/prepared-output']=()=>render(result).length;
  lanes[label+'/text-edit-text']=()=>render(ink.callCompiled('set_document',[input(),key,value])).length;
 }
 const frontier=()=>JSON.stringify(applyPatch(JSON.parse(text),patch,{cloneValues:true}));assert.equal(frontier(),JSON.stringify(target));lanes['frontier/text-edit-text']=()=>frontier().length;
 const counts={};for(const [name,run]of Object.entries(lanes)){for(let i=0;i<150;i++)run();const ns=measure(run,20);counts[name]=Math.max(10,Math.min(100000,Math.ceil(20000000/(ns/20))));}
 for(let round=0;round<9;round++)for(const name of shuffle(Object.keys(lanes))){const calls=counts[name],ns=measure(lanes[name],calls);rows.push({fields,lane:name,round,calls,elapsed_ns:String(ns)});}
 validation.push({fields,complete_outputs:true,source_unchanged:true,exact_portable_and_compact_bytes:true});console.error(`${id}: fields=${fields}`);
}
assert.deepEqual(provenance(root,provenanceOptions).hashes,before.hashes);assert.deepEqual(dependencies(),beforeDependencies);
fs.writeFileSync(output,JSON.stringify({schema:1,process:id,node:process.version,provenance:before,dependency:{package_root:packageRoot,hashes:beforeDependencies},measurements:rows,validation,checksum,scope:'Three fresh paired processes; identical selected layout and source. Builder changes only generic session allocation; consumer also removes JSON member result objects. Native Frontier uses different numeric-token/member-order/duplicate/resource contracts. Shared host; import, memory and selection profitability are not established.'},null,2)+'\n',{flag:'wx'});
console.log(output);
