import assert from 'node:assert/strict';
import {createValueCodec,createCompiledValueCodec,CompactValueCodec,ValueCodec} from './value-wire.mjs';
const scalar=k=>({kind:k});
const node={kind:'record',name:'Node',fields:[{name:'text',type:scalar('string')},{name:'next',type:{kind:'option',element:{kind:'ref',name:'Node'}}}]};
const types=[...['unit','bool','u32','i32','u64','int','f32','string'].map(scalar),
 {kind:'id',name:'Key'},{kind:'enum',name:'Mode',variants:['On','Off']},
 {kind:'vector',size:2,element:scalar('u32')},
 {kind:'list',element:scalar('u32')},
 {kind:'result',ok:scalar('u32'),error:scalar('string')},
 {kind:'record',name:'Empty',fields:[]},
 {kind:'record',name:'Proto',fields:[{name:'__proto__',type:scalar('string')}]},node];
const samples=[null,true,false,0,-0,1,-1,4294967295,4294967296,-2147483648,-2147483649,
 18446744073709551615n,18446744073709551616n,9007199254740992,3.5,1e100,
 '0','01','-1','On','Off','0123456789abcdef0123456789abcdef','\ufeff雪😀','\ud800',
 {Int:'-12345678901234567890'},{Int:'-0'},{F32Bits:0x7fc12345},{F32Bits:0x100000000},
 [],[0,1],new Uint32Array([0,1]),new DataView(new ArrayBuffer(8)),[0,-1],
 {},{Ok:1},{Err:'雪'},{Ok:1,Err:'bad'},{None:null},{Some:1},{['__proto__']:'own'},
 {text:'a',next:{Some:{text:'\ufeff雪😀',next:{None:null}}}},
 {text:'a',next:{Some:{text:'b',next:{Some:{text:'c',next:{None:null}}}}}},
 {text:'a',next:{Some:{text:'b',next:{None:null}}},extra:1}];
