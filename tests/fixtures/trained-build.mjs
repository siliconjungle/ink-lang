import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
const [folder,casesFile]=process.argv.slice(2),root=resolve(folder);
const manifest=JSON.parse(await readFile(join(root,'artifact.json'),'utf8'));
const {createState,restoreState}=await import(pathToFileURL(join(root,manifest.entry)).href);
const cases=JSON.parse(await readFile(casesFile,'utf8'));
const seed=await readFile(join(root,'model.snapshot'));
const snapshot=state=>state.checkpoint?state.checkpoint():state.snapshot();
const plain=value=>JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?Number(v):v));
const state=await createState();
assert.deepEqual(Buffer.from(await snapshot(state)),seed);
for(const step of cases){assert.deepEqual(plain(await state.invoke(step.call,step.args)),step.outcome);assert.deepEqual([...await snapshot(state)],step.snapshot);}
await writeFile(join(root,'../'+basename(root)+'-continued.snapshot'),await snapshot(state));
const second=await createState();assert.deepEqual(Buffer.from(await snapshot(second)),seed);second.dispose?.();
const restored=await restoreState(await snapshot(state));assert.deepEqual(Buffer.from(await snapshot(restored)),Buffer.from(await snapshot(state)));restored.dispose?.();
const asset=name=>import(pathToFileURL(join(root,'hosts',name)).href);
if(manifest.target==='wasm32') {
 const {StatefulModule}=await asset('state-wasm.mjs');
 const wasm=await readFile(join(root,'program.wasm')),input=new Uint8Array(seed);
 const module=await StatefulModule.instantiate(wasm,{initialSnapshot:input});input.fill(0);
 const captured=module.create();assert.deepEqual(Buffer.from(captured.snapshot()),seed);captured.dispose();
 const source=module.createSourceState();assert.notDeepEqual(Buffer.from(source.snapshot()),seed);source.dispose();
 await assert.rejects(StatefulModule.instantiate(wasm,{initialSnapshot:new Uint8Array([1,2,3])}));
}
const {DurableState}=await asset('durable-state.mjs');const {openFileStore}=await asset('durable-file.mjs');
const storePath=join(root,'../'+basename(root)+'-runtime.inkstate');
const factory={create:createState,restore:restoreState};
let durable=await DurableState.open({factory,store:await openFileStore(storePath)});
for(const [i,step]of cases.entries())assert.deepEqual(plain(await durable.invoke('step:'+i,step.call,step.args)),step.outcome);
const saved=await durable.checkpoint();await durable.close();
durable=await DurableState.open({factory:{...factory,create(){throw Error('must recover instead of reinitialize');}},store:await openFileStore(storePath)});
assert.deepEqual(Buffer.from(await durable.checkpoint()),Buffer.from(saved));await durable.close();state.dispose?.();
console.log(manifest.target+': compiled startup, continued learning, exact snapshots, fresh instances and durable recovery matched.');
