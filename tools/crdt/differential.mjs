import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const ink=await import(pathToFileURL(root+'/build/crdt/reference.mjs'));
const runs=process.argv.includes('--runs')?await import(pathToFileURL(root+'/build/crdt/runs.mjs')):null;
const ref=await import(pathToFileURL(root+'/build/crdt/upstreams/reference-crdts/dist/crdts.js'));
const {FugueMaxSimple}=await import(pathToFileURL(root+'/build/crdt/upstreams/reference-crdts/dist/fugue-max-simple.js'));
const {ListFugueSimple}=await import(pathToFileURL(root+'/build/crdt/upstreams/reference-crdts/dist/list-fugue-simple.js'));
let seed=104729;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)%n;};
const agentId=id=>BigInt(id.charCodeAt(0)-96);
const id=x=>x==null?0n:(agentId(x[0])<<32n)|BigInt(x[1]+1);
const atom=x=>({id:id(x.id),left:id(x.originLeft),right:id(x.originRight),stamp:BigInt(x.seq),value:x.content,deleted:x.isDeleted});
const zero={id:0n,left:0n,right:0n,stamp:0n,value:0,deleted:true};
let checks=0,events=0;const cases=[];
for(let mode=0;mode<4;mode++)for(let trial=0;trial<300;trial++){
 const alg=[ref.yjsMod,ref.yjs,ref.automerge,ref.fugue][mode];
 // Reverse actors for the upstream RGA demo: its actor tie is deliberately
 // opposite to production Automerge, while Ink keeps the production ordering.
 const peers=Array.from({length:3+rnd(3)},(_,i)=>{
  const name=String.fromCharCode(97+i);
  return {name,r:ref.newDoc(),d:{atoms:[],deletes:[]},known:new Set(),
   tree:mode===0?new FugueMaxSimple(name):mode===3?new ListFugueSimple(name):null};
 });
 const history=[];
 function compare(p){
  const want=p.r.content.map(atom);if(mode===2)want.forEach(x=>{x.id=((7n-(x.id>>32n))<<32n)|(x.id&0xffffffffn);x.left=x.left===0n?0n:((7n-(x.left>>32n))<<32n)|(x.left&0xffffffffn);x.right=x.right===0n?0n:((7n-(x.right>>32n))<<32n)|(x.right&0xffffffffn);});
  assert.deepEqual(p.d.atoms,want,`mode=${mode} trial=${trial}`);
  if(p.tree)assert.deepEqual(p.d.atoms.filter(x=>!x.deleted).map(x=>x.value),[...p.tree.values()],`independent tree mode=${mode} trial=${trial}`);
  checks++;
 }
 function deliver(p,op){
  if(op.insert){
   if(!p.r.content.some(x=>id(x.id)===id(op.raw.id)))alg.integrate(p.r,{...op.raw});
  }else{
   const target=p.r.content.find(x=>id(x.id)===op.rawTarget);
   if(target&&!target.isDeleted){target.isDeleted=true;p.r.length--;}
  }
  const got=ink.call('receive',[p.d,op.wire,mode]);assert.ok(got.Ok,`receive failed mode=${mode} trial=${trial}`);p.d=got.Ok;
 }
 for(let n=0;n<60;n++){
  const p=peers[rnd(peers.length)];
  if(rnd(4)===0){
   const other=peers[rnd(peers.length)];
   for(let j=0;j<history.length;j++)if(other.known.has(j)&&!p.known.has(j)){deliver(p,history[j]);p.known.add(j);}
   if(p.tree)p.tree.mergeFrom(other.tree);
  }else{
   const pos=rnd(p.r.length+1);let op;
   if(p.r.length&&rnd(5)===0){
    const delpos=Math.min(pos,p.r.length-1);const target=p.r.content.filter(x=>!x.isDeleted)[delpos];
    ref.localDelete(p.r,p.name,delpos);if(p.tree)p.tree.delete(delpos);
    let targetId=id(target.id);if(mode===2)targetId=((7n-(targetId>>32n))<<32n)|(targetId&0xffffffffn);
    op={insert:false,rawTarget:id(target.id),wire:{insert:false,atom:zero,target:targetId}};
   }else{
    const value=97+rnd(26);
    if(mode===0||mode===3){
     // Canonical Fugue generation anchors immediately after the preceding
     // visible atom, before any intervening tombstones. The upstream list
     // demo's localInsert uses another convention and does not test deletes.
     const left=pos===0?null:p.r.content.filter(x=>!x.isDeleted)[pos-1];
     const index=left==null?-1:p.r.content.indexOf(left);
     const raw={content:value,id:[p.name,(p.r.version[p.name]??-1)+1],isDeleted:false,
      originLeft:left?.id??null,originRight:p.r.content[index+1]?.id??null,
      insertAfter:true,seq:p.r.maxSeq+1};
     alg.integrate(p.r,raw);
    }else alg.localInsert(p.r,p.name,pos,value);
    if(p.tree)p.tree.insert(pos,value);
    const item=p.r.content.find(x=>x.id[0]===p.name&&x.id[1]===p.r.version[p.name]);
    const a=atom(item);if(mode===2){a.id=((7n-(a.id>>32n))<<32n)|(a.id&0xffffffffn);a.left=a.left===0n?0n:((7n-(a.left>>32n))<<32n)|(a.left&0xffffffffn);a.right=a.right===0n?0n:((7n-(a.right>>32n))<<32n)|(a.right&0xffffffffn);}
    op={insert:true,raw:{...item},wire:{insert:true,atom:a,target:0n}};
   }
   const got=ink.call('receive',[p.d,op.wire,mode]);assert.ok(got.Ok);p.d=got.Ok;
   p.known.add(history.length);history.push(op);events++;
  }
  for(const peer of peers)compare(peer);
 }
 for(const p of peers){for(let j=0;j<history.length;j++)if(!p.known.has(j)){deliver(p,history[j]);p.known.add(j);}}
 const want=peers[0].d.atoms;for(const p of peers)assert.deepEqual(p.d.atoms,want);
 const indexed=ink.call('indexed_replay',[history.map(x=>x.wire),mode]);
 assert.deepEqual(indexed,{Ok:want},`indexed refinement mode=${mode} trial=${trial}`);checks++;
 if(runs){const got=runs.call('replay',[history.map(x=>x.wire),mode]);
  if(!got.Ok||JSON.stringify(got,(_,x)=>typeof x==='bigint'?x.toString():x)!==JSON.stringify({Ok:want},(_,x)=>typeof x==='bigint'?x.toString():x))await fs.writeFile(root+'/build/crdt/run-failure.json',JSON.stringify({mode,trial,ops:history.map(x=>x.wire),want,got},(_,x)=>typeof x==='bigint'?Number(x):x));
  assert.deepEqual(got,{Ok:want},`run refinement mode=${mode} trial=${trial}`);checks++;
 }
 if(trial<5)cases.push({mode,ops:history.map(x=>x.wire),expected:want});
}
await fs.writeFile(root+'/build/crdt/'+(runs?'run-differential.json':'differential.json'),JSON.stringify({seed:104729,trials:1200,stepsPerTrial:60,checks,events},null,2)+'\n');
await fs.writeFile(root+'/build/crdt/parity-cases.json',JSON.stringify(cases,(_,v)=>typeof v==='bigint'?Number(v):v)+'\n');
console.log({checks,events,trials:1200});
