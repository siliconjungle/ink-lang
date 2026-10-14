import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import * as Y from '../../build/crdt/upstreams/yjs/src/index.js';import * as ink from '../../build/crdt/reference.mjs';
const id=x=>x===null?0n:(BigInt(x.client)<<32n)|BigInt(x.clock+1);
const empty={id:0n,left:0n,right:0n,stamp:0n,value:0,deleted:true};
const visibleIds=t=>{const out=[];for(let item=t._start;item;item=item.right)if(!item.deleted){assert.ok(item.content instanceof Y.ContentString);for(let j=0;j<item.length;j++)out.push(id(Y.createID(item.id.client,item.id.clock+j)));}return out;};
let seed=64891,checks=0,edits=0;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;};
for(let trial=0;trial<160;trial++){
 const peers=Array.from({length:3+rnd(3)},(_,i)=>{const doc=new Y.Doc({gc:false});doc.clientID=i+1;return{doc,text:doc.get('text'),known:new Set()};});const operations=[];
 const check=p=>{const ops=operations.filter((_,i)=>p.known.has(i));const actual=ink.call('visible_text',[ops,1]);assert.deepEqual(actual,{Ok:[...p.text.toString()].map(c=>c.codePointAt(0))},`native Yjs trial ${trial}`);checks++;};
 for(let step=0;step<70;step++){
  const p=peers[rnd(peers.length)];
  if(rnd(4)===0){const q=peers[rnd(peers.length)];Y.applyUpdate(p.doc,Y.encodeStateAsUpdate(q.doc));for(const i of q.known)p.known.add(i);}
  else{
   const insert=p.text.length===0||rnd(4)!==0,pos=rnd(p.text.length+(insert?1:0));let op;
   if(insert){const actor=p.doc.clientID,clock=p.doc.store.getClock(actor),value=[97+rnd(26),233,30000][rnd(3)];p.text.insert(pos,String.fromCodePoint(value));const item=p.doc.store.getItem(Y.createID(actor,clock));assert.ok(item.content instanceof Y.ContentString);op={insert:true,atom:{id:id(Y.createID(actor,clock)),left:clock===item.id.clock?id(item.origin):id(Y.createID(actor,clock-1)),right:id(item.rightOrigin),stamp:0n,value,deleted:false},target:0n};}
   else{const target=visibleIds(p.text)[pos];p.text.delete(pos,1);op={insert:false,atom:empty,target};}
   operations.push(op);p.known.add(operations.length-1);edits++;
  }
  check(p);
 }
 for(const p of peers){for(const q of peers){Y.applyUpdate(p.doc,Y.encodeStateAsUpdate(q.doc));for(const i of q.known)p.known.add(i);}check(p);}for(const p of peers)p.doc.destroy();
}
const report={seed:64891,histories:160,checks,edits,oracle:'Pinned production Yjs source, gc:false, Yjs UTF-16 and Ink scalar positions coincide on this BMP corpus'};await fs.writeFile('build/crdt/yjs-native-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