// Existing tagged carrier semantics ignore inherited and non-enumerable extras.
const inherited=Object.assign(Object.create({extra:1}),{Ok:1});samples.push(inherited);
const hidden={Ok:1};Object.defineProperty(hidden,'extra',{value:1});samples.push(hidden);
const outcome=(run,value,limits)=>{try{run(value,limits);return true;}catch{return false;}};
const wordSchema=await createValueCodec(scalar('u32'));let materializations=0;
const compiledWord=createCompiledValueCodec(wordSchema.descriptor,r=>{materializations++;const end=r.frame(),value=r.word();r.finish(end);return value;});
assert.ok(compiledWord instanceof ValueCodec);assert.ok(compiledWord.compact() instanceof CompactValueCodec);
for(const format of [compiledWord,compiledWord.compact()]){
 const bytes=format.encode(4294967295);assert.equal(format.decode(bytes),4294967295);
 const bad=bytes.slice();bad[0]^=255;const before=materializations;assert.throws(()=>format.decode(bad));assert.throws(()=>format.decode(bytes,{nodes:0}));assert.throws(()=>format.decode(new Uint8Array(new SharedArrayBuffer(bytes.length))));assert.equal(materializations,before);
}
const objects=value=>{const out=new Set(),visit=v=>{if(v&&typeof v==='object'&&!out.has(v)){out.add(v);for(const child of Object.values(v))visit(child);}};visit(value);return out;};
const assertDetached=(input,output)=>{const old=objects(input);for(const object of objects(output))assert.equal(old.has(object),false,'captured container aliases input');};
// Independent framing oracle: recurse over descriptors through the public
// forward writer, rather than the compiled encode plan. Inputs are decoded
// canonical carriers, so the oracle only specifies bytes, not validation.
function referenceBytes(codec,value){
 return codec.encodeWith(w=>{
  const emit=(type,v)=>{const t=codec.resolve(type);w.frame(()=>{
   switch(t.kind){
    case 'unit':break;
    case 'bool':w.byte(+v);break;
    case 'u32':case 'i32':w.word(v>>>0);break;
    case 'u64':w.wide(v);break;
    case 'f32':w.word(v.F32Bits);break;
    case 'int':w.text(v.Int);break;
    case 'string':case 'id':case 'enum':w.text(v);break;
    case 'record':for(const f of t.fields)emit(f.type,v[f.name]);break;
    case 'list':case 'vector':w.word(v.length);for(const item of v)emit(t.element,item);break;
    case 'option':if(Object.hasOwn(v,'None'))w.byte(0);else{w.byte(1);emit(t.element,v.Some);}break;
    case 'result':if(Object.hasOwn(v,'Ok')){w.byte(0);emit(t.ok,v.Ok);}else{w.byte(1);emit(t.error,v.Err);}break;
    default:throw Error('unsupported oracle kind');
   }
  });};emit(codec.descriptor.root,value);
 });
}
for(const type of types){
 const codec=await createValueCodec(type,type===node?{Node:node}:{});
 for(const value of samples){
  assert.equal(outcome((v,l)=>codec.validateValue(v,l),value,{}),outcome((v,l)=>codec.encode(v,l),value,{}));
  assert.equal(outcome(v=>codec.capture(v),value),outcome(v=>codec.encode(v),value));
  assert.equal(outcome(v=>codec.compact().encode(v),value),outcome(v=>codec.encode(v),value));
  if(!outcome(v=>codec.encode(v),value,{}))continue;
  const bytes=codec.encode(value);
  const captured=codec.capture(value);assert.deepEqual(captured,codec.decode(bytes));assertDetached(value,captured);assert.deepEqual(codec.encode(captured),bytes);
  const copied=codec.copy(value);assert.deepEqual(copied,captured);assertDetached(value,copied);
  assert.equal(codec.validate(bytes),true);assert.deepEqual(codec.encode(codec.decode(bytes)),bytes);
  assert.deepEqual(codec.decode(bytes),codec.scan(bytes,{},true,()=>{}));
  const trace=(generic,names=null)=>{const events=[];const visit=function(t,data,start,end,d){assert.equal(this,undefined);events.push([t.name,start,end,d,Array.from(data.subarray(start,end))]);};if(generic)codec.scan(bytes,{},true,visit,names,true);else codec.visitSpans(bytes,visit,{},names);return events;};
  assert.deepEqual(trace(false),trace(true));assert.deepEqual(trace(false,[]),trace(true,[]));
  assert.deepEqual(trace(false,[codec.descriptor.root.name??'missing']),trace(true,[codec.descriptor.root.name??'missing']));
  // The descriptor-bound decoder and independent generic scanner must agree
  // on malformed frames/tags/text as well as successful values and budgets.
  for(let i=40;i<bytes.length;i++){
   const corrupt=bytes.slice();corrupt[i]^=255;
   assert.equal(outcome(()=>codec.decode(corrupt)),outcome(()=>codec.scan(corrupt,{},true,()=>{})),`mutation at ${i}`);
   assert.equal(outcome(()=>codec.validate(corrupt)),outcome(()=>codec.scan(corrupt,{},true,()=>{})),`validation mutation at ${i}`);
  }
  assert.deepEqual(referenceBytes(codec,codec.decode(bytes)),bytes);
  const compact=codec.compact(),short=compact.encode(value);
  assert.equal(compact,codec.compact());assert.equal(compact.identity,codec.descriptor.identity);
  assert.equal(compact.validate(short),true);assert.deepEqual(compact.decode(short),codec.decode(bytes));
  for(let i=1;i<short.length;i++){const corrupt=short.slice();corrupt[i]^=255;assert.equal(outcome(()=>compact.decode(corrupt)),outcome(()=>compact.validate(corrupt)),`compact mutation at ${i}`);}
  assert.deepEqual(compact.encode(compact.decode(short)),short);
  const paddedCompact=new Uint8Array(short.length+7);paddedCompact.set(short,7);
  assert.deepEqual(compact.decode(paddedCompact.subarray(7)),codec.decode(bytes));
  assert.throws(()=>compact.decode(new Uint8Array([...short,0])));
  for(let end=0;end<short.length;end++)assert.throws(()=>compact.decode(short.subarray(0,end)));
  assert.equal(outcome(v=>compact.encode(v,{bytes:short.length}),value),true);
  assert.equal(outcome(v=>compact.encode(v,{bytes:short.length-1}),value),false);
  for(const l of [{nodes:0},{nodes:1},{nodes:2},{nodes:4},{depth:0},{depth:1},{depth:3},{depth:6}]){
   const accepted=outcome(v=>codec.encode(v,l),value);
   assert.equal(outcome(v=>compact.encode(v,l),value),accepted);
   assert.equal(outcome(()=>compact.validate(short,l)),accepted);
   assert.equal(outcome(()=>compact.decode(short,l)),accepted);
  }
  for(const limits of [{bytes:bytes.length},{bytes:bytes.length-1},{nodes:0},{nodes:1},{nodes:2},{nodes:4},{depth:0},{depth:1},{depth:3},{depth:6}])
  {
   assert.equal(outcome((v,l)=>codec.validateValue(v,l),value,limits),outcome((v,l)=>codec.encode(v,l),value,limits),JSON.stringify(limits));
   assert.equal(outcome(v=>codec.capture(v,limits),value),outcome(v=>codec.encode(v,limits),value));
   assert.equal(outcome(v=>codec.copy(v,limits),value),outcome(v=>codec.encode(v,limits),value));
   assert.equal(outcome(()=>codec.decode(bytes,limits)),outcome(()=>codec.scan(bytes,limits,true,()=>{})));
   assert.equal(outcome(()=>codec.validate(bytes,limits)),outcome(()=>codec.scan(bytes,limits,true,()=>{})));
  }
 }
}
// A recursive cycle must reject through the node/depth limits, never loop forever.
const codec=await createValueCodec(node,{Node:node}),cycle={text:'loop'};cycle.next={Some:cycle};
assert.throws(()=>codec.validateValue(cycle));
assert.throws(()=>codec.capture(cycle));
assert.throws(()=>codec.copy(cycle));
assert.throws(()=>codec.validateValue({text:'a',next:{None:null}},{depth:129}));
console.log('logical value validation agrees with independent forward encoding');

