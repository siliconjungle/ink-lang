import assert from 'node:assert/strict';
const outcome=run=>{try{return {ok:true,value:run()};}catch{return {ok:false};}};
let checks=0;
for(const file of ['./emitted-fused-records.mjs','./emitted-fused-sums.mjs']){
 const ink=await import(file),entry=ink.compiledValues.set_document,codec=entry.params[0],json=new ink.JsonCodec(ink.valueCodecs.identity.result);
 for(const text of ['null','1.20e9999','"雪😀"','{"a":[null,false,1,"x",{"__proto__":true}]}']){
  const logical=json.parse(text),handle=json.parseCompiled(codec,text);
  for(const compact of [false,true]){
   const baseline=compact?json.values.compact():json.values;
   const bytes=compact?codec.encodeCompact(handle):codec.encode(handle);
   const read=(bytes,limits)=>codec.materialize(compact?codec.decodeCompact(bytes,limits):codec.decode(bytes,limits));
   const compare=(input,limits={})=>{assert.deepEqual(outcome(()=>read(input,limits)),outcome(()=>baseline.decode(input,limits)));checks++;};
   compare(bytes);const saved=bytes.slice();
   for(const limits of [{nodes:0},{nodes:1},{nodes:5},{nodes:20},{depth:0},{depth:2},{depth:8},{bytes:40},{bytes:bytes.length-1},{bytes:bytes.length}])compare(bytes,limits);
   for(let i=0;i<bytes.length;i++){const changed=bytes.slice();changed[i]^=255;compare(changed);}
   for(let end=0;end<bytes.length;end++)compare(bytes.subarray(0,end));
   const decoded=compact?codec.decodeCompact(bytes):codec.decode(bytes);bytes.fill(0);
   assert.deepEqual(codec.materialize(decoded),logical);
   assert.deepEqual(compact?codec.encodeCompact(decoded):codec.encode(decoded),saved);
  }
  const result=ink.callCompiled('set_document',[handle,entry.params[1].capture('a'),codec.capture(json.parse('7'))]);
  const ordinary=entry.result.materialize(result);
  for(const compact of [false,true]){
   const bytes=compact?entry.result.encodeCompact(result):entry.result.encode(result);
   const copy=compact?entry.result.decodeCompact(bytes):entry.result.decode(bytes);
   assert.deepEqual(entry.result.materialize(copy),ordinary);
   // A malformed enum error leaf must be rejected, independently of its bytes
   // being structurally valid UTF-8.
   if(Object.hasOwn(ordinary,'Err')){
    const changed=bytes.slice();changed[changed.length-1]^=1;
    assert.equal(outcome(()=>compact?entry.result.decodeCompact(changed):entry.result.decode(changed)).ok,false);
   }
  }
 }
}
console.log(checks,'actual emitted fused decoder cases pass across both layouts');
