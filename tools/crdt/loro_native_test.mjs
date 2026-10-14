import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as ink from '../../build/crdt/reference.mjs';
const histories=(await fs.readFile('build/crdt/loro-oracle.jsonl','utf8')).trim().split('\n');let edits=0,checks=0;
const empty={id:0n,left:0n,right:0n,stamp:0n,value:0,deleted:true};
for(const line of histories){const h=JSON.parse(line),peers=Array.from({length:h.peers},()=>({doc:{atoms:[],deletes:[]},known:new Set(),counter:0})),ops=[];
 for(const step of h.steps){const p=peers[step.peer];if('from'in step){const q=peers[step.from];for(let i=0;i<ops.length;i++)if(q.known.has(i)&&!p.known.has(i)){const got=ink.call('receive',[p.doc,ops[i],3]);assert.ok(got.Ok);p.doc=got.Ok;p.known.add(i);}}
 else{const visible=p.doc.atoms.filter(a=>!a.deleted);let op;if(step.insert){const left=step.position===0?0n:visible[step.position-1].id;const at=left===0n?-1:p.doc.atoms.findIndex(a=>a.id===left);const right=p.doc.atoms[at+1]?.id??0n;const id=(BigInt(step.peer+1)<<32n)|BigInt(++p.counter);op={insert:true,atom:{id,left,right,stamp:0n,value:step.value,deleted:false},target:0n};}else op={insert:false,atom:empty,target:visible[step.position].id};const got=ink.call('receive',[p.doc,op,3]);assert.ok(got.Ok);p.doc=got.Ok;p.known.add(ops.length);ops.push(op);edits++;}
 assert.deepEqual(p.doc.atoms.filter(a=>!a.deleted).map(a=>a.value),[...step.text].map(c=>c.codePointAt(0)),`Loro history ${h.trial}`);checks++;
 }
}
const report={seed:65981,histories:histories.length,edits,checks,oracle:'Pinned production Loro source; public Unicode insert/delete/export/import operations; scalar Fugue generator previous-visible left and following raw right origins; BMP and astral Unicode'};await fs.writeFile('build/crdt/loro-native-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