// Capture a raw scalar field once, including ordinary getter-backed inputs.
const float=await createValueCodec(scalar('f32'));let reads=0;const getter={get F32Bits(){return reads++===0?0:4294967296;}};assert.equal(float.validateValue(getter),true);assert.equal(reads,1);
reads=0;assert.deepEqual(float.encode(getter),float.encode({F32Bits:0}));assert.equal(reads,1);
reads=0;assert.deepEqual(float.capture(getter),{F32Bits:0});assert.equal(reads,1);
const reentrantBits={get F32Bits(){assert.deepEqual(float.capture(0.1),float.decode(float.encode(0.1)));return 0x7f812345;}};
assert.deepEqual(float.capture(reentrantBits),{F32Bits:0x7f812345});
assert.deepEqual(float.copy(reentrantBits),{F32Bits:0x7f812345});
assert.throws(()=>float.capture({F32Bits:4294967296}));assert.deepEqual(float.capture({F32Bits:0x80000000}),{F32Bits:0x80000000});
for(const count of [0,1,2,3,4,5,8]){
 const fields=Array.from({length:count},(_,i)=>({name:i===0?'__proto__':'f'+i,type:{kind:'list',element:scalar('string')}})),record=await createValueCodec({kind:'record',name:'Owned'+count,fields});
 const input=Object.fromEntries(fields.map(f=>[f.name,['雪','\ufeff','😀']])),captured=record.capture(input);
 assert.deepEqual(captured,record.decode(record.encode(input)));assertDetached(input,captured);assert.equal(Object.getPrototypeOf(captured),Object.prototype);
 for(const f of fields){assert.equal(Object.hasOwn(captured,f.name),true);captured[f.name][0]='changed';assert.equal(input[f.name][0],'雪');}
}
Object.defineProperty(Object.prototype,'F32Bits',{set(){throw Error('prototype setter called');},configurable:true});
try{assert.deepEqual(float.capture(0),{F32Bits:0});}finally{delete Object.prototype.F32Bits;}

