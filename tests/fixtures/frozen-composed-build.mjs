import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [folder,casesFile]=process.argv.slice(2),root=resolve(folder);
const manifest=JSON.parse(await readFile(join(root,'artifact.json')));
const program=await import(pathToFileURL(join(root,manifest.entry)));
const fixture=JSON.parse(await readFile(casesFile));
const seed=await readFile(join(root,'deployment.snapshot'));
const snapshot=s=>s.checkpoint?s.checkpoint():s.snapshot();
const normalize=v=>typeof v==='bigint'?v.toString():typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
const state=await program.createState();
assert.deepEqual(Buffer.from(await snapshot(state)),seed);
await assert.rejects(async()=>{
 const bytes=Uint8Array.from(fixture.invalid);
 if(state.restore)await state.restore(bytes);else (await program.restoreState(bytes)).dispose?.();
},/frozen/);
assert.deepEqual(Buffer.from(await snapshot(state)),seed);
for(const step of fixture.cases){
 assert.deepEqual(normalize(await state.invoke(step.call,step.args)),normalize(step.outcome));
 assert.deepEqual([...await snapshot(state)],step.snapshot);
}
const final=await snapshot(state),restored=await program.restoreState(final);
assert.deepEqual(Buffer.from(await snapshot(restored)),Buffer.from(final));
const fresh=await program.createState();assert.deepEqual(Buffer.from(await snapshot(fresh)),seed);
assert.throws(()=>fresh.invoke('configure',[]),/unknown action(?: configure)?$/);
assert.deepEqual(Buffer.from(await snapshot(fresh)),seed);
await assert.rejects(program.restoreState(await readFile(join(root,'model.snapshot'))));
for(const instance of [state,restored,fresh])instance.dispose?.();
console.log(JSON.stringify({target:manifest.target,observations:fixture.cases.length,initialized:true,exactSnapshots:true,invalidRestoreRejected:true,freshInstances:true}));
