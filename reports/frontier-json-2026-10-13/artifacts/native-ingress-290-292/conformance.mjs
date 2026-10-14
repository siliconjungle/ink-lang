import assert from 'node:assert/strict';
import {parseCanonical} from './native-ingress.mjs';
const outcome=fn=>{try{return {value:fn()};}catch(error){return {error:[error.constructor.name,error.message]};}};
for(const filename of ['./baseline.mjs','./flat.mjs']){
 const ink=await import(filename),codec=ink.compiledValues.identity.params[0],json=new ink.JsonCodec(ink.valueCodecs.identity.result);
 const samples=['null','false','true','-0','1.200e+1000','9007199254740993','1.0','1E3','  [1,2] ','"雪😀"','"\\ud800"','{"2":1,"1":2}','{"1":2,"2":1}','{"x":1,"x":2}','{"x":1,"\\u0078":2}','{"__proto__":true,"toJSON":"data"}','[1,]','NaN','01','true false'];
 let seed=777;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 const value=d=>d===0?['雪',null,true,123][next()%4]:next()%2?Array.from({length:next()%4},()=>value(d-1)):Object.fromEntries(Array.from({length:next()%4},(_,i)=>['x'+i,value(d-1)]));
 for(let i=0;i<100;i++)samples.push(JSON.stringify(value(1+next()%5)));
 for(const text of samples)for(const limits of [{nodes:0},{nodes:1},{nodes:8},{nodes:100},{depth:0},{depth:3},{depth:16},{bytes:0},{bytes:40},{bytes:100},{}]){
  const ordinary=outcome(()=>codec.encode(json.parseCompiled(codec,text,limits)));
  const candidate=outcome(()=>codec.encode(parseCanonical(json,codec,text,limits)));
  assert.deepEqual(candidate,ordinary,filename+text+JSON.stringify(limits));
 }
 const descriptor=Object.getOwnPropertyDescriptor(Object.prototype,'toJSON');
 let calls=0;Object.defineProperty(Object.prototype,'toJSON',{configurable:true,value(){calls++;return {fake:true};}});
 try{
  const input='{"x":1}',a=codec.encode(json.parseCompiled(codec,input)),b=codec.encode(parseCanonical(json,codec,input));
  assert.deepEqual(b,a);assert.equal(calls,0);
 }finally{if(descriptor)Object.defineProperty(Object.prototype,'toJSON',descriptor);else delete Object.prototype.toJSON;}
 console.log(filename,'native guard preserves exact bytes, lexemes, order, duplicate rejection, error classes/messages and budgets');
}