// JSON construction/rendering may fuse schema checking only when the complete
// recursive schema agrees. Compare acceptance with the separate general checker.
const {JsonCodec,TypedJsonCodec,parseJson,stringifyJson}=await import('./json-value.mjs');
const ref={kind:'ref',name:'Json'},record=(name,type)=>({kind:'record',name,fields:type?[{name:'item0',type}]:[]});
const member={kind:'record',name:'Member',fields:[{name:'key',type:scalar('string')},{name:'value',type:ref}]};
const branches=[record('Null'),record('Bool',scalar('bool')),record('Number',scalar('string')),record('String',scalar('string')),record('Array',{kind:'list',element:ref}),record('Object',{kind:'list',element:member})];
let payload=branches[5];for(let i=4;i>=0;i--)payload={kind:'result',ok:branches[i],error:payload};
const jsonType={kind:'record',name:'Json',fields:[{name:'payload',type:payload}]};
const values=await createValueCodec(jsonType,{Json:jsonType}),json=new JsonCodec(values);
const texts=['null','true','false','0','-0','1e10000','"\\ufeff雪😀"','[]','{}','[null,false,0,"x"]','{"a":1,"unknown":{"nested":[true,1e10000]}}','[{"x":[false,null]}]'];
for(const text of texts){
 const value=parseJson(text),bytes=values.encode(value).length,limits=[{},...[0,1,2,3,4,6,7,8,9,15,32].map(nodes=>({nodes})),...[0,1,2,4,7,8,10,16,128].map(depth=>({depth})),...[0,40,44,bytes-1,bytes,bytes+1].map(bytes=>({bytes}))];
 assert.deepEqual(values.encode(value),referenceBytes(values,value));
 assert.deepEqual(values.compact().decode(values.compact().encode(value)),value);
 assert.deepEqual(json.parse(text),value);assert.equal(json.stringify(value),stringifyJson(value));
 for(const l of limits){
  const expectedParse=outcome(t=>{const v=parseJson(t,l);values.validateValue(v,l);},text,l);
  assert.equal(outcome(t=>json.parse(t,l),text,l),expectedParse,`${text}: parse ${JSON.stringify(l)}`);
  const expectedRender=outcome(v=>{values.validateValue(v,l);stringifyJson(v,l);},value,l);
  assert.equal(outcome(v=>json.stringify(v,l),value,l),expectedRender,`${text}: render ${JSON.stringify(l)}`);
 }
}
for(const text of ['{"a":1,"\\u0061":2}','"\\ud800"','[0,]','01','null trailing'])assert.throws(()=>json.parse(text));
// The cursor fast path must match escaped-string parsing, preserve exact
// number lexemes, and enforce identical text/wire limits in both adapters.
const stringCodec=new TypedJsonCodec(await createValueCodec(scalar('string')));
const strings=['','plain ASCII','"quoted"','back\\slash','雪😀\ufeff','\u2028\u2029','雪😀"\\\n'.repeat(4096),...Array.from({length:128},(_,i)=>String.fromCharCode(i))];
for(const string of strings){
 const text=JSON.stringify(string),value=parseJson(text);
 assert.equal(value.payload.Err.Err.Err.Ok.item0,string);
 assert.deepEqual(json.parse(text),value);
 assert.equal(json.stringify(value),text);
 assert.deepEqual(json.parseBinary(text),values.encode(value));
 assert.equal(json.stringifyBinary(values.encode(value)),text);
 assert.equal(stringCodec.parse(text),string);
 assert.deepEqual(stringCodec.parseBinary(text),stringCodec.values.encode(string));
 assert.equal(stringCodec.stringifyBinary(stringCodec.values.encode(string)),text);
}
// Consume long, fragmented output as bytes as well as text. Preserve exact
// tokens/member order and the independently calculated portable byte budget.
for(const text of ['['+Array.from({length:2048},(_,i)=>i%2?'"雪😀\\n"':'-1.2500E+0003').join(',')+']',
 '{"10":1e10000,"2":-0,"__proto__":{"escaped":"\\u0000雪😀"},"tail":['+'true,'.repeat(2047)+'null]}']){
 const value=parseJson(text),expected=text,bytes=values.encode(value).length;
 const rendered=json.stringify(value,{bytes});assert.equal(rendered,expected);
 assert.deepEqual(new TextEncoder().encode(rendered),new TextEncoder().encode(expected));
 assert.throws(()=>json.stringify(value,{bytes:bytes-1}));
 assert.deepEqual(values.decode(values.encode(value)),value);
}
for(let code=0;code<32;code++)for(const text of ['"'+String.fromCharCode(code)+'"','{"a'+String.fromCharCode(code)+'":0}']){
 assert.throws(()=>parseJson(text),SyntaxError);assert.throws(()=>json.parse(text),SyntaxError);assert.throws(()=>json.parseBinary(text),SyntaxError);
}
for(const text of ['"\\uD83D\\uDE00"','"a\\\"b"','"\\u0061"','"\\\\"','"\\/"','"\\b\\f\\n\\r\\t"']){
 const value=parseJson(text);assert.equal(value.payload.Err.Err.Err.Ok.item0,JSON.parse(text));assert.deepEqual(json.parseBinary(text),values.encode(value));
}
for(const text of ['"\\x00"','"\\u000"','"\\uZZZZ"','"\\udfff"','"\\ud800x"','"\\ud800\\ud800"','"unterminated','0\u00a0','\u00a0null']){
 assert.throws(()=>parseJson(text));assert.throws(()=>json.parse(text));assert.throws(()=>json.parseBinary(text));
}
for(const token of ['-0','1e10000','123456789012345678901234567890','-1.2500E+0003']){
 const text=' \t\r\n{"token":'+token+'}\r\n',value=parseJson(text);
 assert.equal(json.stringify(value),'{"token":'+token+'}');assert.deepEqual(json.parseBinary(text),values.encode(value));
}
const mismatched=await createValueCodec(jsonType,{Json:{kind:'record',name:'Json',fields:[{name:'wrong',type:scalar('string')}]}});
assert.throws(()=>new JsonCodec(mismatched));
const inheritedMember={value:parseJson('0'),extra:1};Object.setPrototypeOf(inheritedMember,{key:'inherited'});
const object=parseJson('{"x":0}');object.payload.Err.Err.Err.Err.Err.item0=[inheritedMember];assert.throws(()=>json.stringify(object));
for(const text of ['[0,1]','{"x":0,"y":1}']){
 const sparse=parseJson(text),sum=text[0]==='['?sparse.payload.Err.Err.Err.Err.Ok:sparse.payload.Err.Err.Err.Err.Err;
 delete sum.item0[0];assert.throws(()=>values.validateValue(sparse));assert.throws(()=>json.stringify(sparse));assert.throws(()=>stringifyJson(sparse));
}
const typed=new TypedJsonCodec(await createValueCodec({kind:'record',name:'Words',fields:[{name:'wide',type:scalar('u64')},{name:'words',type:{kind:'list',element:scalar('int')}}]}));
const words=typed.parse('{"wide":18446744073709551615,"words":[1e2,-2]}');assert.equal(words.wide,18446744073709551615n);assert.deepEqual(words.words,[{Int:'100'},{Int:'-2'}]);assert.equal(typed.parse(typed.stringify(words)).wide,words.wide);
console.log('fused JSON boundaries preserve recursive schemas and exact wire budgets');

