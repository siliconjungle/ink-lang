import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const program=await import(pathToFileURL(root+'/build/persistent-crdt-parity/program.mjs'));
const rows=JSON.parse(await fs.readFile(root+'/build/crdt/parity-cases.json','utf8'));
const operation=o=>({...o,atom:{...o.atom,id:BigInt(o.atom.id),left:BigInt(o.atom.left),right:BigInt(o.atom.right),stamp:BigInt(o.atom.stamp)},target:BigInt(o.target)});
let checkpoints=0,merges=0;
for(const row of rows){
 const operations=row.ops.map(operation),expected=row.expected.map(a=>({...a,id:BigInt(a.id),left:BigInt(a.left),right:BigInt(a.right),stamp:BigInt(a.stamp)}));
 for(let split=0;split<=operations.length;split++){
  const state=program.createState();assert.equal(state.invoke('initialise',[row.mode]).committed,true);
  assert.equal(state.invoke('merge',[operations.slice(0,split)]).committed,true);merges++;
  const before=state.invoke('logical',[]).result,bytes=await state.checkpoint();
  const loaded=program.createState();await loaded.restore(bytes);
  assert.deepEqual(loaded.invoke('logical',[]).result,before);assert.deepEqual(await loaded.checkpoint(),bytes);checkpoints++;
  assert.equal(loaded.invoke('merge',[operations.slice(split)]).committed,true);merges++;
  assert.deepEqual(loaded.invoke('logical',[]).result.atoms,expected,'mode '+row.mode+' split '+split);
  assert.deepEqual(loaded.invoke('visible',[]).result,expected.filter(a=>!a.deleted).map(a=>a.value));
 }
}
const report={histories:rows.length,checkpoints,merges,modes:[0,1,2,3],oracle:'Cached pinned upstream reference histories, full atom metadata plus visible text',scope:'Every operation boundary restored into a fresh JS state, then remaining operations merged; no performance or universal convergence claim'};
await fs.writeFile(root+'/build/crdt/persistent-atoms-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
