import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as intervals from '../../build/crdt/intervals.mjs';import * as weighted from '../../build/crdt/weighted.mjs';
let seed=67001;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;};let intervalQueries=0,weightedQueries=0;
for(let trial=0;trial<1000;trial++){
 let start=trial%2?1n<<63n:0n;const rows=[];for(let i=0,n=1+rnd(90);i<n;i++){start+=BigInt(rnd(4));const end=start+BigInt(1+rnd(8));rows.push({start,end,value:i+1});start=end+1n;}
 const keys=Array.from({length:100},()=>rows[rnd(rows.length)].start+BigInt(rnd(13))-1n).filter(x=>x>=0n);
 const order=rows.slice();for(let i=order.length-1;i>0;i--){const j=rnd(i+1);[order[i],order[j]]=[order[j],order[i]];}
 assert.equal(intervals.call('valid',[order]),true);assert.deepEqual(intervals.call('lookup',[order,keys]),keys.map(k=>rows.find(r=>k>=r.start&&k<r.end)?.value??0));intervalQueries+=keys.length;
}
const max=(1n<<64n)-1n;assert.equal(intervals.call('valid',[[{start:max,end:0n,value:1}]]),true);assert.deepEqual(intervals.call('lookup',[[{start:max,end:0n,value:1}],[max-1n,max]]),[0,1]);
for(const rows of [[{start:5n,end:10n,value:1},{start:8n,end:15n,value:2}],[{start:10n,end:5n,value:1}],[{start:0n,end:0n,value:1},{start:5n,end:8n,value:2}],[{start:0n,end:1n,value:0}]])assert.equal(intervals.call('valid',[rows]),false);
for(let trial=0;trial<1000;trial++){
 const items=Array.from({length:1+rnd(90)},(_,i)=>{const extent=rnd(9);return{value:i+1,extent,weight:rnd(4)===0?0:extent};});
 for(const visible of [false,true]){const want=[];for(const item of items)for(let offset=0,n=visible?item.weight:item.extent;offset<n;offset++)want.push({value:item.value,offset});const positions=Array.from({length:100},()=>rnd(want.length+20));assert.deepEqual(weighted.call('lookup',[items,positions,visible]),positions.map(p=>want[p]??{value:0,offset:0}));weightedQueries+=positions.length;}
}
const report={seed:67001,intervalQueries,weightedQueries,edgeCases:['u64 maximum key','overlap rejection','zero-extent spans','zero live weights','out-of-range positions']};await fs.writeFile('build/crdt/range-library-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
