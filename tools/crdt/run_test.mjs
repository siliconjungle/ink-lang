import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as runs from '../../build/crdt/runs.mjs';import * as reference from '../../build/crdt/reference.mjs';
const cases=JSON.parse(await fs.readFile('build/crdt/parity-cases.json','utf8'));let checks=0,events=0;
const wire=op=>({...op,target:BigInt(op.target),atom:{...op.atom,...Object.fromEntries(['id','left','right','stamp'].map(k=>[k,BigInt(op.atom[k])]))}});
for(const c of cases){const ops=c.ops.map(wire);for(let i=0;i<=ops.length;i++){const input=ops.slice(0,i);assert.deepEqual(runs.call('replay',[input,c.mode]),reference.call('indexed_replay',[input,c.mode]),`RLE mode ${c.mode} prefix ${i}`);checks++;}events+=ops.length;}
const nil={id:0n,left:0n,right:0n,stamp:0n,value:0,deleted:true};for(let mode=0;mode<4;mode++){
 const operations=[];for(let i=1;i<=6000;i++){const id=(1n<<32n)|BigInt(i);operations.push({insert:true,atom:{id,left:i===1?0n:id-1n,right:0n,stamp:BigInt(i),value:97+i%26,deleted:false},target:0n});}
 assert.equal(runs.call('run_count',[operations,mode]),1);const got=runs.call('replay',[operations,mode]);assert.ok(got.Ok);assert.deepEqual(got.Ok,operations.map(x=>x.atom));checks++;
 for(const at of [1,2900,6000]){operations.push({insert:false,atom:nil,target:(1n<<32n)|BigInt(at)});}
 assert.deepEqual(runs.call('replay',[operations,mode]),reference.call('indexed_replay',[operations,mode]));checks++;events+=operations.length;
}
const report={checks,events,scope:'Complete atoms, original origins and stamps, tombstones, scalar parity prefixes and forward-run split/coalescing'};await fs.writeFile('build/crdt/run-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
