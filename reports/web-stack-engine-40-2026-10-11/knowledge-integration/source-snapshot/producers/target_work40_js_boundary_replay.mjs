// Exact captured-JS boundary acquisition, untimed; setup/oracle outside counters.
import fs from 'node:fs';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';import {isDeepStrictEqual} from 'node:util';
const [originalPath,instrumentedPath,bodyReceiptPath,adapterPath,adapterInstrumentedPath,adapterReceiptPath,extractionPath,benchmarkRunnerPath,fixturesPath,outputPath]=process.argv.slice(2);
if(!outputPath)throw Error('body/instrumented/receipt adapter/instrumented/receipt extraction runner fixtures output required');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const bodyReceipt=read(bodyReceiptPath),adapterReceipt=read(adapterReceiptPath),extraction=read(extractionPath),fixtures=read(fixturesPath);
for(const [path,expected]of [[originalPath,bodyReceipt.artifact_sha256],[instrumentedPath,bodyReceipt.instrumented_sha256],[adapterPath,adapterReceipt.artifact_sha256],[adapterInstrumentedPath,adapterReceipt.instrumented_sha256],[adapterPath,extraction.adapter_sha256],[benchmarkRunnerPath,extraction.runner_sha256]])if(sha(fs.readFileSync(path))!==expected)throw Error('boundary source binding changed');
if(!Array.isArray(fixtures)||fixtures.length>4096)throw Error('fixture budget');
const original=await import(pathToFileURL(originalPath)),instrumented=await import(pathToFileURL(instrumentedPath)),adapter=await import(pathToFileURL(adapterPath)),instrumentedAdapter=await import(pathToFileURL(adapterInstrumentedPath));
const normal=x=>ArrayBuffer.isView(x)?Array.from(x):x;const rows=[],held=[];
for(const f of fixtures){
 const args=f.args.map(x=>Array.isArray(x)?Uint32Array.from(x):x); // Setup excluded, exactly the runner's typed resident public inputs.
 const originalInputs=args.map(x=>normal(x)),prefix=bodyReceipt.prefix,boundaryPrefix=adapterReceipt.prefix;
 instrumented[prefix+'_reset']();instrumentedAdapter[boundaryPrefix+'_reset']();
 const base=adapter.run(original,f.entry,args,f.expected);const actual=instrumentedAdapter.run(instrumented,f.entry,args,f.expected);
 if(!isDeepStrictEqual(normal(base.value),f.expected)||!isDeepStrictEqual(normal(actual.value),f.expected)||base.checksum!==actual.checksum)throw Error('boundary complete output/checksum mismatch '+f.id);
 if(!isDeepStrictEqual(originalInputs,args.map(normal))||!isDeepStrictEqual(originalInputs,actual.captured.map(normal)))throw Error('boundary input/capture mutation');
 for(const [saved,value]of held)if(!isDeepStrictEqual(saved,normal(value)))throw Error('owned returned lifetime changed');
 if(Array.isArray(actual.value)||ArrayBuffer.isView(actual.value))held.push([normal(actual.value).slice(),actual.value]);
 const body=instrumented[prefix+'_snapshot'](),boundary=instrumentedAdapter[boundaryPrefix+'_snapshot']();
 const components={invocations:1,loop_iterations:0,allocation_events:0,copy_bytes:body.copy_bytes+boundary.copy_bytes,gpu_dispatches:0,upload_bytes:0,readback_bytes:0};const unknown=[];const site_counts=[];
 for(const [scope,receipt,counters]of [['body',bodyReceipt,body],['boundary',adapterReceipt,boundary]]){
  unknown.push(...receipt.unknown.map(x=>({...x,scope})),...counters.unknown.map(x=>({...x,scope})));
  for(const site of receipt.sites){const n=counters.sites[site.id]??0;if(!Number.isSafeInteger(n)||n<0)throw Error('counter overflow');site_counts.push({scope,id:site.id,count:n});if(['loop_iterations','native_callback_iterations'].includes(site.kind))components.loop_iterations+=n;else components.allocation_events+=n;}
 }
 const unavailable=new Set(unknown.flatMap(x=>x.components??['loop_iterations','allocation_events','copy_bytes']));
 rows.push({id:f.id,entry:f.entry,boundary:Array.isArray(f.expected)?'captured-js-owned':'captured-js-value',components,known:Object.fromEntries(Object.keys(components).map(k=>[k,!unavailable.has(k)])),unknown,site_counts,checksum:actual.checksum,args_sha256:sha(JSON.stringify(f.args)),expected_sha256:sha(JSON.stringify(f.expected))});
}
const report={schema:1,target:'javascript',status:'untimed-complete-output-replayed',artifact_sha256:bodyReceipt.artifact_sha256,instrumented_sha256:bodyReceipt.instrumented_sha256,instrumentation_sha256:sha(fs.readFileSync(bodyReceiptPath)),fixture_sha256:sha(fs.readFileSync(fixturesPath)),runner_sha256:sha(fs.readFileSync(new URL(import.meta.url))),node_version:process.version,boundary:{runner_sha256:extraction.runner_sha256,extractor_sha256:extraction.producer_sha256,adapter_sha256:extraction.adapter_sha256,instrumented_sha256:adapterReceipt.instrumented_sha256,instrumentation_sha256:sha(fs.readFileSync(adapterReceiptPath)),extraction_sha256:sha(fs.readFileSync(extractionPath))},rows,scope:'Offline exact General40 captured-JS boundary: actual frozen runner capture args.map callback visits, typed slice construction/payload bytes, generated function sites, and everyword consumer loop. Setup typed resident inputs, timer outer iteration/check/accounting, instrumentation acquisition and independent oracle setup excluded. Complete original/instrumented outputs/checksum/input/lifetime compared. Literal body/native callback visits and emitted carrier events, not V8 allocator internals or machine instructions. No timer/online prediction.'};
fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,frames:rows.length,unknown:rows.filter(x=>!Object.values(x.known).every(Boolean)).length}));
