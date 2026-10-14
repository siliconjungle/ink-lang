import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as c from '../../build/crdt/interval-insert-hint.mjs';
let seed=65272;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;};
for(let trial=0;trial<600;trial++){
 let rows=Array.from({length:1+rnd(220)},(_,i)=>({start:BigInt(i*20),end:BigInt(i*20+10),value:i+1,hint:0}));
 if(trial%3)for(let i=rows.length-1;i;i--){const j=rnd(i+1);[rows[i],rows[j]]=[rows[j],rows[i]];}
 const prior=[];for(let i=0;i<rows.length;i++){const before=prior.filter(r=>r.start<rows[i].start).sort((a,b)=>a.start<b.start?-1:1).at(-1);rows[i].hint=trial%4===0?rnd(rows.length+10):before?.slot??0;prior.push({...rows[i],slot:i+1});}
 if(trial%5===0)rows.push({...rows[rnd(rows.length)],value:999,hint:rnd(rows.length+5)});
 assert.deepEqual(c.call('image',[rows,true]),c.call('image',[rows,false]),`trial ${trial}`);
}
const max=(1n<<64n)-1n;
for(const rows of [[{start:max-2n,end:max-1n,value:1,hint:0},{start:max,end:0n,value:2,hint:1}],[{start:0n,end:0n,value:1,hint:0},{start:4n,end:9n,value:2,hint:1}],[{start:3n,end:4n,value:0,hint:999}]])assert.deepEqual(c.call('image',[rows,true]),c.call('image',[rows,false]));
const report={seed:65272,histories:603,scope:'Exact maintained treap images, arbitrary/stale/valid hints, overlap and maximum endpoint; no malformed-tree equivalence proof'};await fs.writeFile('build/crdt/interval-insert-hint-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