const ambiguous=parseJson('true');Object.defineProperty(ambiguous.payload,'Ok',{value:{}});assert.throws(()=>json.stringify(ambiguous));

const observed=[],projected=[],sample=values.encode(parseJson('{\"a\":1,\"b\":[2]}'));
let reentries=0;values.visitSpans(sample,()=>{reentries++;assert.equal(values.validate(sample),true);assert.deepEqual(values.decode(sample),parseJson('{"a":1,"b":[2]}'));});assert.ok(reentries>0);
const failedVisit=[];assert.throws(()=>values.visitSpans(sample,t=>{failedVisit.push(t.name);throw Error('visitor failure');}));assert.equal(failedVisit.length,1);assert.equal(values.validate(sample),true);
values.visit(sample,(t,b,d)=>observed.push([t.name,Array.from(b),d]));
values.visit(sample,(t,b,d)=>projected.push([t.name,Array.from(b),d]),{},['Number','Object']);
assert.deepEqual(projected,observed.filter(([name])=>name==='Number'||name==='Object'));
let callbacks=0;values.visit(sample,()=>callbacks++,{},[]);assert.equal(callbacks,0);
const badUnicode=values.encode(parseJson('\"x\"'));badUnicode[badUnicode.length-1]=255;assert.throws(()=>values.visit(badUnicode,()=>{}, {},[]));

// Small-record decoding must preserve own data properties and ignore setters.
const ordinary={key:"x",value:parseJson('1')};Object.defineProperty(Object.prototype,'item0',{set(){throw Error('prototype setter called');},configurable:true});
try{assert.deepEqual(values.decode(values.encode(parseJson('[1,true,\"x\"]'))),parseJson('[1,true,\"x\"]'));}finally{delete Object.prototype.item0;}

const padded=new Uint8Array(sample.length+7);padded.set(sample,7);const sliced=padded.subarray(7),spans=[];values.visitSpans(sliced,(t,data,lo,hi,d)=>spans.push([t.name,Array.from(data.subarray(lo,hi)),d]),{},['Number','Object']);assert.deepEqual(spans,projected);assert.equal(json.validateBinary(sliced),true);
for(const token of ['0','-0','1.2e+300','1e10000','01','-','1.','1e','1e+','+1','1\n','\ufeff1','雪','']){const v=parseJson('1');v.payload.Err.Err.Ok.item0=token;const bytes=values.encode(v);assert.equal(outcome(()=>json.validateBinary(bytes)),outcome(()=>json.stringify(v)),token);}

