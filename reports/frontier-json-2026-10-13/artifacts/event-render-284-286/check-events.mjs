import assert from 'node:assert/strict';
import * as baseline from './baseline-events.mjs';import * as flat from './flat-events.mjs';
const samples=['null','true','false','0','-0','1.2300e+1000','999999999999999999999999999999999999','"雪\\u0000😀"','[]','{}','[null,true,0,"x",[],{}]','{"__proto__":{"0":[1,-0,"雪"]},"unknown":false}'];
const outcome=f=>{try{return {value:f()};}catch(e){return {error:e.message};}};
for(const module of [baseline,flat]){
 const codec=module.compiledValues.identity.params[0],json=new module.JsonCodec(module.valueCodecs.identity.result);
 assert.ok(Object.isFrozen(codec.descriptor));
 for(const text of samples){const h=json.parseCompiled(codec,text),expected=json.parse(text);assert.deepEqual(codec.materialize(h),expected);assert.equal(json.stringifyCompiled(codec,h),json.stringify(expected));assert.deepEqual(codec.encode(h),json.values.encode(expected));assert.deepEqual(codec.encodeCompact(h),json.values.compact().encode(expected));const result=module.callCompiled('identity',[h]);assert.equal(json.stringify(codec.materialize(result)),json.stringify(expected));
  for(const limits of [{nodes:0},{nodes:1},{nodes:3},{nodes:8},{depth:0},{depth:3},{bytes:40},{bytes:100},{}]){
   const a=outcome(()=>json.parseCompiled(codec,text,limits)&&true),b=outcome(()=>codec.capture(json.parse(text,limits),limits)&&true);assert.equal('value' in a,'value' in b,text+JSON.stringify(limits));
  }
 }
 for(const text of ['','nul','[1,]','{"x":1,"\\u0078":2}','"\\ud800"','{"x":}','1e','01','true false'])assert.throws(()=>json.parseCompiled(codec,text),text);
 assert.throws(()=>json.parseCompiled(module.compiledValues.set_document.params[1],'{}'),/schema mismatch/);
}
console.log('Direct constructed JSON preserves values, exact tokens/order, binary bytes, budgets and rejection policies on ordinary and flattened carriers.');
