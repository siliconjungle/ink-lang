// Separately report complete portable snapshot sizes for retained CRDT histories.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [modulePath,casesPath,outputPath]=process.argv.slice(2);
if(!modulePath||!casesPath||!outputPath)throw Error('module, cases and output paths required');
const module=await import(pathToFileURL(modulePath));
const bytes=await fs.readFile(casesPath);const cases=JSON.parse(bytes);const rows=[];
const word=x=>BigInt(x);
for(const row of cases){
 const state=module.createState();assert.equal(state.invoke('initialise',[row.mode]).committed,true);
 const ops=row.ops.map(o=>({...o,atom:{...o.atom,id:word(o.atom.id),left:word(o.atom.left),right:word(o.atom.right),stamp:word(o.atom.stamp)},target:word(o.target)}));
 assert.equal(state.invoke('merge',[ops]).committed,true);
 const logical=state.invoke('logical',[]).result;
 const atoms=logical.Ok??logical.atoms;const expected=row.expected.map(a=>({...a,id:word(a.id),left:word(a.left),right:word(a.right),stamp:word(a.stamp)}));assert.deepEqual(atoms,expected);
 const snapshot=await state.checkpoint();const restored=module.createState();await restored.restore(snapshot);assert.deepEqual(restored.invoke('logical',[]).result,logical);
 rows.push({mode:row.mode,operations:ops.length,atoms:atoms.length,tombstones:atoms.filter(a=>a.deleted).length,portable_bytes:snapshot.length,snapshot_sha256:createHash('sha256').update(snapshot).digest('hex')});
}
await fs.writeFile(outputPath,JSON.stringify({schema:1,module_sha256:createHash('sha256').update(await fs.readFile(modulePath)).digest('hex'),cases_sha256:createHash('sha256').update(bytes).digest('hex'),rows,scope:'Exact Ink portable snapshot bytes on cached upstream histories; no native DT size, retained/peak memory, or timing comparison'},null,2)+'\n');console.log('Validated',rows.length,'snapshot sizes');
