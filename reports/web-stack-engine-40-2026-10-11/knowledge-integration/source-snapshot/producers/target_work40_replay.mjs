// Untimed diagnostic fixture replay. These observations are offline, not an
// online predictor; acquisition and independent oracle setup are excluded.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
const [originalPath,instrumentedPath,receiptPath,fixturesPath,outputPath]=process.argv.slice(2);
if(!outputPath)throw Error('original instrumented receipt fixtures output required');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const load=p=>JSON.parse(fs.readFileSync(p));
const receipt=load(receiptPath),fixtures=load(fixturesPath);
if(sha(fs.readFileSync(originalPath))!==receipt.artifact_sha256||sha(fs.readFileSync(instrumentedPath))!==receipt.instrumented_sha256)throw Error('artifact binding changed');
if(!Array.isArray(fixtures)||fixtures.length>4096)throw Error('fixture budget');
const original=await import(pathToFileURL(originalPath)),instrumented=await import(pathToFileURL(instrumentedPath));
const reset=instrumented[receipt.prefix+'_reset'],snapshot=instrumented[receipt.prefix+'_snapshot'];
const normal=x=>ArrayBuffer.isView(x)?Array.from(x):x;
const rows=[],held=[];
for(const fixture of fixtures){
 const {id,entry,args,expected,boundary}=fixture;
 if(typeof id!=='string'||typeof entry!=='string'||!Array.isArray(args)||!['owned','into'].includes(boundary))throw Error('invalid fixture');
 const baselineArgs=structuredClone(args),actualArgs=structuredClone(args);
 reset();let base,actual,count=null;
 if(boundary==='into'){
  if(!Array.isArray(expected))throw Error('into requires list oracle');
  // Destination capacity/tail independent of returned logical extent.
  const capacity=expected.length+7, sentinel=0x5a5a5a5a;
  const destinationA=new Array(capacity).fill(sentinel),destinationB=new Array(capacity).fill(sentinel);
  const a=original.callInto(entry,baselineArgs,destinationA);
  const b=instrumented.callInto(entry,actualArgs,destinationB);
  if(!Number.isSafeInteger(b)||b<0||b>capacity||a!==b)throw Error('logical count mismatch');
  base=destinationA.slice(0,a);actual=destinationB.slice(0,b);count=b;
  if(destinationA.slice(a).some(x=>x!==sentinel)||destinationB.slice(b).some(x=>x!==sentinel))throw Error('destination tail changed');
  held.push([destinationB.slice(),destinationB]);
 }else{base=original.call(entry,baselineArgs);actual=instrumented.call(entry,actualArgs);if(Array.isArray(actual)||ArrayBuffer.isView(actual))held.push([normal(actual).slice(),actual]);}
 const observed=snapshot();
 if(!isDeepStrictEqual(normal(base),expected)||!isDeepStrictEqual(normal(actual),expected))throw Error('complete output/oracle mismatch '+id);
 if(!isDeepStrictEqual(args,baselineArgs)||!isDeepStrictEqual(args,actualArgs))throw Error('borrowed input mutation '+id);
 for(const [saved,value]of held)if(!isDeepStrictEqual(saved,normal(value)))throw Error('returned lifetime changed '+id);
 const components={invocations:1,loop_iterations:0,allocation_events:0,copy_bytes:observed.copy_bytes,gpu_dispatches:0,upload_bytes:0,readback_bytes:0};
 for(const site of receipt.sites){const n=observed.sites[site.id]??0;if(!Number.isSafeInteger(n)||n<0)throw Error('counter overflow');
  if(['loop_iterations','native_callback_iterations'].includes(site.kind))components.loop_iterations+=n;
  else components.allocation_events+=n;
 }
 const unknown=[...receipt.unknown,...observed.unknown];
 const unavailable=new Set(unknown.flatMap(x=>x.components??['loop_iterations','allocation_events','copy_bytes']));
 rows.push({id,entry,boundary,args_sha256:sha(JSON.stringify(args)),expected_sha256:sha(JSON.stringify(expected)),logical_count:count,components,known:Object.fromEntries(Object.keys(components).map(k=>[k,!unavailable.has(k)])),unknown,site_counts:receipt.sites.map(s=>({id:s.id,count:observed.sites[s.id]??0}))});
}
const report={schema:1,target:'javascript',status:'untimed-complete-output-replayed',artifact_sha256:receipt.artifact_sha256,instrumented_sha256:receipt.instrumented_sha256,instrumentation_sha256:sha(fs.readFileSync(receiptPath)),fixture_sha256:sha(fs.readFileSync(fixturesPath)),runner_sha256:sha(fs.readFileSync(new URL(import.meta.url))),node_version:process.version,rows,scope:'Offline exact-fixture diagnostic observations; no timer. Original and instrumented complete outputs checked against supplied independent oracle; inputs, destination tails and earlier returned outputs preserved. Instrumentation/acquisition/oracle setup excluded. Allocation events count emitted carrier constructions, not V8 physical allocator calls. Only explicit primitive copy bytes counted; JS Array byte extent remains unknown.'};
fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,frames:rows.length}));
