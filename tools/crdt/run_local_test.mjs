import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as runs from '../../build/crdt/runs.mjs';import * as baseline from '../../build/crdt/reference.mjs';
let seed=67961;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;};let edits=0,checks=0;
for(let mode=0;mode<4;mode++)for(let trial=0;trial<150;trial++){
 const history=[],plain=[];for(let i=0;i<100;i++){const position=rnd(plain.length+1),remove=rnd(Math.min(plain.length-position,4)+1),text=Array.from({length:rnd(5)},()=>[97+rnd(26),233,30000,128578][rnd(4)]);history.push({position,remove,text});plain.splice(position,remove,...text);}
 const actual=runs.call('local',[history,mode]),want=baseline.call('local',[history,mode]);assert.deepEqual(actual,want,`run local mode ${mode} trial ${trial}`);assert.ok(actual.Ok);assert.deepEqual(actual.Ok.filter(x=>!x.deleted).map(x=>x.value),plain);checks++;edits+=history.length;
}
for(let mode=0;mode<4;mode++)for(const history of [[{position:1,remove:0,text:[97]}],[{position:0,remove:1,text:[]}],[{position:0,remove:0,text:[0xd800]},{position:4,remove:0,text:[97]}]]){assert.deepEqual(runs.call('local',[history,mode]),baseline.call('local',[history,mode]));checks++;}
const report={seed:67961,edits,checks,scope:'Full atom/metadata parity for valid local edits, BMP/astral Unicode, mixed insert/delete patches and first-error retention'};await fs.writeFile('build/crdt/run-local-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
