import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const m=await import(pathToFileURL(resolve(process.argv[2]))),entry=m.compiledValues.copy;
const values=[0n,0x8000000000000000n,1n,0x3ff0000000000001n,0x7ff0000000001234n,0xfff8000000005678n,0xffffffffffffffffn];
let calls=0;
let reads=0;entry.params[0].capture({get F64Bits(){assert.equal(++reads,1);return '1';}});assert.equal(reads,1);
for(const bits of values){
 const value={F64Bits:bits.toString()},handle=entry.params[0].capture(value);value.F64Bits='0';
 const expected={F64Bits:bits.toString()},result=m.callCompiled('copy',[handle]);assert.deepEqual(entry.result.materialize(result),expected);
 const token=m.prepareCompiled('copy',[[0,handle]]);assert.deepEqual(entry.result.materialize(m.callPreparedCompiled(token,[])),expected);
 for(const compact of [false,true]){
  const bytes=compact?entry.result.encodeCompact(result):entry.result.encode(result),restored=compact?entry.result.decodeCompact(bytes):entry.result.decode(bytes);
  assert.deepEqual(entry.result.materialize(restored),expected);
 }
 const publicValue=m.call('copy',[expected]);
 const scratch=new DataView(new ArrayBuffer(8));
 const outputBits=typeof publicValue==='number'?(scratch.setFloat64(0,publicValue,true),scratch.getBigUint64(0,true)):BigInt(publicValue.F64Bits);
 assert.equal(outputBits,bits);
 const c=m.valueCodecs.copy,wire=c.arguments.encode({value:expected});assert.deepEqual(c.result.decode(m.callBinary('copy',wire)),expected);
 const detached=entry.result.materialize(result);detached.F64Bits='0';assert.deepEqual(entry.result.materialize(result),expected);
 calls+=7;
}
for(const value of [NaN,Infinity,{F64Bits:1},{F64Bits:'01'},{F64Bits:'18446744073709551616'},{F64Bits:'0',extra:1}])assert.throws(()=>entry.params[0].capture(value));
const c=m.compiledValues.ratio,x=c.params[0].capture(3),token=m.prepareCompiled('ratio',[[0,x]]);
for(const y of [2,4,0,-0]){
 const h=c.params[1].capture(y),result=m.callPreparedCompiled(token,[h]);
 assert.deepEqual(c.result.encode(result),c.result.encode(m.callCompiled('ratio',[x,h])));calls++;
}
assert.equal(m.call('rounded',[100000000.5]),100000000);
assert.equal(m.call('rounded',[100000001.5]),100000002);
assert.deepEqual(m.call('widen',[0.1]),Math.fround(0.1));
assert.deepEqual(m.call('narrow',[1.0000000000000002]),1);
assert.deepEqual(m.call('halves',[[1,2,3]]),[0.5,1,1.5]);
const destination=new Array(3);assert.equal(m.callInto('halves',[[1,2,3]],destination),3);assert.deepEqual(destination,[0.5,1,1.5]);
console.log(JSON.stringify({calls,binary64:true,rawPayloads:true,sealedAndPrepared:true,pureNativeFloatLane:true}));
