import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {StatefulModule,parseExactJSON} from '../../runtime/hosts/state-wasm.mjs';
const results=[];
for(const [mode,path] of [['scan','../action-effects-phase1/scan/'],['maintained','../action-effects-phase1/maintained/'],['query-errors','../action-effects-phase1/query-errors/'],['frames','frames/']]) {
 const fixture=new URL(path,import.meta.url);
 const module=await StatefulModule.instantiate(await readFile(new URL('program.wasm',fixture)));
 const steps=parseExactJSON(await readFile(new URL('script.json',fixture),'utf8'));
 const expected=parseExactJSON(await readFile(new URL('expected.json',fixture),'utf8'));
 const state=module.create();let position=0;
 for(const step of steps){const outcome=state.invoke(step.call,step.args);const snapshot=Array.from(state.snapshot(),BigInt);
  assert.deepEqual({outcome,snapshot},expected[position++],`${mode}: ${step.call}`);}
 state.dispose();assert.equal(position,expected.length);results.push({mode,calls:position,snapshots:position});
}
const result={status:'passed',engine:`Node ${process.version} / V8 ${process.versions.v8}`,results,
 scope:'Compiled stateful Wasm outcomes and exact snapshots against direct typed reference execution. The three prior modules are reused unchanged; frames was newly compiled with Rust lowering 23edd15. No timing or browser claim.'};
await writeFile(new URL('wasm-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
