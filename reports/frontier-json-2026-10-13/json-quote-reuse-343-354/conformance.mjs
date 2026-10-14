import assert from 'node:assert/strict';
import * as flat from './candidate.mjs';
import * as ordinary from './ordinary-candidate.mjs';
for(const m of [flat,ordinary]){
 const json=new m.JsonCodec(m.valueCodecs.identity.result),codec=m.compiledValues.identity.params[0];
 const q=m.createJsonQuoter({maxEntries:8,maxBytes:256});
 const outcome=fn=>{try{return {value:fn()};}catch(e){return {error:e.message};}};
 for(const text of ['null','true','-0','1.2300e+1000','"雪😀"','[]','{}','[null,true,0,"x",[],{}]','{"__proto__":{"a":[1,-0,"雪"]},"unknown":false}','{"x":"\\n\\t\\\""}']){
  const h=json.parseCompiled(codec,text),expected=json.stringifyCompiled(codec,h);
  for(let i=0;i<3;i++)assert.equal(json.stringifyCompiled(codec,h,{quoter:q}),expected);
  for(const limits of [{nodes:0},{nodes:1},{nodes:8},{depth:0},{depth:3},{bytes:0},{bytes:40},{bytes:100},{}])assert.deepEqual(outcome(()=>json.stringifyCompiled(codec,h,{...limits,quoter:q})),outcome(()=>json.stringifyCompiled(codec,h,limits)));
  assert.ok(q.stats().entries<=8);assert.ok(q.stats().payload_bytes<=256);
 }
 const bad=json.parse('{"x":1}');let object=bad.payload;for(let i=0;i<5;i++)object=object.Err;object.item0.push(object.item0[0]);
 assert.throws(()=>json.stringifyCompiled(codec,codec.capture(bad),{quoter:q}),/duplicate/);
 assert.throws(()=>json.stringifyCompiled(codec,json.parseCompiled(codec,'{}'),{quoter:{quote(){throw Error('untrusted callback');}}}),/owner mismatch/);
 q.clear();assert.equal(q.stats().entries,0);assert.equal(q.stats().payload_bytes,0);
 const foreign=(m===flat?ordinary:flat).createJsonQuoter();assert.throws(()=>json.stringifyCompiled(codec,json.parseCompiled(codec,'{}'),{quoter:foreign}),/owner mismatch/);
}
console.log('Ordinary and composed layouts preserve exact JSON, errors, cached resource limits, duplicate rejection and cache ownership');
