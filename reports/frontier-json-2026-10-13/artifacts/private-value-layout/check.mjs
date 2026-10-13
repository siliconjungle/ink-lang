import assert from 'node:assert/strict';
import * as ink from '../frontier-json/compact-stream-release.mjs';
import {privateLayout} from './private-layout.mjs';
import {shapeFactories} from './profile-factories.mjs';
const scalar=kind=>({kind});
const node={kind:'record',name:'Node',fields:[{name:'only',type:{kind:'option',element:{kind:'ref',name:'Node'}}}]};
const record={kind:'record',name:'Fields',fields:[{name:'__proto__',type:scalar('string')},{name:'word',type:scalar('u64')},{name:'bits',type:scalar('f32')}]};
const sum={kind:'result',ok:{kind:'record',name:'Wrapper',fields:[{name:'leaf',type:scalar('string')}]},error:{kind:'result',ok:scalar('bool'),error:{kind:'list',element:record}}};
const fixtures=[
 ...[['unit',null],['bool',true],['u32',4294967295],['i32',-2147483648],['u64',18446744073709551615n],['int',{Int:'-123456789012345678901234567890'}],['f32',{F32Bits:0x7fa00001}],['string','雪😀\0']].map(([k,v])=>[scalar(k),v,{}]),
 [{kind:'enum',name:'E',variants:['A','B']},'B',{}], [{kind:'id',name:'Id'},'0123456789abcdef0123456789abcdef',{}],
 [record,{['__proto__']:'own',word:7n,bits:{F32Bits:0x80000000}},{}],
 [{kind:'vector',size:2,element:scalar('u32')},[0,1],{}],
 [sum,{Ok:{leaf:'text'}},{}], [sum,{Err:{Ok:true}},{}], [sum,{Err:{Err:[{['__proto__']:'own',word:7n,bits:{F32Bits:0x80000000}}]}},{}],
 [node,{only:{Some:{only:{Some:{only:{None:null}}}}}},{Node:node}],
 [{kind:'list',element:node},[{only:{None:null}},{only:{Some:{only:{None:null}}}}],{Node:node}],
 [{kind:'result',ok:scalar('string'),error:scalar('string')},{Err:'\0雪'},{}],
 [{kind:'option',element:{kind:'option',element:scalar('unit')}},{Some:{None:null}},{}],
 ];
const pair={kind:'record',name:'Pair',fields:[{name:'label',type:scalar('string')},{name:'datum',type:scalar('u32')}]};
for(const pairs of [[['__proto__',1],['tail',2]],[['10',1],['2',2]],[['2',1],['10',2]],[['same',1],['same',2]],[]])fixtures.push([{kind:'result',ok:{kind:'list',element:pair},error:{kind:'list',element:pair}},{Ok:pairs.map(([label,datum])=>({label,datum}))},{}]);
for(const number of ['0','-0','-1','1','007','1e2','1e10000','9007199254740991','-9007199254740991','999999999999999999999999'])for(const branch of ['Ok','Err'])fixtures.push([{kind:'result',ok:scalar('string'),error:scalar('string')},{[branch]:number},{}]);
const codecs=ink.valueCodecs.identity.result,json=new ink.JsonCodec(codecs);
for(const text of ['null','true','false','1e10000','-0','"\\u0001雪😀"','[]','{}','{"10":1,"2":-0,"__proto__":{"x":[false,null,"雪😀"]}}'])fixtures.push([codecs.descriptor.root,json.parse(text),codecs.descriptor.named]);
const objects=v=>{const result=new Set();function walk(x){if(x&&typeof x==='object'&&!result.has(x)){result.add(x);for(const c of Object.values(x))walk(c);}}walk(v);return result;};
for(const [type,input,named]of fixtures){
 const codec=await ink.createValueCodec(type,named),value=codec.capture(input),bytes=codec.encode(value);
 for(const options of [{tagged:false,flatRows:false},{tagged:true,flatRows:false},{tagged:true,flatRows:true},{tagged:true,flatRows:true,objects:true,smallIntegers:true},{tagged:true,flatRows:true,objects:true,smallIntegers:true,dictionaries:true},{tagged:true,flatRows:true,objects:true,smallIntegers:true,dictionaries:true,shapeFactories}]){
  const layout=privateLayout(codec,ink.createValueCaptureBudget,options),privateValue=layout.pack(value),out=layout.unpack(privateValue);
  assert.deepEqual(out,value);assert.deepEqual(codec.encode(out),bytes);
  const source=objects(value),encoded=objects(privateValue);for(const p of encoded)assert.equal(source.has(p),false);for(const p of objects(out)){assert.equal(source.has(p),false);assert.equal(encoded.has(p),false);}
  for(const limits of [{nodes:0},{nodes:1},{depth:0},{depth:1},{bytes:0},{bytes:bytes.length-1},{bytes:bytes.length}]){
   const accepts=fn=>{try{fn();return true;}catch{return false;}};
   assert.equal(accepts(()=>layout.pack(value,limits)),accepts(()=>codec.copy(value,limits)),'pack resources');
   assert.equal(accepts(()=>layout.unpack(privateValue,limits)),accepts(()=>codec.copy(value,limits)),'unpack resources');
  }
 }
}
console.log('Private carrier probe: generic scalar, sum, record, recursion, ownership, exact wire bytes and resource controls pass.');
