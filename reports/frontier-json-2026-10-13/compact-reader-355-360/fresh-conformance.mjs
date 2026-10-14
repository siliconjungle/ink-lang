import assert from 'node:assert/strict';
import * as ink from './fresh-candidate.mjs';
const json=new ink.JsonCodec(ink.valueCodecs.identity.result),publicCodec=json.values.compact(),privateCodec=ink.compiledValues.identity.params[0];
const outcome=fn=>{try{fn();return 'ok';}catch(e){return e.name+':'+e.message;}};
let checks=0;
for(const text of ['null','true','false','-0','1.2300e+1000','"雪😀"','[]','{}','[null,true,0,"x",[],{}]','{"__proto__":{"a":[1,-0,"雪"]},"unknown":false}']){
 const value=json.parse(text),bytes=publicCodec.encode(value),h=privateCodec.decodeCompact(bytes);
 assert.deepEqual(privateCodec.encodeCompact(h),bytes);assert.equal(json.stringifyCompiled(privateCodec,h),text);checks+=2;
 for(const limits of [{nodes:0},{nodes:1},{nodes:8},{depth:0},{depth:1},{depth:3},{bytes:0},{bytes:bytes.length-1},{}]){assert.equal(outcome(()=>privateCodec.decodeCompact(bytes,limits)),outcome(()=>publicCodec.decode(bytes,limits)));checks++;}
 for(let i=0;i<bytes.length;i++){const bad=bytes.slice();bad[i]^=255;assert.equal(outcome(()=>privateCodec.decodeCompact(bad)),outcome(()=>publicCodec.decode(bad)));assert.equal(outcome(()=>privateCodec.decodeCompact(bytes.subarray(0,i))),outcome(()=>publicCodec.decode(bytes.subarray(0,i))));checks+=2;}
}
console.log('Fresh emitted compact reader conformance:',checks,'checks passed');
