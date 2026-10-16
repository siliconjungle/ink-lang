import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [folder,history]=process.argv.slice(2),root=resolve(folder),cases=resolve(history);
const program=await import(pathToFileURL(join(root,'program.mjs')));
const state=await program.createState(),seed=await readFile(join(root,'deployment.snapshot'));
assert.deepEqual(Buffer.from(await state.checkpoint()),seed);
const steps=JSON.parse(await readFile(join(cases,'script.json'))),expected=JSON.parse(await readFile(join(cases,'expected.json')));
const normalize=v=>typeof v==='bigint'?v.toString():typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
let index=0;
for(const step of steps){
 if(step.restore){await state.restore(Uint8Array.from(step.restore));continue;}
 const reply=step.pure?{value:program.call(step.pure,step.args)}:{outcome:await state.invoke(step.call,step.args)};
 assert.deepEqual(normalize(reply),normalize(expected[index].reply));
 assert.deepEqual([...await state.checkpoint()],expected[index].snapshot);index++;
}
const snapshot=await state.checkpoint();
assert.throws(()=>state.invoke('configure',[0,'Kind.Affine',0.5,0]),/unknown action configure/);
assert.deepEqual(await state.checkpoint(),snapshot);
await assert.rejects(program.restoreState(await readFile(join(root,'model.snapshot'))));
const restored=await program.restoreState(snapshot);assert.deepEqual(await restored.checkpoint(),snapshot);
const second=await program.createState();assert.deepEqual(Buffer.from(await second.checkpoint()),seed);
restored.dispose?.();second.dispose?.();state.dispose?.();
console.log(JSON.stringify({observations:index,typedInitialState:true,writerWithdrawn:true,exactSnapshots:true,freshInstances:true}));
