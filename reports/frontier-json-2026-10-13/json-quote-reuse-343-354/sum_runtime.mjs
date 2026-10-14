import assert from 'node:assert/strict';import fs from 'node:fs';
import * as ordinary from './runtime-ordinary.mjs';
const files=['runtime-composed.mjs','runtime-flat.mjs',...fs.readdirSync(new URL('.',import.meta.url)).filter(n=>/^runtime-one-\d+\.mjs$/.test(n))];
const outcome=fn=>{try{return {value:fn()};}catch(e){return {error:e.message};}};
const admission=run=>{try{return {value:run()};}catch{return {rejected:true};}};
const rebuild=codec=>codec.reducer(node=>{
 assert.ok(Object.isFrozen(node));assert.ok(Object.isFrozen(node.children));
 if(node.kind==='record')return (...values)=>Object.fromEntries(node.fields.map((name,i)=>[name,values[i]]));
 if(node.kind==='list'||node.kind==='vector')return {start:()=>[],step:(out,value)=>{out.push(value);return out;},finish:out=>out};
 if(node.kind==='result')return (tag,value)=>tag?{Err:value}:{Ok:value};
 if(node.kind==='option')return (tag,value)=>tag?{Some:value}:{None:null};
 return value=>value;
});
for(const file of files){
 const flat=await import('./'+file),inputs=[{Ok:5},{Err:{Ok:'雪'}},{Err:{Err:true}}];
 const stateJson=new ordinary.JsonCodec(ordinary.valueCodecs.json_identity.result);
 for(const text of ['null','true','1e1000','"雪"','[1,false,null]','{"a":["x",2]}']){
  const value=stateJson.parse(text),before=structuredClone(value);
  assert.deepEqual(flat.createState().invoke('json_echo',[value]),ordinary.createState().invoke('json_echo',[value]));
  assert.deepEqual(value,before);
 }
 for(const invalid of [null,{},[],{payload:{Ok:{extra:1}}},{payload:{Err:{Ok:{item0:7}}}},{payload:{Err:{Err:{Ok:{item0:7}}}}}]){
  assert.deepEqual(outcome(()=>flat.createState().invoke('json_echo',[invalid])),outcome(()=>ordinary.createState().invoke('json_echo',[invalid])));
 }
 for(const depth of [0,2,8,12]){
  const trace=module=>{
   const log=[],value=stateJson.parse('['.repeat(depth)+'"雪"'+']'.repeat(depth));
   let leaf=value;for(let i=0;i<depth;i++)leaf=leaf.payload.Err.Err.Err.Err.Ok.item0[0];
   const record=leaf.payload.Err.Err.Err.Ok;
   Object.defineProperty(record,'item0',{enumerable:true,get(){log.push('leaf');return '雪';}});
   return {reply:outcome(()=>module.createState().invoke('json_echo',[value])),log};
  };
  assert.deepEqual(trace(flat),trace(ordinary),'state capture preserves getter ordering and deep resource failures');
 }
 const construct=(module,codec,value,limits={})=>{const builder=codec.builder(limits);const feed=(type,value)=>{const t=codec.resolve(type);switch(t.kind){case 'record':builder.open(0);for(const f of t.fields)feed(f.type,value[f.name]);builder.close();break;case 'list':case 'vector':builder.open(0);for(const x of value)feed(t.element,x);builder.close();break;case 'result':{const ok=Object.hasOwn(value,'Ok');builder.open(ok?0:1);feed(ok?t.ok:t.error,ok?value.Ok:value.Err);builder.close();break;}case 'option':{const some=Object.hasOwn(value,'Some');builder.open(some?1:0);if(some)feed(t.element,value.Some);builder.close();break;}default:builder.scalar(value);}};feed(codec.descriptor.root,value);return builder.finish();};
 for(const x of inputs)for(const name of ['identity','mapped','errors','folded','wide']){
  const expected=ordinary.callOwned(name,[x]);assert.deepEqual(flat.call(name,[x]),ordinary.call(name,[x]));assert.deepEqual(flat.callOwned(name,[x]),expected);
  const binding=flat.compiledValues[name],handle=binding.params[0].capture(x),reply=flat.callCompiled(name,[handle]);assert.deepEqual(binding.result.materialize(reply),expected);
  const built=construct(flat,binding.params[0],x);assert.deepEqual(binding.params[0].materialize(built),binding.params[0].materialize(handle));assert.deepEqual(binding.params[0].encode(built),binding.params[0].encode(handle));
  for(const limits of [{nodes:0},{nodes:1},{nodes:2},{nodes:4},{depth:0},{depth:1},{bytes:40},{bytes:50},{}])assert.deepEqual(outcome(()=>construct(flat,binding.params[0],x,limits)&&true),outcome(()=>binding.params[0].capture(x,limits)&&true));
  const ordinaryEntry=ordinary.compiledValues[name],ordinaryReply=ordinary.callCompiled(name,[ordinaryEntry.params[0].capture(x)]);
  // The fused API must retain exact admission and owned results in every
  // physical sum layout, including malformed source frames and tags.
  for(const compact of [false,true]){
   const encode=compact?'encodeCompact':'encode',decode=compact?'decodeCompact':'decode',fused=compact?'decodeCompactFused':'decodeFused';
   const bytes=binding.result[encode](reply);
   const compare=(input,limits={})=>assert.deepEqual(admission(()=>binding.result.materialize(binding.result[fused](input,limits))),admission(()=>ordinaryEntry.result.materialize(ordinaryEntry.result[decode](input,limits))));
   compare(bytes);
   for(const limits of [{nodes:0},{nodes:1},{nodes:4},{depth:0},{depth:2},{bytes:0},{bytes:bytes.length-1},{bytes:bytes.length}])compare(bytes,limits);
   for(let i=0;i<bytes.length;i++){const corrupt=bytes.slice();corrupt[i]^=255;compare(corrupt);}
   for(let end=0;end<bytes.length;end++)compare(bytes.subarray(0,end));
   const retained=binding.result[fused](bytes);bytes.fill(0);assert.deepEqual(binding.result.materialize(retained),expected);
  }
  for(const limits of [{nodes:0},{nodes:1},{nodes:2},{nodes:4},{depth:0},{depth:1},{depth:2},{bytes:4},{bytes:9},{bytes:50},{}]){
   assert.deepEqual(outcome(()=>binding.result.materialize(reply,limits)),outcome(()=>ordinaryEntry.result.materialize(ordinaryReply,limits)));
   for(const compact of [false,true]){const encoded=compact?'encodeCompact':'encode',decoded=compact?'decodeCompact':'decode';assert.deepEqual(outcome(()=>binding.result[encoded](reply,limits)),outcome(()=>ordinaryEntry.result[encoded](ordinaryReply,limits)));const bytes=ordinaryEntry.result[encoded](ordinaryReply);assert.deepEqual(outcome(()=>binding.result[decoded](bytes,limits)&&true),outcome(()=>ordinaryEntry.result[decoded](bytes,limits)&&true));}
  }
  for(const limits of [{nodes:0},{nodes:1},{nodes:2},{nodes:4},{nodes:100},{depth:0},{depth:1},{depth:128},{bytes:40},{bytes:50},{bytes:1000}])assert.deepEqual(outcome(()=>binding.params[0].capture(x,limits)&&true),outcome(()=>ordinary.compiledValues[name].params[0].capture(x,limits)&&true));
  for(const compact of [false,true]){const a=flat.valueCodecs[name],b=ordinary.valueCodecs[name],request=(compact?a.arguments.compact():a.arguments).encode({x});assert.deepEqual((compact?flat.callCompact:flat.callBinary)(name,request),(compact?ordinary.callCompact:ordinary.callBinary)(name,request));assert.deepEqual(compact?binding.result.encodeCompact(reply):binding.result.encode(reply),(compact?b.result.compact():b.result).encode(expected));}
 }
 for(const x of [{Ok:{Ok:3}},{Ok:{Err:{Ok:true}}},{Ok:{Err:{Err:{Int:'-999999999999999999999999'}}}},{Err:{Ok:'tail'}},{Err:{Err:false}}])assert.deepEqual(flat.callOwned('left',[x]),ordinary.callOwned('left',[x]));
 const leafCases=[{Ok:{F32Bits:0x80000000}},{Ok:{F32Bits:0x7fc01234}},{Err:{Ok:{Int:'-999999999999999999999999'}}},{Err:{Err:{payload:{Ok:{}}}}},{Err:{Err:{payload:{Err:{item0:[{payload:{Ok:{}}}]}}}}}];
 for(const x of leafCases){
  const expected=ordinary.callOwned('leafs',[x]);assert.deepEqual(flat.callOwned('leafs',[x]),expected);
  assert.equal(flat.callOwned('equal',[x,x]),ordinary.callOwned('equal',[x,x]));
  const entry=flat.compiledValues.leafs,h=entry.params[0].capture(x),reply=flat.callCompiled('leafs',[h]);assert.deepEqual(entry.result.materialize(reply),expected);
  for(const compact of [false,true]){const a=flat.valueCodecs.leafs,b=ordinary.valueCodecs.leafs,request=(compact?a.arguments.compact():a.arguments).encode({x});assert.deepEqual((compact?flat.callCompact:flat.callBinary)('leafs',request),(compact?ordinary.callCompact:ordinary.callBinary)('leafs',request));assert.deepEqual(compact?entry.result.encodeCompact(reply):entry.result.encode(reply),(compact?b.result.compact():b.result).encode(expected));}
 }
 for(const invalid of [null,{},[],{Ok:1,Err:false},{Err:{}},{Err:{Ok:1}},{Err:{Err:3}},{Ok:-1},{Ok:4294967296}])assert.deepEqual(outcome(()=>flat.compiledValues.identity.params[0].capture(invalid)),outcome(()=>ordinary.compiledValues.identity.params[0].capture(invalid)));
 for(const limits of [{nodes:0},{nodes:1},{nodes:2},{depth:0},{depth:1},{bytes:5},{bytes:50},{}]){
  const trace=m=>{let log=[];const tail={get Ok(){log.push('leaf');return '雪';}},root={get Err(){log.push('tail');return tail;}};return {result:outcome(()=>m.compiledValues.identity.params[0].capture(root,limits)&&true),log};};assert.deepEqual(trace(flat),trace(ordinary));
 }
 // Test the actual ABI parser against every admitted source sum layout.
 for(const module of [ordinary,flat]){
 const samples=['null','true','false','0','-0','1.2300e+1000','999999999999999999999999999999999999','"雪\\u0000😀"','[]','{}','[null,true,0,"x",[],{}]','{"__proto__":{"0":[1,-0,"雪"]},"unknown":false}'];
 const codec=module.compiledValues.json_identity.params[0],json=new module.JsonCodec(module.valueCodecs.json_identity.result);
 const quoter=module.createJsonQuoter({maxEntries:8,maxBytes:256});
 assert.ok(Object.isFrozen(codec.descriptor));
 for(const text of samples){const h=json.parseCompiled(codec,text),expected=json.parse(text);assert.deepEqual(codec.materialize(h),expected);assert.deepEqual(codec.encode(h),json.values.encode(expected));assert.deepEqual(codec.encodeCompact(h),json.values.compact().encode(expected));const result=module.callCompiled('json_identity',[h]);assert.equal(json.stringify(codec.materialize(result)),json.stringify(expected));
  assert.equal(json.stringifyCompiled(codec,result),json.stringify(expected));
  for(let reuse=0;reuse<3;reuse++)assert.equal(json.stringifyCompiled(codec,result,{quoter}),json.stringify(expected));
  assert.ok(quoter.stats().entries<=8);assert.ok(quoter.stats().payload_bytes<=256);
  for(const limits of [{nodes:0},{nodes:1},{nodes:3},{nodes:8},{depth:0},{depth:3},{bytes:40},{bytes:100},{}]){
   const a=outcome(()=>json.parseCompiled(codec,text,limits)&&true),b=outcome(()=>codec.capture(json.parse(text,limits),limits)&&true);assert.equal('value' in a,'value' in b,text+JSON.stringify(limits));
   assert.equal('value' in outcome(()=>json.stringifyCompiled(codec,h,limits)),'value' in outcome(()=>json.stringify(codec.materialize(h,limits),limits)),text+JSON.stringify(limits));
   assert.deepEqual(outcome(()=>json.stringifyCompiled(codec,h,{...limits,quoter})),outcome(()=>json.stringifyCompiled(codec,h,limits)),text+JSON.stringify(limits));
  }
 }
 for(const text of ['','nul','[1,]','{"x":1,"\\u0078":2}','"\\ud800"','{"x":}','1e','01','true false'])assert.throws(()=>json.parseCompiled(codec,text),text);
 assert.throws(()=>json.parseCompiled(module.compiledValues.identity.params[0],'{}'),/schema mismatch/);
 assert.throws(()=>json.stringifyCompiled(module.compiledValues.identity.params[0],module.compiledValues.identity.params[0].capture({Ok:1})),/schema mismatch/);
 assert.throws(()=>json.stringifyCompiled(codec,json.parseCompiled(codec,'{}'),{quoter:{quote(){throw Error('untrusted callback');}}}),/owner mismatch/);
 const duplicate=json.parse('{"x":1}');let object=duplicate.payload;for(let i=0;i<5;i++)object=object.Err;object.item0.push(object.item0[0]);
 assert.throws(()=>json.stringifyCompiled(codec,codec.capture(duplicate),{quoter}),/duplicate/);
 quoter.clear();assert.equal(quoter.stats().entries,0);assert.equal(quoter.stats().payload_bytes,0);

 }
 // The generic event visitor exposes only immutable wire scalars and source
 // frames. Selected layouts must emit the same events as ordinary carriers.
 const events=(codec,handle,limits={})=>{const log=[],sink=Object.fromEntries(['begin','end','byte','word','wide','text','count'].map(name=>[name,(...args)=>{for(const value of args)assert.notEqual(typeof value,'object');log.push([name,...args]);}]));codec.visit(handle,sink,limits);return log;};
 for(const name of ['identity','leafs','json_identity']){
  const selected=flat.compiledValues[name].params[0],baseline=ordinary.compiledValues[name].params[0];
  const values=name==='identity'?inputs:name==='leafs'?leafCases:['null','[1,true,"雪"]','{"__proto__":{"unknown":1e1000}}'].map(text=>new ordinary.JsonCodec(ordinary.valueCodecs.json_identity.result).parse(text));
  for(const input of values){
   const a=selected.capture(input),b=baseline.capture(input);assert.deepEqual(events(selected,a),events(baseline,b));
   const reduce=rebuild(selected),plainReduce=rebuild(baseline);
   assert.deepEqual(reduce(a),selected.materialize(a));assert.deepEqual(reduce(a),plainReduce(b));
   for(const limits of [{nodes:0},{nodes:1},{nodes:4},{depth:0},{depth:2},{bytes:0},{bytes:4},{bytes:40},{bytes:60},{}])assert.deepEqual(outcome(()=>reduce(a,null,limits)),outcome(()=>selected.materialize(a,limits)));
   assert.throws(()=>reduce(b),/owner mismatch/);
   assert.throws(()=>selected.reducer(()=>null),/reduction/);
   const throws=selected.reducer(node=>node.kind==='list'||node.kind==='vector'?{start(){throw Error('algebra failure');},step(){},finish(){}}:()=>{throw Error('algebra failure');});
   assert.throws(()=>throws(a),/algebra failure/);assert.deepEqual(reduce(a),selected.materialize(a));
   const owned=reduce(a);if(owned&&typeof owned==='object'){owned.extra='owned';assert.deepEqual(selected.materialize(a),input);}
   for(const limits of [{nodes:0},{nodes:1},{nodes:4},{depth:0},{depth:2},{bytes:40},{bytes:60},{}])assert.equal('value' in outcome(()=>events(selected,a,limits)),'value' in outcome(()=>selected.encode(a,limits)));
   assert.throws(()=>selected.visit(a,{begin(){}}),/visitor method/);
   assert.throws(()=>selected.visit(b,Object.fromEntries(['begin','end','byte','word','wide','text','count'].map(name=>[name,()=>{}]))),/owner mismatch/);
   const failure=Object.fromEntries(['begin','end','byte','word','wide','text','count'].map(name=>[name,()=>{throw Error('visitor failure');}]));assert.throws(()=>selected.visit(a,failure),/visitor failure/);assert.deepEqual(events(selected,a),events(baseline,b));
  }
 }
 const destination=[];assert.equal(flat.callInto('many',[inputs[2]],destination),2);assert.deepEqual(destination,[inputs[2],inputs[2]]);
 const a=flat.createState(),b=ordinary.createState();
 const shared=a.invoke('shared',[]).result;assert.strictEqual(shared.whole.Err,shared.tail);shared.tail.Ok[0]=99;assert.equal(a.invoke('shared',[]).result.tail.Ok[0],1);
 for(const x of inputs)for(const name of ['nested','outer']){assert.deepEqual(a.invoke(name,[0,x]),b.invoke(name,[0,x]));assert.deepEqual(a.invoke('get',[0]),b.invoke('get',[0]));assert.deepEqual(await a.checkpoint(),await b.checkpoint());}
 for(const x of inputs)for(const fail of [false,true]){const args=[0,{value:x},fail];assert.deepEqual(a.invoke('put',args),b.invoke('put',args));assert.deepEqual(a.invoke('get',[0]),b.invoke('get',[0]));assert.deepEqual(await a.checkpoint(),await b.checkpoint());}
 const stored={value:{Err:{Ok:'same'}}};a.invoke('put',[17,stored,false]);b.invoke('put',[17,stored,false]);const reused=a.invoke('reused',[17]).result,plainReused=b.invoke('reused',[17]).result;assert.deepEqual(reused,plainReused);assert.strictEqual(plainReused.first,plainReused.second);assert.strictEqual(reused.first,reused.second);
 const snapshot=await b.checkpoint();await a.restore(snapshot);assert.deepEqual(await a.checkpoint(),snapshot);
 a.beginTransaction();b.beginTransaction();a.invoke('put',[1,{value:inputs[0]},false]);b.invoke('put',[1,{value:inputs[0]},false]);a.rollbackTransaction();b.rollbackTransaction();assert.deepEqual(await a.checkpoint(),await b.checkpoint());
 for(const limits of [{values:0},{values:2},{values:10},{depth:0},{depth:2},{depth:128},{bytes:200}]){const result=async f=>{try{return await f();}catch(e){return e.message;}};assert.deepEqual(await result(()=>a.checkpoint(limits)),await result(()=>b.checkpoint(limits)));}
 console.log(file,'preserves values, resources, nested failures, events, versions and exact checkpoints');
}
