import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [modulePath,casesPath,outputPath]=process.argv.slice(2);
const mod=await import(pathToFileURL(modulePath));
const raw=await fs.readFile(casesPath),cases=JSON.parse(raw.toString());
let restores=0,merges=0,bytes=0;
const changes=row=>row.changes.map(c=>({...c,id:BigInt(c.id),parents:c.parents.map(BigInt)}));
for(const row of cases){const input=changes(row);
 for(const split of [...new Set([0,1,Math.floor(input.length/2),input.length])]){
  const original=mod.createState();assert(original.invoke('merge',[input.slice(0,split)]).committed);merges++;
  const packet=original.invoke('save',[]).result;assert(packet.Ok,row.name);bytes+=packet.Ok.length*4;
  const restored=mod.createState();assert(restored.invoke('load',[packet.Ok]).committed,row.name);restores++;
  assert.deepEqual(restored.invoke('history',[]).result,input.slice(0,split));
  assert.deepEqual(restored.invoke('visible',[]).result,original.invoke('visible',[]).result);
  assert(restored.invoke('merge',[input.slice(split)]).committed);merges++;
  assert.deepEqual(restored.invoke('visible',[]).result.Ok,row.expected,row.name);
  assert.deepEqual(restored.invoke('history',[]).result,input);
  assert(restored.invoke('merge',[input]).committed);merges++;
  assert.deepEqual(restored.invoke('history',[]).result,input);
  const saved=restored.invoke('save',[]).result.Ok;
  const before=await restored.checkpoint();const corrupt=[...saved];corrupt[corrupt.length-1]=(corrupt[corrupt.length-1]^1)>>>0;
  assert.equal(restored.invoke('load',[corrupt]).committed,false);
  assert.deepEqual(await restored.checkpoint(),before,'corrupt document load rollback');
  assert.deepEqual(restored.invoke('save',[]).result.Ok,saved,'canonical document encoding');
 }
}
const sha=x=>createHash('sha256').update(x).digest('hex');
const report={histories:cases.length,restores,merges,total_document_bytes:bytes,module_sha256:sha(await fs.readFile(modulePath)),input_sha256:sha(raw),scope:'Document operation-log save/load, complete accepted history and future independent expected text, duplicate delivery and corrupt-load rollback; separate from full host application checkpoint; no universal replay-invariant proof'};
await fs.writeFile(outputPath,JSON.stringify(report,null,2)+'\n');console.log(report);
