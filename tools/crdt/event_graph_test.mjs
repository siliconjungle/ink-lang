import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),base=root+'/build/crdt/upstreams/eg-walker-reference/dist/src/';
const source=await fs.readFile(base+'index.js','utf8');
const plain='rightParent = (nextItem.originLeft === originLeft) ? nextItem.opId : -1;';
assert.ok(source.includes(plain));
// The upstream reference defaults to Fugue. Its documented FugueMax option
// changes exactly this line. Keep the original source and name the variant.
const maximal=source.replace(plain,'rightParent = nextItem.opId;');
await fs.writeFile(base+'fuguemax-test-variant.js',maximal);
const ref=await import(pathToFileURL(base+'fuguemax-test-variant.js'));
const ink=await import(pathToFileURL(root+'/build/crdt/event-graph.mjs'));
const encoded=([agent,seq])=>(BigInt(agent.charCodeAt(0)-96)<<32n)|BigInt(seq+1);
let seed=104729;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n};
let histories=0,eventsChecked=0;const fixtures=[];
for(let trial=0;trial<400;trial++){
 const peers=Array.from({length:3+rnd(3)},(_,i)=>({agent:String.fromCharCode(97+i),log:ref.createOpLog(),known:new Set()}));
 const events=[],global=ref.createOpLog();
 for(let step=0;step<50;step++){
  const peer=peers[rnd(peers.length)];
  if(rnd(4)===0){const other=peers[rnd(peers.length)];ref.mergeOplogInto(peer.log,other.log);for(const k of other.known)peer.known.add(k);}
  else{
   const text=ref.checkoutSimple(peer.log);const insert=text.length===0||rnd(4)!==0;
   const position=rnd(text.length+(insert?1:0)),value=97+rnd(26);
   const parents=ref.getLatestVersion(peer.log);const old=peer.log.cg.agentToVersion[peer.agent];
   const seq=old==null?0:old.at(-1).seqEnd;
   if(insert)ref.localInsert(peer.log,peer.agent,position,value);else ref.localDelete(peer.log,peer.agent,position);
   ref.pushOp(global,[peer.agent,seq],parents,insert?'ins':'del',position,insert?value:undefined);
   events.push({id:encoded([peer.agent,seq]),parents:parents.map(encoded),position,insert,value});
   peer.known.add(events.length-1);eventsChecked++;
  }
 }
 const want=ref.checkoutSimple(global);
 const walked=ink.call('walked',[events]);const selected=ink.call('materialize',[events]);
 if(!walked.Ok||!selected.Ok){await fs.writeFile('build/crdt/event-graph-failure.json',JSON.stringify({trial,events,want,walked,selected},(_,x)=>typeof x==='bigint'?Number(x):x));}
 assert.deepEqual(walked,{Ok:want},`walked trial ${trial}`);assert.deepEqual(selected,{Ok:want},`materialize trial ${trial}`);
 if(trial<12)fixtures.push({events,expected:want});histories++;
}
// Every valid linear history exercises both the generic fast path and the full
// retreat/advance implementation, with exactly the same complete text output.
for(let trial=0;trial<100;trial++){
 const events=[],text=[];let previous=0n;
 for(let i=0;i<100;i++){
  const insert=text.length===0||rnd(3)!==0;const position=rnd(text.length+(insert?1:0)),value=97+rnd(26),id=(1n<<32n)|BigInt(i+1);
  events.push({id,parents:previous===0n?[]:[previous],position,insert,value});previous=id;
  text.splice(position,insert?0:1,...(insert?[value]:[]));
 }
 assert.deepEqual(ink.call('walked',[events]),{Ok:text});assert.deepEqual(ink.call('materialize',[events]),{Ok:text});eventsChecked+=events.length;histories++;
}
const report={seed:104729,histories,eventsChecked,oracle:'Pinned eg-walker-reference with its explicitly documented FugueMax right-parent option; original default Fugue source retained'};
await fs.writeFile('build/crdt/event-graph-tests.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile('build/crdt/event-graph-fixtures.json',JSON.stringify(fixtures,(_,x)=>typeof x==='bigint'?Number(x):x)+'\n');console.log(report);
