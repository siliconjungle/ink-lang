import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [modulePath,casesPath,outputPath]=process.argv.slice(2);
if(!modulePath||!casesPath||!outputPath)throw Error('module, cases and output paths required');
const bytes=await fs.readFile(casesPath),moduleBytes=await fs.readFile(modulePath);
const program=await import(pathToFileURL(modulePath));const cases=JSON.parse(bytes.toString(),(key,value,context)=>typeof value==='number' && !Number.isSafeInteger(value)?BigInt(context.source):value);let checkpoints=0,merges=0;
for(const row of cases){
 const changes=row.changes.map(c=>({...c,id:BigInt(c.id),parents:c.parents.map(p=>BigInt(p))}));
 for(const split of [...new Set([0,1,Math.floor(changes.length/2),changes.length])]){
  const state=program.createState();assert.equal(state.invoke('merge',[changes.slice(0,split)]).committed,true,row.name);merges++;
  const snapshot=await state.checkpoint(),loaded=program.createState();await loaded.restore(snapshot);checkpoints++;
  assert.deepEqual(await loaded.checkpoint(),snapshot);
  assert.deepEqual(loaded.invoke('history',[]).result,changes.slice(0,split));
  assert.equal(loaded.invoke('merge',[changes.slice(split)]).committed,true,row.name);merges++;
  assert.deepEqual(loaded.invoke('visible',[]).result.Ok,row.expected,row.name+' split '+split);
  assert.deepEqual(loaded.invoke('history',[]).result,changes);
  const before=loaded.invoke('visible',[]).result;assert.equal(loaded.invoke('merge',[changes]).committed,true);merges++;
  assert.deepEqual(loaded.invoke('visible',[]).result,before,'duplicate batch visible idempotency');
  assert.deepEqual(loaded.invoke('history',[]).result,changes,'duplicate batch history idempotency');
 }
}
const sha=x=>createHash('sha256').update(x).digest('hex');
const report={histories:cases.length,checkpoints,merges,module_sha256:sha(moduleBytes),input_sha256:sha(bytes),scope:'Full supplied independent expected text and exact retained operation history after fresh-instance restore and subsequent concurrent merges; duplicate delivery idempotency; no timing or universal proof claim'};
await fs.writeFile(outputPath,JSON.stringify(report,null,2)+'\n');console.log(report);
