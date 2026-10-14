import {call} from '../../build/crdt/causal.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let seed=104729;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n};
const expand=(nodes,frontier)=>{
 const found=new Set(),stack=[...frontier];
 while(stack.length){const v=stack.pop();if(found.has(v))continue;found.add(v);stack.push(...nodes[v-1]);}
 return found;
};
const ranges=xs=>xs.flatMap(r=>Array.from({length:r.end-r.start},(_,i)=>r.start+i)).sort((a,b)=>a-b);
let queries=0;
for(let trial=0;trial<3000;trial++){
 const n=1+rnd(180),nodes=[];
 for(let i=0;i<n;i++){
  const parents=i===0?[]:rnd(3)===0?Array.from({length:rnd(4)},()=>1+rnd(i)):[i];nodes.push(parents);
 }
 const left=Array.from({length:rnd(5)},()=>1+rnd(n)),right=Array.from({length:rnd(5)},()=>1+rnd(n));
 const a=expand(nodes,left),b=expand(nodes,right),got=call('diff',[nodes,left,right]);
 assert.equal(got.valid,true);assert.deepEqual(ranges(got.removed),[...a].filter(v=>!b.has(v)).sort((a,b)=>a-b));
 assert.deepEqual(ranges(got.added),[...b].filter(v=>!a.has(v)).sort((a,b)=>a-b));queries++;
}
const chain=Array.from({length:10000},(_,i)=>i===0?[]:[i]);
assert.deepEqual(call('diff',[chain,[10000],[9999]]),{removed:[{start:10000,end:10001}],added:[],valid:true});
assert.equal(call('diff',[[[1]],[],[]]).valid,false);
assert.equal(call('diff',[[[]],[2],[]]).valid,false);
await fs.writeFile('build/crdt/causal-tests.json',JSON.stringify({seed:104729,queries,longChain:10000,oracle:'Independent transitive-closure set difference; range order and multiplicities checked'},null,2)+'\n');console.log({queries,longChain:10000});
