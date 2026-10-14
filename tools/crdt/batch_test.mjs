import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import * as batches from '../../build/crdt/batched-graph.mjs';import * as graph from '../../build/crdt/compact-graph.mjs';
import * as ref from '../../build/crdt/upstreams/eg-walker-reference/dist/src/fuguemax-test-variant.js';
let seed=68917;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;};const id=([actor,seq])=>(BigInt(actor.charCodeAt(0)-96)<<32n)|BigInt(seq+1);let events=0,checks=0;
for(let trial=0;trial<200;trial++){
 const peers=Array.from({length:3+rnd(3)},(_,i)=>({actor:String.fromCharCode(97+i),log:ref.createOpLog()}));const global=ref.createOpLog(),changes=[],expectedEvents=[];
 for(let step=0;step<50;step++){
  const peer=peers[rnd(peers.length)];if(rnd(4)===0){ref.mergeOplogInto(peer.log,peers[rnd(peers.length)].log);continue;}
  const before=ref.checkoutSimple(peer.log),position=rnd(before.length+1),remove=rnd(Math.min(3,before.length-position)+1);let text=Array.from({length:rnd(5)},()=>[97+rnd(26),233,30000,128578][rnd(4)]);if(remove===0&&text.length===0)text=[97];
  const parents=ref.getLatestVersion(peer.log),old=peer.log.cg.agentToVersion[peer.actor],seq=old==null?0:old.at(-1).seqEnd;
  changes.push({id:id([peer.actor,seq]),parents:parents.map(id),position,remove,text});
  for(let i=0;i<remove+text.length;i++){
   const parents=ref.getLatestVersion(peer.log),insert=i>=remove,value=insert?text[i-remove]:0,pos=position+(insert?i-remove:0);
   if(insert)ref.localInsert(peer.log,peer.actor,pos,value);else ref.localDelete(peer.log,peer.actor,pos);
   ref.pushOp(global,[peer.actor,seq+i],parents,insert?'ins':'del',pos,insert?value:undefined);
   expectedEvents.push({id:id([peer.actor,seq+i]),parents:parents.map(id),position:pos,insert,value});
  }
 }
 const want=ref.checkoutSimple(global);assert.deepEqual(batches.call('expand',[changes]),expectedEvents);assert.deepEqual(batches.call('materialize',[changes]),{Ok:want},`batch history ${trial}`);checks+=2;events+=expectedEvents.length;
}
for(let trial=0;trial<100;trial++){
 const changes=[],plain=[];let next=(1n<<32n)|1n;for(let i=0;i<100;i++){const position=rnd(plain.length+1),remove=rnd(Math.min(3,plain.length-position)+1);let text=Array.from({length:rnd(5)},()=>97+rnd(26));if(!remove&&!text.length)text=[233];const previous=next-1n;changes.push({id:next,parents:changes.length?[previous]:[],position,remove,text});next+=BigInt(remove+text.length);plain.splice(position,remove,...text);}
 assert.deepEqual(batches.call('materialize',[changes]),{Ok:plain});assert.deepEqual(graph.call('walked',[batches.call('expand',[changes])]),{Ok:plain});checks+=2;
}
const invalid=graph.call('walked',[[{id:0n,parents:[],position:0,insert:true,value:97}]]);
for(const change of [{id:4294967297n,parents:[],position:0,remove:0,text:[]},{id:4294967297n,parents:[],position:1,remove:0,text:[97]},{id:4294967297n,parents:[],position:0,remove:0,text:[0xd800]},{id:8589934591n,parents:[],position:0,remove:0,text:[97,98]}])assert.deepEqual(batches.call('materialize',[[change]]),invalid);
const report={seed:68917,histories:300,checks,concurrentAtomicEvents:events,scope:'Exact atomic expansion, causal-parent chains, independent FugueMax text oracle, linear fast path, Unicode and invalid range/codepoint checks'};await fs.writeFile('build/crdt/batch-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