// Session format has canonical bounded counts and exact little-endian scalars.
const compactString=(await createValueCodec(scalar('string'))).compact();
assert.deepEqual(compactString.encode('雪'),Uint8Array.of(1,3,0xe9,0x9b,0xaa));
for(const invalid of [[2,0],[1,0x80,0],[1,0x80,0x80,0x80,0x80,0x10],[1,0x80,0x80,0x80,0x80,0x80],[1,1,0xff]])assert.throws(()=>compactString.decode(Uint8Array.from(invalid)));
const compactWord=(await createValueCodec(scalar('u32'))).compact();assert.deepEqual(compactWord.encode(0x12345678),Uint8Array.of(1,0x78,0x56,0x34,0x12));
const compactList=(await createValueCodec({kind:'list',element:scalar('unit')})).compact();
assert.deepEqual(compactList.encode([null,null]),Uint8Array.of(1,2));
assert.throws(()=>compactList.decode(Uint8Array.of(1,0xff,0xff,0xff,0xff,0x0f)));
for(const [n,prefix] of [[127,[127]],[128,[128,1]],[16383,[255,127]],[16384,[128,128,1]]]){
 const list=new Array(n).fill(null),bytes=compactList.encode(list);
 assert.deepEqual(bytes,Uint8Array.from([1,...prefix]));assert.deepEqual(compactList.decode(bytes),list);
 assert.throws(()=>compactList.decode(bytes,{nodes:n}));
}
assert.throws(()=>compactString.decode(new Uint8Array(new SharedArrayBuffer(4))));
const compactCycle=codec.compact();assert.throws(()=>compactCycle.encode(cycle));
console.log('compact transport preserves typed values, canonical counts, ownership and resource bounds');

// Scratch reuse must not alias outputs, retain large buffers indefinitely, or
// let reentrant getters disturb an outer invocation. Failures reset the workspace.
for(const encoder of [float,float.compact()]){
 const first=encoder.encode({F32Bits:0x7fc12345}),copy=first.slice();
 let inner;
 const reentrant={get F32Bits(){inner=encoder.encode({F32Bits:0x12345678});return 0x80000000;}};
 const outer=encoder.encode(reentrant);
 assert.equal(encoder.decode(inner).F32Bits,0x12345678);
 assert.equal(encoder.decode(outer).F32Bits,0x80000000);
 assert.deepEqual(first,copy);inner.fill(0);assert.deepEqual(first,copy);
 assert.throws(()=>encoder.encode({get F32Bits(){throw Error('getter failure');}}));
 assert.throws(()=>encoder.encode({F32Bits:0},{bytes:1}));
 assert.equal(encoder.decode(encoder.encode({F32Bits:3})).F32Bits,3);
}
for(const encoder of [(await createValueCodec(scalar('string'))),compactString]){
 const big='雪'.repeat(20000),bytes=encoder.encode(big);assert.equal(encoder.decode(bytes),big);
 const small=encoder.encode('x');assert.equal(encoder.decode(small),'x');
 assert.equal(encoder.decode(bytes),big);
 for(let n=0;n<=17;n++)for(const text of ['\u0000\tA~'.repeat(n),'雪'.repeat(n),'\ufeff'.repeat(n)])assert.equal(encoder.decode(encoder.encode(text)),text);
}
const checkedHeader=await createValueCodec(scalar('u32')),headerBytes=checkedHeader.encode(7);
for(let i=0;i<40;i++){const corrupt=headerBytes.slice();corrupt[i]^=1;assert.throws(()=>checkedHeader.validate(corrupt));assert.throws(()=>checkedHeader.decode(corrupt));}
const largeType={kind:'record',name:'Large',fields:['a','b','c','d','__proto__'].map(name=>({name,type:node}))};
const large=await createValueCodec(largeType,{Node:node}),largeValue=Object.fromEntries(largeType.fields.map(f=>[f.name,{text:f.name,next:{Some:{text:'child',next:{None:null}}}}]));
for(const codec of [large,large.compact()])assert.deepEqual(codec.decode(codec.encode(largeValue)),largeValue);
