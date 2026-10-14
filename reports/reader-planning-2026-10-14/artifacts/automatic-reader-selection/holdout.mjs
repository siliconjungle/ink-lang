import assert from 'node:assert/strict';
import * as selected from './selected.mjs';import * as baseline from './baseline.mjs';
for(let seed=1;seed<=24;seed++){
 const packet={label:'heldout '+seed+' 雪',values:Array.from({length:seed*7},(_,i)=>(Math.imul(i+seed,0x9e3779b1))>>>0)};
 for(const compact of [false,true]){
  const codecs=baseline.valueCodecs.copy,codec=compact?codecs.arguments.compact():codecs.arguments,bytes=codec.encode({packet}),saved=bytes.slice(),call=compact?'callCompact':'callBinary';
  const actual=selected[call]('copy',bytes),expected=baseline[call]('copy',bytes);
  assert.deepEqual(actual,expected);assert.deepEqual(bytes,saved);
  assert.deepEqual((compact?codecs.result.compact():codecs.result).decode(actual),packet);
 }
}
console.log('48 heldout encoded calls preserve exact complete outputs and input bytes');
