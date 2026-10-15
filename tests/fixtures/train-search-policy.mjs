import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [modulePath,statePath,directory]=process.argv.slice(2);
const module=await import(pathToFileURL(resolve(modulePath)));
const raw=JSON.parse(await fs.readFile(statePath,'utf8'));
const candidate={id:'a'.repeat(64),source:raw.source,target:'javascript',state:raw.document,
 default_priority:0,frequencies:[{entry:'call:main',calls:1n}]};
const learner=module.createState();
const context=()=>{const value=learner.bind('context')().result;assert.ok(value.Ok);return value.Ok;};
const before=context();
const config={rate:0.25,first_decay:0,second_decay:0,epsilon:0.00000001,weight_decay:0,norm_limit:0};
for(let i=0;i<8;i++){
 const reply=learner.bind('feedback')(candidate,-100,config);
 assert.ok(Object.hasOwn(reply.result,'Ok'));assert.equal(reply.committed,true);assert.equal(reply.version,BigInt(i+1));
}
const after=context();assert.ok(after.weights[1]<0,'authored structure labels train a negative structure coefficient');
const snapshot=await learner.checkpoint();
const failed=learner.bind('feedback')(candidate,{F32Bits:2143289344},config);
assert.ok(Object.hasOwn(failed.result,'Err'));assert.equal(failed.committed,false);assert.deepEqual(await learner.checkpoint(),snapshot);
const restored=module.createState();await restored.restore(snapshot);
assert.deepEqual(restored.bind('context')().result,{Ok:after});assert.deepEqual(await restored.checkpoint(),snapshot);
await fs.writeFile(join(directory,'before.json'),JSON.stringify(before)+'\n');
await fs.writeFile(join(directory,'after.json'),JSON.stringify(after)+'\n');
const receipt={schema:1,status:'passed',source:module.metadata.core_sha256,updates:8,before,after,
 checkpoint_bytes:snapshot.length,scope:'Authored synthetic structure labels; training, failure rollback and exact restoration, not search-quality generalization or performance evidence'};
await fs.writeFile(join(directory,'training.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
