// Replay the independently reference-checked complete geometry corpus against a
// newly emitted JS module, including sealed partial calls and repeated reuse.
// Usage: node check-complex.mjs MODULE REPORT_DIRECTORY
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.argv.length!==4)throw Error('expected MODULE REPORT_DIRECTORY');
const modulePath=resolve(process.argv[2]),report=resolve(process.argv[3]);
const ink=await import(pathToFileURL(modulePath));
const checked=JSON.parse(await readFile(resolve(report,'source-check.json'),'utf8'));
assert.equal(ink.metadata.core_sha256,checked.core_sha256,'same independently checked source image');
const read=async name=>JSON.parse(gunzipSync(await readFile(resolve(report,name))));
const steps=await read('geometry-script.json.gz'),expected=await read('geometry-expected.json.gz');
assert.equal(steps.length,13002);assert.equal(expected.length,steps.length);
let ordinary=0,prepared=0;
for(let i=0;i<steps.length;i++){
 const step=steps[i];assert.equal(typeof step.pure,'string');
 const entry=ink.compiledValues[step.pure],args=step.args.map((v,j)=>entry.params[j].capture(v));
 const bytes=ink.valueCodecs[step.pure].result.encode(expected[i].reply.value);
 assert.deepEqual(entry.result.encode(ink.callCompiled(step.pure,args)),bytes,`${i}: ordinary ${step.pure}`);ordinary++;
 for(const bound of [[],[0]]){
  const token=ink.prepareCompiled(step.pure,bound.map(j=>[j,args[j]])),rest=args.filter((_,j)=>!bound.includes(j));
  for(let repeat=0;repeat<2;repeat++){
   assert.deepEqual(entry.result.encode(ink.callPreparedCompiled(token,rest)),bytes,`${i}: prepared ${step.pure}`);prepared++;
  }
 }
}
console.log(JSON.stringify({source_core:checked.core_sha256,referenceObservations:steps.length,ordinary,prepared,
 scope:'Complete retained independent-reference values; exact typed bytes, sealed captured inputs. Pure JavaScript replay only; not new reference, native, Wasm or GPU execution or performance evidence.'}));
