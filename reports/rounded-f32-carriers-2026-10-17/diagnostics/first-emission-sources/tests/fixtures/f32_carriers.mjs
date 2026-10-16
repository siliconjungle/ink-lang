import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as m from './program.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)));
let calls=0;
for(const c of cases){
 const entry=m.compiledValues[c.name],args=c.args.map((v,i)=>entry.params[i].capture(v));
 const expected=m.valueCodecs[c.name].result.encode(c.expected);
 assert.deepEqual(entry.result.encode(m.callCompiled(c.name,args)),expected,c.name);calls++;
 for(const bound of [[],[0]]){
  const token=m.prepareCompiled(c.name,bound.map(i=>[i,args[i]]));
  for(let repeat=0;repeat<2;repeat++){
   assert.deepEqual(entry.result.encode(m.callPreparedCompiled(token,args.filter((_,i)=>!bound.includes(i)))),expected,c.name);calls++;
  }
 }
}
// Borrowed native containers must still round at the first typed read. These
// host doubles are deliberately not all exactly representable in binary32.
const doubles=[0.1,-0.1,-1,1+2**-25,1-2**-25,2**24+1,2**-150,-(2**-150),-0,2**-149];
let nativeCalls=0;
for(const x of doubles)for(const y of doubles){
 for(const name of ['aliases','loops','records','recursive','bits']){
  const args=[x,y,3],before=structuredClone(args);
  const expected=m.call(name,args),actual=m.functions[name](...args);
  assert.deepEqual(m.valueCodecs[name].result.encode(actual),m.valueCodecs[name].result.encode(expected));
  assert.deepEqual(args,before);nativeCalls++;
 }
 const host={x,y};
 const expected=m.call('observe',[host,true]);
 assert.deepEqual(m.valueCodecs.observe.result.encode(m.functions.observe(host,true)),m.valueCodecs.observe.result.encode(expected));nativeCalls++;
}
// A contract predicate may be the only consumer of a scalar parameter. Its
// public input adapter can borrow that value; the predicate still needs a
// typed read before comparing it to zero.
assert.equal(m.functions.checked_unused(2**-150),7);
assert.equal(m.functions.checked_unused(-(2**-150)),7);
assert.throws(()=>m.functions.checked_unused(2**-149),/precondition/);
if(process.argv[2]==='native'){
 let xReads=0,yReads=0;
 const host={get x(){xReads++;return 1+2**-25;},get y(){yReads++;return -1;}};
 m.functions.observe(host,true);assert.equal(xReads,4);assert.equal(yReads,3);
 const sentinel=new Error('second read failed');let reads=0;
 const throwing={get x(){if(++reads===2)throw sentinel;return 0.1;},y:0.1};
 assert.throws(()=>m.functions.observe(throwing,true),e=>e===sentinel);assert.equal(reads,2);
}
console.log(JSON.stringify({referenceCases:cases.length,calls,nativeCalls,borrowedDoublesRounded:true,exactPayloadsAndSnapshots:true}));
