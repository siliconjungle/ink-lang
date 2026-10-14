import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {pathToFileURL}from 'node:url';const ink=await import(pathToFileURL(process.env.INK_INTERVAL_MODULE??'build/crdt/blocked-interval.mjs'));const reportPrefix=process.env.INK_INTERVAL_REPORT??'blocked-interval';
let seed=327891;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;};let queries=0,histories=0;
function invariant(image){
 const {nodes,blocks,children,root}=image;const visited=new Set(),ordered=[];
 function walk(slot,parent,index){assert(!visited.has(slot));visited.add(slot);const b=blocks[slot];assert.equal(b.parent,parent);if(parent)assert.equal(b.index,index);assert(b.count>0&&b.count<=32);const cs=children.slice(b.start,b.start+b.count);
  if(b.leaf){for(let i=0;i<cs.length;i++){const n=nodes[cs[i]];assert.equal(n.leaf,slot);assert.equal(n.index,i);ordered.push(cs[i]);}assert.equal(b.minimum,nodes[cs[0]].start);}
  else{for(let i=0;i<cs.length;i++)walk(cs[i],slot,i);assert.equal(b.minimum,blocks[cs[0]].minimum);for(let i=1;i<cs.length;i++)assert(blocks[cs[i-1]].minimum<blocks[cs[i]].minimum);}
 }
 if(nodes.length===1){assert.equal(blocks[root].count,0);return;}
 walk(root,0,0);assert.equal(ordered.length,nodes.length-1);
 for(let i=0;i<ordered.length;i++){const n=nodes[ordered[i]];assert.equal(n.previous,ordered[i-1]??0);assert.equal(n.next,ordered[i+1]??0);if(i)assert(nodes[ordered[i-1]].end<=n.start);}
}
for(let trial=0;trial<90;trial++){
 let at=trial%2?1n<<63n:0n;let rows=[];let size=trial===0?2400:1+rnd(350);
 for(let i=0;i<size;i++){at+=BigInt(rnd(4));let end=at+BigInt(1+rnd(9));rows.push({start:at,end,value:i+1});at=end+1n;}
 const sorted=rows.slice();for(let i=rows.length-1;i>0;i--){let j=rnd(i+1);[rows[i],rows[j]]=[rows[j],rows[i]];}
 assert.equal(ink.call('valid',[rows]),true);invariant(ink.call('image',[rows]));
 const keys=Array.from({length:120},()=>sorted[rnd(sorted.length)].start+BigInt(rnd(14)));
 const want=keys.map(k=>sorted.find(r=>r.start<=k&&k<r.end)?.value??0);
 assert.deepEqual(ink.call('values',[rows,keys,true]),want);assert.deepEqual(ink.call('values',[rows,keys,false]),want);queries+=keys.length;histories++;
}
const max=(1n<<64n)-1n;assert.equal(ink.call('valid',[[{start:max,end:0n,value:1}]]),true);assert.deepEqual(ink.call('values',[[{start:max,end:0n,value:1}],[max-1n,max],true]),[0,1]);
for(const rows of [[{start:5n,end:10n,value:1},{start:8n,end:15n,value:2}],[{start:10n,end:5n,value:1}],[{start:0n,end:0n,value:1},{start:5n,end:8n,value:2}],[{start:0n,end:1n,value:0}]])assert.equal(ink.call('valid',[rows]),false);
const report={seed:327891,histories,queries,multilevelEntries:2400,scope:'Independent sorted intervals and structural invariants; maintained constructor histories only, not universal representation proof'};await fs.writeFile(`build/crdt/${reportPrefix}-tests.json`,JSON.stringify(report,null,2)+'\n');console.log(report);
let refinementQueries=0;
for(let trial=0;trial<120;trial++){
 const entries=Array.from({length:50},(_,i)=>({start:BigInt(i*100),end:BigInt(i*100+80),value:i+1}));let ranges=entries.map((x,i)=>({...x,hint:i+1}));let cuts=[];
 for(let i=0;i<70;i++){
  const eligible=ranges.filter(r=>r.end-r.start>1n);const old=eligible[rnd(eligible.length)];let boundary=old.start+1n+BigInt(rnd(Number(old.end-old.start-1n)));let suffix=entries.length+i+1;
  cuts.push({start:old.start,end:old.end,boundary,value:old.value,suffix,hint:trial%3===0?0:old.hint});
  ranges.splice(ranges.indexOf(old),1,{...old,end:boundary},{start:boundary,end:old.end,value:suffix,hint:suffix});
 }
 const keys=Array.from({length:140},()=>BigInt(rnd(5100)));const want=keys.map(k=>ranges.find(r=>r.start<=k&&k<r.end)?.value??0);
 assert.deepEqual(ink.call('refined_values',[entries,cuts,keys,true]),want);assert.deepEqual(ink.call('refined_values',[entries,cuts,keys,false]),want);refinementQueries+=keys.length;
}
const refinement={refinementHistories:120,refinementQueries,hintModes:['stable handle','fallback search']};await fs.writeFile(`build/crdt/${reportPrefix}-refinement-tests.json`,JSON.stringify(refinement,null,2)+'\n');console.log(refinement);
