import {call} from '../../build/crdt/sequence.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let seed=104729;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)%n;};
let editsChecked=0,observations=0;
for(let trial=0;trial<250;trial++){
 const expected=[],edits=[];
 for(let step=0;step<400;step++){
  const remove=expected.length>0&&rnd(3)===0;
  const position=rnd(expected.length+(remove?0:1));const value=rnd(0x10ffff);
  edits.push({position,value,remove});expected.splice(position,remove?1:0,...(remove?[]:[value]));
  if(step%20===0){assert.deepEqual(call('edited',[edits]),expected);observations++;}
 }
 assert.deepEqual(call('edited',[edits]),expected);observations++;editsChecked+=edits.length;
}
const report={seed:104729,trials:250,editsChecked,observations};
await fs.writeFile('build/crdt/sequence-tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
