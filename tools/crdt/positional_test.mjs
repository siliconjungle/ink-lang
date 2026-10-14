import {call} from '../../build/crdt/positional.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let seed=104729;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n};
let editsChecked=0,prefixes=0;
for(let trial=0;trial<200;trial++){
 const expected=[],edits=[],atoms=[];
 for(let i=0;i<300;i++){
  const position=rnd(expected.length+1),remove=rnd(Math.min(4,expected.length-position)+1);
  const text=Array.from({length:rnd(5)},()=>rnd(3)===0?0x1f680:97+rnd(26));
  edits.push({position,remove,text});expected.splice(position,remove,...text);
  for(let j=0;j<remove;j++)atoms.push({position,remove:1,text:[]});
  text.forEach((value,j)=>atoms.push({position:position+j,remove:0,text:[value]}));
 }
 const got=call('build',[edits]);assert.deepEqual(got.text,expected);
 const decoded=[];
 for(const run of got.history){
  assert.equal(run.events,run.remove+run.inserted);
  for(let j=0;j<run.remove;j++)decoded.push({position:run.position,remove:1,text:[]});
  for(let j=0;j<run.inserted;j++)decoded.push({position:run.position+(run.forward?j:0),remove:0,text:[got.payload[run.payload+j]]});
 }
 assert.deepEqual(decoded,atoms,'RLE must retain every atomic event and its position');
 editsChecked+=edits.length;prefixes+=atoms.length;
}
for(const pattern of ['append','prepend']){
 const edits=Array.from({length:6000},(_,i)=>({position:pattern==='append'?i:0,remove:0,text:[97+i%26]}));
 const got=call('build',[edits]);assert.equal(got.history.length,1);assert.equal(got.history[0].events,6000);
}
const report={seed:104729,trials:200,editsChecked,atomicEvents:prefixes,scope:'General sequence output and exact atomized positional-history round trips; no concurrent merge claim'};
await fs.writeFile('build/crdt/positional-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
