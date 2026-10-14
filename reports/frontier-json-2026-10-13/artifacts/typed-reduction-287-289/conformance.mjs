import assert from 'node:assert/strict';
const outcome=fn=>{try{return {value:fn()};}catch(error){return {error:error.message};}};
for(const filename of ['./baseline.mjs','./flat.mjs']){
 const ink=await import(filename),entry=ink.compiledValues.set_document,codec=entry.params[0],json=new ink.JsonCodec(ink.valueCodecs.identity.result);
 const texts=['null','false','true','0','-0','1.200e+1000','"雪\\u0000😀"','[]','{}','[null,true,0,"x",[],{}]','{"__proto__":{"0":[1,-0,"雪"]},"unknown":false}'];
 let seed=777;
 const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 const value=depth=>depth===0?['雪',null,false,123][next()%4]:next()%2?Array.from({length:next()%4},()=>value(depth-1)):Object.fromEntries(Array.from({length:next()%4},(_,i)=>['x'+i,value(depth-1)]));
 for(let i=0;i<30;i++)texts.push(JSON.stringify(value(1+next()%5)));
 for(const text of texts){
  const h=json.parseCompiled(codec,text),logical=codec.materialize(h);
  assert.equal(json.stringifyCompiled(codec,h),json.stringify(logical));
  for(const limits of [{nodes:0},{nodes:1},{nodes:8},{nodes:20},{depth:0},{depth:2},{depth:16},{bytes:40},{bytes:50},{bytes:100},{}]){
   const direct=outcome(()=>json.stringifyCompiled(codec,h,limits));
   const ordinary=outcome(()=>json.stringify(codec.materialize(h,limits),limits));
   assert.equal('value' in direct,'value' in ordinary,filename+text+JSON.stringify(limits));
   if('value' in direct)assert.equal(direct.value,ordinary.value);
  }
  const reply=ink.callCompiled('set_document',[h,entry.params[1].capture('key'),codec.capture(json.parse('777'))]);
  if(Object.hasOwn(entry.result.materialize(reply),'Ok'))assert.equal(json.stringifyCompiled(entry.result,reply,{unwrapResult:true}),json.stringify(entry.result.materialize(reply).Ok));
  else assert.throws(()=>json.stringifyCompiled(entry.result,reply,{unwrapResult:true}),/result is Err/);
 }
 const duplicate=json.parse('{"x":1}');duplicate.payload.Err.Err.Err.Err.Err.item0.push({...duplicate.payload.Err.Err.Err.Err.Err.item0[0]});
 assert.throws(()=>json.stringifyCompiled(codec,codec.capture(duplicate)),/duplicate/);
 for(const token of ['01','NaN','1e','+1','-']){
  const invalid=json.parse('0');invalid.payload.Err.Err.Ok.item0=token;
  assert.throws(()=>json.stringifyCompiled(codec,codec.capture(invalid)),/invalid JSON number/);
 }
 const escaped=json.parse(JSON.stringify('\u0000'.repeat(30))),handle=codec.capture(escaped);
 assert.throws(()=>json.stringifyCompiled(codec,handle,{bytes:150}),/JSON byte limit/);
 assert.deepEqual(codec.materialize(handle),escaped);
 console.log(filename,'exact text, recursive values, malformed numbers, duplicate keys, Result errors and resource limits pass');
}
