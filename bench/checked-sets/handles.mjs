// Immutable handle lifecycle, with construction and transport costs separated.
import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';import {pathToFileURL} from 'node:url';
const file=path.resolve(process.argv[2]),m=await import(pathToFileURL(file)),now=()=>process.hrtime.bigint();
let consumed=0;const consume=value=>{if(typeof value==='boolean'){consumed=(consumed+Number(value))>>>0;return;}for(const x of value.items??value)consumed=(consumed+x)>>>0;};
const plain=(name,args)=>m.compiledValues[name].result.materialize(m.callCompiled(name,args));
const rows=[],setup=[];
for(const n of [0,16,64,256,1024,4096]){
 const aValues=Array.from({length:n},(_,i)=>i===0?0xffffffff:i-1),bValues=Array.from({length:n},(_,i)=>i+Math.floor(n/2));
 const raw=[...aValues,...aValues.slice(0,Math.floor(n/2))],begin=now(),input=m.compiledValues.make.params[0].capture(raw),captureNs=Number(now()-begin);
 const created=now(),a=m.callCompiled('make',[input]),b=m.callCompiled('make',[m.compiledValues.make.params[0].capture(bValues)]),constructionNs=Number(now()-created);
 const nativeBegin=now(),aSet=new Set(raw),bSet=new Set(bValues),nativeConstructionNs=Number(now()-nativeBegin);
 const hasItem=m.compiledValues.has.params[1].capture(0xfffffffe);
 const resultCodec=m.compiledValues.make.result,encodedAt=now(),bytes=resultCodec.encode(a),encodeNs=Number(now()-encodedAt),decodedAt=now(),decoded=resultCodec.decode(bytes),decodeNs=Number(now()-decodedAt);
 // Decoding gives schema-checked data; its value invariant is checked once at
 // first use. Successful source construction already establishes that fact.
 const validatedAt=now();assert.equal(plain('has',[decoded,hasItem]),false);const firstDecodedCallNs=Number(now()-validatedAt);
 setup.push({n,captureNs,constructionNs,nativeConstructionNs,encodeNs,decodeNs,firstDecodedCallNs,wireBytes:bytes.length});
 const cases={
  make:[()=>plain('make',[input]),()=>({items:[...new Set(raw)]})],
  distinct:[()=>plain('distinct',[a]),()=>true],
  has:[()=>plain('has',[a,hasItem]),()=>aSet.has(0xfffffffe)],
  union:[()=>plain('union',[a,b]),()=>({items:[...new Set([...aSet,...bSet])]})],
  intersection:[()=>plain('intersection',[a,b]),()=>({items:[...aSet].filter(x=>bSet.has(x))})],
  difference:[()=>plain('difference',[a,b]),()=>({items:[...aSet].filter(x=>!bSet.has(x))})],
 };
 for(const [name,methods]of Object.entries(cases)){
  assert.deepEqual(methods[0](),methods[1]());for(const method of methods){const end=now()+50_000_000n;do{consume(method());}while(now()<end);}
  const repetitions=Math.max(32,Math.floor(8192/Math.max(16,n))),samplesNs=[[],[]];
  for(let round=0;round<11;round++)for(let offset=0;offset<2;offset++){const lane=(round+offset)%2,at=now();for(let i=0;i<repetitions;i++)consume(methods[lane]());samplesNs[lane].push(Number(now()-at)/repetitions);}
  const medianNs=samplesNs.map(xs=>[...xs].sort((a,b)=>a-b)[5]);rows.push({n,name,repetitions,samplesNs,medianNs,inkOverHandwritten:medianNs[0]/medianNs[1]});
 }
 assert.deepEqual(resultCodec.materialize(a),{items:aValues});
}
const bad=m.compiledValues.has.params[0].capture({items:[1,1]}),item=m.compiledValues.has.params[1].capture(0);for(let i=0;i<2;i++)assert.throws(()=>m.callCompiled('has',[bad,item]),/precondition/);
console.log(JSON.stringify({schema:1,scope:'One u32 family; complete immutable-handle calls including detached output materialization and consumption; strong retained native Set controls',moduleSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),node:process.version,platform:process.platform,architecture:process.arch,warmup:'50 ms per lane; at least 32 complete calls per interleaved sample',setupScope:'Capture, source construction, native construction, encoding, decoding and first decoded invariant check recorded separately; shared-machine observations; memory unmeasured',consumed,setup,rows},null,2));
