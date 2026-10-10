import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {StatefulModule,parseExactJSON} from '../../runtime/hosts/state-wasm.mjs';
const results=[];
for(const mode of ['scan','maintained']){
 const fixture=new URL(`${mode}/`,import.meta.url);
 const module=await StatefulModule.instantiate(await readFile(new URL('program.wasm',fixture)));
 const steps=parseExactJSON(await readFile(new URL('script.json',fixture),'utf8'));
 const expected=parseExactJSON(await readFile(new URL('expected.json',fixture),'utf8'));
 const state=module.create();let position=0;
 for(const step of steps){const outcome=state.invoke(step.call,step.args);const snapshot=Array.from(state.snapshot(),BigInt);
  assert.deepEqual({outcome,snapshot},expected[position++],`${mode}: ${step.call}`);}
 state.dispose();assert.equal(position,expected.length);results.push({mode,calls:position,snapshots:position});
}
const result={status:'passed',engine:`Node ${process.version} / V8 ${process.versions.v8}`,results,
 scope:'Compiled stateful Wasm outcomes and exact portable snapshots. No timing or browser claim.'};
await writeFile(new URL('wasm-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
