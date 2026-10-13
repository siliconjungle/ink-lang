// Separate-process lifecycle/memory diagnosis; never mix this with timing cohorts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const modulePath=process.argv[2],processIndex=Number(process.argv[3]??0);
if(!modulePath||typeof global.gc!=='function')throw Error('module path and --expose-gc required');
const filename=path.resolve(root,modulePath),hash=createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const memory=()=>{global.gc();return process.memoryUsage();};
const beforeImport=memory(),importStart=process.hrtime.bigint();
const ink=await import(pathToFileURL(filename).href);
const importNs=process.hrtime.bigint()-importStart,afterImport=memory();
const constructorStart=process.hrtime.bigint();
const codec=new ink.JsonCodec(ink.valueCodecs.identity.result);
const constructorNs=process.hrtime.bigint()-constructorStart,afterConstructor=memory();
const text=JSON.stringify(Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),i]))),wire=codec.parseBinary(text);
const firstDecodeStart=process.hrtime.bigint();
assert.equal(codec.stringify(codec.values.decode(wire)),text);
const firstDecodeNs=process.hrtime.bigint()-firstDecodeStart;
for(let i=0;i<100;i++)codec.values.decode(wire);
const beforeDecode=memory(),values=[];
const at=process.hrtime.bigint();
for(let i=0;i<32;i++)values.push(codec.values.decode(wire));
const decodeNs=process.hrtime.bigint()-at,afterDecode=memory();
for(const value of values)assert.equal(codec.stringify(value),text);
assert.equal(values.length,32);
const retainedHeap=afterDecode.heapUsed-beforeDecode.heapUsed;
values.length=0;const afterRelease=memory();
assert.equal(createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),hash);
console.log(JSON.stringify({schema:1,module:modulePath,sha256:hash,process:processIndex,node:process.version,
  fields:512,retained_documents:32,import_ns:String(importNs),constructor_ns:String(constructorNs),first_decode_and_render_ns:String(firstDecodeNs),decode_32_ns:String(decodeNs),
  beforeImport,afterImport,afterConstructor,beforeDecode,afterDecode,afterRelease,retained_heap_delta_bytes:retainedHeap,
  process_peak_rss_bytes:process.resourceUsage().maxRSS*1024,
  scope:'Fresh-process module/codec construction and 32 owned decoded documents. Forced-GC heap observations and whole-process high-water RSS include harness/warmup/verification. These are diagnostics, not exact allocation counts or statistical memory bounds.'})+'\n');
