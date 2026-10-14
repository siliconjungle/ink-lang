import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as candidate from '../../build/crdt/interval-bst-insert.mjs';
let seed=510782;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;};
let histories=0,queries=0;
for(let trial=0;trial<600;trial++){
 let start=trial%2?1n<<63n:0n;const rows=[];
 for(let i=0,n=1+rnd(110);i<n;i++){start+=BigInt(rnd(4));let end=start+BigInt(1+rnd(8));rows.push({start,end,value:i+1});start=end+1n;}
 for(let i=rows.length-1;i>0;i--){const j=rnd(i+1);[rows[i],rows[j]]=[rows[j],rows[i]];}
 if(trial%3===0)rows.push({...rows[rnd(rows.length)],value:999});
 if(trial%7===0)rows.push({start:100n,end:99n,value:999});
 assert.deepEqual(candidate.call('image',[rows,true]),candidate.call('image',[rows,false]));
 const keys=Array.from({length:60},()=>rows[rnd(rows.length)].start+BigInt(rnd(10)));
 assert.deepEqual(candidate.call('values',[rows,keys,true]),candidate.call('values',[rows,keys,false]));histories++;queries+=keys.length;
}
const max=(1n<<64n)-1n;
for(const rows of [[{start:max,end:0n,value:1}],[{start:0n,end:0n,value:1},{start:5n,end:9n,value:2}],[{start:0n,end:1n,value:0}]]){
 assert.deepEqual(candidate.call('image',[rows,true]),candidate.call('image',[rows,false]));histories++;
}
const result={seed:510782,histories,queries,scope:'Maintained constructor histories, exact node images/root/valid and lookups; not arbitrary malformed BST equivalence'};
await fs.writeFile('build/crdt/interval-bst-tests.json',JSON.stringify(result,null,2)+'\n');console.log(result);
