// Full u32 Set calls, including public validation and complete output consumption.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const file=path.resolve(process.argv[2]);
const m=await import(pathToFileURL(file));
const readerFile=process.argv[3]?path.resolve(process.argv[3]):null;
const readers=readerFile?await import(pathToFileURL(readerFile)):null;
const now=()=>process.hrtime.bigint();
const valid=x=>{if(new Set(x.items).size!==x.items.length)throw Error('contract precondition failed');};
const control={
 make:xs=>({items:[...new Set(xs)]}),
 distinct:value=>{valid(value);return true;},
 has:(value,item)=>{valid(value);return value.items.includes(item);},
 union:(a,b)=>{valid(a);valid(b);return {items:[...new Set([...a.items,...b.items])]};},
 intersection:(a,b)=>{valid(a);valid(b);const found=new Set(b.items);return {items:a.items.filter(x=>found.has(x))};},
 difference:(a,b)=>{valid(a);valid(b);const found=new Set(b.items);return {items:a.items.filter(x=>!found.has(x))};},
};
let consumed=0;
function consume(result){
 if(result instanceof Uint8Array){for(const x of result)consumed=(consumed+x)>>>0;}
 else if(typeof result==='boolean')consumed=(consumed+Number(result))>>>0;
 else for(const x of result.items)consumed=(consumed+x)>>>0;
}
for(const name of ['has','distinct','union','intersection','difference']){
 const args=name==='has'?[{items:[1,1]},0]:name==='distinct'?[{items:[1,1]}]:[{items:[1,1]},{items:[2]}];
 assert.throws(()=>m.call(name,args),/contract precondition failed/);
 assert.throws(()=>control[name](...args),/contract precondition failed/);
}
const rows=[];
for(const n of [0,16,64,256]){
 const a={items:Array.from({length:n},(_,i)=>i===0?0xffffffff:i-1)};
 const b={items:Array.from({length:n},(_,i)=>i+Math.floor(n/2))};
 const cases={distinct:[a],make:[[...a.items,...a.items.slice(0,Math.floor(n/2))]],has:[a,0xfffffffe],union:[a,b],intersection:[a,b],difference:[a,b]};
 for(const [name,args]of Object.entries(cases)){
  const before=JSON.stringify(args),codec=m.valueCodecs[name],fields=codec.arguments.descriptor.root.fields;
  const at=now();const bytes=codec.arguments.encode(Object.fromEntries(fields.map((f,i)=>[f.name,args[i]])));const inputEncodingNs=Number(now()-at);
  const handwrittenBinary=()=>{const decoded=codec.arguments.decode(bytes);return codec.result.encode(control[name](...fields.map(f=>decoded[f.name])));};
  for(const boundary of ['typed-values-with-invariant-validation','checked-value-wire']){
   const methods=boundary==='checked-value-wire'?[()=>m.callBinary(name,bytes),handwrittenBinary]:[()=>m.call(name,args),()=>control[name](...args)];
   if(readers){assert.equal(readers.valueCodecs[name].arguments.descriptor.identity,codec.arguments.descriptor.identity);methods.splice(1,0,boundary==='checked-value-wire'?()=>readers.callBinary(name,bytes):()=>readers.call(name,args));}
   for(const method of methods)assert.deepEqual(method(),methods[0]());for(const method of methods)for(let i=0;i<8;i++)consume(method());
   const repetitions=Math.max(2,Math.floor(256/Math.max(16,n))),samples=methods.map(()=>[]);
   for(let round=0;round<11;round++)for(let offset=0;offset<methods.length;offset++){
    const lane=(round+offset)%methods.length,begin=now();for(let i=0;i<repetitions;i++)consume(methods[lane]());samples[lane].push(Number(now()-begin)/repetitions);
   }
   const medianNs=samples.map(xs=>[...xs].sort((a,b)=>a-b)[5]);
   rows.push({n,name,boundary,repetitions,inputEncodingNs,samplesNs:samples,medianNs,literalOverHandwritten:medianNs[0]/medianNs[medianNs.length-1],...(readers?{readerOverLiteral:medianNs[1]/medianNs[0],readerOverHandwritten:medianNs[1]/medianNs[2]}:{})});
  }
  assert.equal(JSON.stringify(args),before);
 }
}
console.log(JSON.stringify({schema:1,scope:'One u32 Set family; complete literal calls and strong handwritten controls; no general profitability claim',platform:process.platform,architecture:process.arch,node:process.version,moduleSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),readerModuleSha256:readerFile?crypto.createHash('sha256').update(fs.readFileSync(readerFile)).digest('hex'):null,lanes:readers?['literal','checked-boundary-reader','handwritten-set']:['literal','handwritten-set'],setup:'Input construction and encoding outside call timing; encoding recorded separately; full outputs consumed inside timing',validity:'Duplicate inputs reject in both lanes; complete positive outputs agree; inputs stay unchanged; shared wire codecs',consumed,rows},null,2));
