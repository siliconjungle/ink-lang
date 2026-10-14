import * as m from './candidate.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const [id,out]=process.argv.slice(2),json=new m.JsonCodec(m.valueCodecs.identity.result),entry=m.compiledValues.set_document;
const text=JSON.stringify(Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),`雪😀${i}\n"\\`])));
const input=json.parseCompiled(entry.params[0],text),key=entry.params[1].capture('k00000'),value=entry.params[2].capture(json.parse('777'));
const encoder=new TextEncoder(),expected=encoder.encode(json.stringifyCompiled(entry.result,m.callCompiled('set_document',[input,key,value]),{unwrapResult:true}));
const hash=b=>{let h=0;for(const v of b)h=Math.imul(h,31)^v;return h;};
const expectedHash=hash(expected),rows=[];let sink=0;
for(const calls of [1,2,4,8,32,256])for(let round=0;round<15;round++)for(const cached of (round+Number(id))%2?[true,false]:[false,true]){
 global.gc?.();const at=process.hrtime.bigint(),q=cached?m.createJsonQuoter():undefined;
 let result;
 for(let i=0;i<calls;i++){
  const output=m.callCompiled('set_document',[input,key,value]);
  result=encoder.encode(json.stringifyCompiled(entry.result,output,{unwrapResult:true,quoter:q}));
  sink^=hash(result);
 }
 const elapsed_ns=Number(process.hrtime.bigint()-at);
 assert.equal(hash(result),expectedHash);assert.deepEqual(result,expected);
 rows.push({calls,round,cached,elapsed_ns,cache:q?.stats()??null});
}
fs.writeFileSync(out,JSON.stringify({process:Number(id),node:process.version,rows,sink,scope:'Prepared compiled input; complete edits plus exact UTF-8 output consumption. Cache creation and first fill included per session. Imports/input preparation/forced GC excluded. Runtime-support substitution prototype; shared host, not a default selection.'},null,2)+'\n',{flag:'wx'});
