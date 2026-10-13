// Fresh-process lifecycle controls. GC/memory observations are diagnostics;
// construction, first use and retained data have explicit, separate boundaries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createFrontierAdapter} from './state-adapters.mjs';
import {provenance} from './provenance.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const self=fileURLToPath(import.meta.url),flag=name=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
const modulePath=flag('ink-module')??'build/frontier-json/wire-child-release.mjs';
const processIndex=Number(process.argv[2]??0),child=process.argv.includes('--child');
const fields=Number(flag('fields')??512),retained=Number(flag('retained')??32),rows=Number(flag('rows')??4096);
for(const [name,n,max]of [['process',processIndex,1000000],['fields',fields,10000],['retained',retained,256],['rows',rows,10000]])
 if(!Number.isSafeInteger(n)||n<(name==='process'?0:1)||n>max)throw Error('invalid '+name);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const memory=()=>{global.gc();return process.memoryUsage();};
const timed=run=>{const at=process.hrtime.bigint(),value=run();return{value,ns:String(process.hrtime.bigint()-at)};};
const text=JSON.stringify({...Object.fromEntries(Array.from({length:fields},(_,i)=>['k'+String(i).padStart(5,'0'),i])),unknown:{nested:['雪',true,null,3],enabled:false}});
if(!child){
 const output=path.join(ROOT,`reports/frontier-json-2026-10-13/lifecycle-${processIndex}.json`);
 if(fs.existsSync(output))throw Error('report exists; choose a fresh process ID');
 const before=provenance(ROOT),moduleHash=hash(path.resolve(ROOT,modulePath));
 before.hashes[modulePath]=moduleHash;
 for(const name of ['lifecycle-compare.mjs','state-adapters.mjs'])before.hashes['bench/frontier-json/'+name]=hash(path.join(ROOT,'bench/frontier-json',name));
 const measurements=[];
 for(const scenario of ['json-tree','state','transport','transport-compact'])for(const lane of processIndex%2?['frontier','ink']:['ink','frontier']){
  const result=spawnSync(process.execPath,['--expose-gc',self,String(processIndex),'--child',`--scenario=${scenario}`,`--lane=${lane}`,`--ink-module=${modulePath}`,`--fields=${fields}`,`--retained=${retained}`,`--rows=${rows}`],{cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024});
  if(result.status!==0)throw Error(`${scenario}/${lane}: ${result.stderr||result.stdout}`);
  measurements.push(JSON.parse(result.stdout));
 }
 const after=provenance(ROOT);after.hashes[modulePath]=hash(path.resolve(ROOT,modulePath));
 for(const name of ['lifecycle-compare.mjs','state-adapters.mjs'])after.hashes['bench/frontier-json/'+name]=hash(path.join(ROOT,'bench/frontier-json',name));
 assert.deepEqual(after.hashes,before.hashes);
 assert.deepEqual(after.revisions,before.revisions);assert.equal(hash(path.resolve(ROOT,modulePath)),moduleHash);
 const report={schema:1,provenance:before,process:processIndex,fields,retained_documents:retained,rows,measurements,
  scope:'Eight independent fresh processes per cohort, alternating library order. Capability-specific import, construction, first-use and retained phases. Shared safe-integer/Unicode JSON observations; Ink additionally preserves exact tokens/order. Forced-GC retained deltas and whole-process maxRSS include runtime/harness/verification; no exact allocation or statistical peak bound.'};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(output);process.exit(0);
}
if(typeof global.gc!=='function')throw Error('--expose-gc required');
const scenario=flag('scenario'),lane=flag('lane');
if(!['json-tree','state','transport','transport-compact'].includes(scenario)||!['ink','frontier'].includes(lane))throw Error('invalid scenario/lane');
// The fixture string exists before either import; both libraries see identical
// immutable source text. Output trees/buffers are independently owned.
const beforeImport=memory(),started=process.hrtime.bigint();
let ink,validate,codecApi,stateApi,cloneApi,constantApi;
if(lane==='ink')ink=await import(pathToFileURL(path.resolve(ROOT,modulePath)).href);
else if(scenario==='json-tree')validate=await import('@shapeshift-labs/frontier/validate');
else if(scenario.startsWith('transport'))codecApi=await import('@shapeshift-labs/frontier-codec');
else{
 stateApi=await import(pathToFileURL(path.join(ROOT,'build/frontier-state-main/dist/index.js')).href);
 cloneApi=await import('@shapeshift-labs/frontier/clone');constantApi=await import('@shapeshift-labs/frontier/constants');
}
const importNs=String(process.hrtime.bigint()-started),afterImport=memory();
let constructNs,firstNs,retainNs,held=[],bytesPerDocument=null,retainedBufferBytes=null,phasePeak=null,verify,release;
let afterConstruction,beforeRetain,afterRetain;
if(scenario==='json-tree'){
 const construct=timed(()=>lane==='ink'?new ink.JsonCodec(ink.valueCodecs.identity.result):null),json=construct.value;constructNs=construct.ns;afterConstruction=memory();
 const make=()=>{if(json)return json.parse(text);const value=JSON.parse(text);validate.assertJsonValue(value);return value;};
 verify=value=>assert.equal(json?json.stringify(value):JSON.stringify(value),text);
 const first=timed(make);firstNs=first.ns;verify(first.value);
 for(let i=0;i<100;i++)make();beforeRetain=memory();
 const keep=timed(()=>{for(let i=0;i<retained;i++)held.push(make());});retainNs=keep.ns;afterRetain=memory();phasePeak=process.resourceUsage().maxRSS*1024;
 assert.equal(held.length,retained);assert.notEqual(held[0],first.value);
 for(const value of held)verify(value);
 release=()=>{held.length=0;};
}else if(scenario.startsWith('transport')){
 const construct=timed(()=>lane==='ink'?new ink.JsonCodec(ink.valueCodecs.identity.result):null),json=construct.value;constructNs=construct.ns;afterConstruction=memory();
 const compact=json&&scenario==='transport-compact'?json.values.compact():null;
 const make=()=>compact?compact.encode(json.parse(text)):json?json.parseBinary(text):codecApi.encodePatch([[0,[],JSON.parse(text)]]);
 verify=bytes=>assert.equal(compact?json.stringify(compact.decode(bytes)):json?json.stringifyBinary(bytes):JSON.stringify(codecApi.decodePatch(bytes)[0][2]),text);
 const first=timed(make);firstNs=first.ns;verify(first.value);bytesPerDocument=first.value.length;
 for(let i=0;i<100;i++)make();beforeRetain=memory();
 const keep=timed(()=>{for(let i=0;i<retained;i++)held.push(make());});retainNs=keep.ns;afterRetain=memory();phasePeak=process.resourceUsage().maxRSS*1024;
 retainedBufferBytes=held.reduce((n,bytes)=>n+bytes.buffer.byteLength,0);
 assert.equal(new Set(held.map(bytes=>bytes.buffer)).size,retained);
 for(const value of held){assert.equal(value.length,bytesPerDocument);assert.notEqual(value.buffer,first.value.buffer);verify(value);}
 release=()=>{held.length=0;};
}else{
 const construct=timed(()=>lane==='ink'?ink.createState():createFrontierAdapter({initial:{},rows:0},'frontier-state-main-patch',{
  cloneJson:cloneApi.cloneJson,mainState:stateApi.createStateEngine,OP_SET:constantApi.OP_SET,OP_REMOVE:constantApi.OP_REMOVE}));
 let state=construct.value;constructNs=construct.ns;afterConstruction=memory();
 const row=i=>({value:i,active:(i&1)===0,metadata:lane==='ink'?ink.parseJson('{"tag":'+i+'}'):JSON.parse('{"tag":'+i+'}')});
 const invoke=(key,value)=>{const reply=state.invoke_json('put',[key,value,false]);assert.equal(reply.committed,true);assert.equal(reply.events.length,1);assert.equal(reply.events[0].value,value.value);(state.acknowledgeThrough??state.acknowledge_through).call(state,0xffffffffffffffffn,0xffffffffffffffffn);return reply;};
 const first=timed(()=>invoke('first',row(0)));firstNs=first.ns;
 state.invoke_json('erase',['first',false]);(state.acknowledgeThrough??state.acknowledge_through).call(state,0xffffffffffffffffn,0xffffffffffffffffn);
 beforeRetain=memory();const keep=timed(()=>{for(let i=0;i<rows;i++)invoke('r'+i,row(i));});retainNs=keep.ns;afterRetain=memory();phasePeak=process.resourceUsage().maxRSS*1024;
 assert.equal(state.version,BigInt(rows+2));assert.equal(state.invoke_json('total',[]).result,Array.from({length:rows},(_,i)=>i%2?0:i).reduce((a,b)=>a+b,0)>>>0);
 if(lane==='ink'){const result=state.invoke('row',['r'+(rows-1)]).result;assert.equal(result.Some.value,rows-1);}
 else{assert.equal(Object.keys(state.rows).length,rows);assert.equal(state.outbox.length,0);assert.equal(state.rows['r'+(rows-1)].value,rows-1);}
 release=()=>{state.dispose?.();state=null;construct.value=null;};
}
const retainedDelta=Object.fromEntries(['heapUsed','external','arrayBuffers','rss'].map(key=>[key,afterRetain[key]-beforeRetain[key]]));
release();const afterRelease=memory();
console.log(JSON.stringify({scenario,lane,process:processIndex,module:lane==='ink'?modulePath:null,import_ns:importNs,construction_ns:constructNs,first_use_ns:firstNs,retain_ns:retainNs,bytes_per_document:bytesPerDocument,
 beforeImport,afterImport,afterConstruction,beforeRetain,afterRetain,afterRelease,retained_delta_bytes:retainedDelta,retained_buffer_bytes:retainedBufferBytes,retained_phase_peak_rss_bytes:phasePeak,process_peak_rss_bytes:process.resourceUsage().maxRSS*1024,
 verified:true,scope:scenario==='state'?'Equivalent per-row public puts, full source reply/event/version checks and acknowledgement; fixture conversion and assertions included in initialization, with no timed throughput claim.':scenario==='transport-compact'?'Text to independently owned complete-document buffers. Ink agreed-schema encode(parse(text)) versus Frontier root-set patch; schema negotiation out of band, extra logical conversion explicit.':scenario==='transport'?'Text to independently owned complete-document buffers. Ink portable typed value versus Frontier root-set patch; distinct protocol contracts.':'Text to independently owned complete JSON trees; parsing/validation included. Both render the exact shared-domain fixture.'}));
