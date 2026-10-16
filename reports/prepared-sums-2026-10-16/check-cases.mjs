import assert from 'node:assert/strict';import fs from 'node:fs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)));
for(const file of ['program.mjs','flat.mjs']){
 // Count emitted source Map.empty initializers separately from the physical
 // sum view's private bookkeeping Maps. Instrumentation grants no authority.
 let builds=0;
 globalThis.__sumSourceMap=()=>{builds++;return new Map();};
 const raw=fs.readFileSync(new URL(file,import.meta.url),'utf8');
 const sites=[...raw.matchAll(/\blet v[0-9]+=new Map\(\)/g)];assert(sites.length>=3);
 const counted=raw.replace(/(\blet v[0-9]+=)new Map\(\)/g,'$1globalThis.__sumSourceMap()');
 fs.writeFileSync(new URL(file+'.counted.mjs',import.meta.url),counted);
 const m=await import(new URL(file+'.counted.mjs',import.meta.url)),c=m.compiledValues,sessions=new Map();let calls=0;
 for(const x of cases){
  const e=c[x.name],h=x.args.map((v,i)=>e.params[i].capture(v)),expected=m.valueCodecs[x.name].result.encode(x.expected);
  assert.deepEqual(e.result.encode(m.callCompiled(x.name,h)),expected);
  for(const fixed of [[],[0],[1],h.map((_,i)=>i),h.map((_,i)=>i).reverse()]){
   const key=x.name+':'+JSON.stringify(fixed.map(i=>[i,x.args[i]]));
   let token=sessions.get(key);if(!token){token=m.prepareCompiled(x.name,fixed.map(i=>[i,h[i]]));sessions.set(key,token);}
   for(let i=0;i<3;i++){
    assert.deepEqual(e.result.encode(m.callPreparedCompiled(token,h.filter((_,i)=>!fixed.includes(i)))),expected,x.name);calls++;
   }
  }
 }
 const tokens=Object.fromEntries(['optional','mapped','errors','folded','nested','receiver_work','with_default','owned','checked','mixed'].map(name=>[name,m.prepareCompiled(name,[[0,c[name].params[0].capture([1,2,3])]])]));
 const call=(name,...args)=>c[name].result.materialize(m.callPreparedCompiled(tokens[name],args.map((v,i)=>c[name].params[i+1].capture(v))));
 const stable=Object.fromEntries(['payload','payload_forward','result_payload','result_forward'].map(name=>[name,m.prepareCompiled(name,[[0,c[name].params[0].capture(name.startsWith('result')?{Ok:[1,2,3]}:{Some:[1,2,3]})]])]));
 const dynamic=m.prepareCompiled('payload_forward',[[1,c.payload_forward.params[1].capture(1)]]);
 const NativeMap=globalThis.Map;builds=0;
 try{
  assert.equal(call('optional',{None:null}),false);assert.equal(builds,0);
  for(const [value,want] of [[{Some:1},true],[{Some:7},false],[{None:null},false],[{Some:2},true]])assert.equal(call('optional',value),want);
  assert.equal(builds,1);
  assert.deepEqual(call('mapped',{Err:'missing'}),{Err:'missing'});assert.equal(builds,1);
  assert.deepEqual(call('mapped',{Ok:1}),{Ok:true});assert.deepEqual(call('mapped',{Ok:7}),{Ok:false});assert.equal(builds,2);
  assert.deepEqual(call('errors',{Ok:'ok'}),{Ok:'ok'});assert.equal(builds,2);
  assert.deepEqual(call('errors',{Err:1}),{Err:true});assert.deepEqual(call('errors',{Err:7}),{Err:false});assert.equal(builds,3);
  assert.equal(call('folded',{Ok:1}),true);assert.equal(builds,4);
  assert.equal(call('folded',{Err:1}),true);assert.equal(builds,5);
  assert.equal(call('folded',{Ok:7}),false);assert.equal(call('folded',{Err:7}),false);assert.equal(builds,5);
  assert.deepEqual(call('nested',{Ok:{None:null}}),{Ok:[]});assert.equal(builds,5);
  assert.deepEqual(call('nested',{Ok:{Some:1}}),{Ok:[true]});assert.equal(builds,6);
  assert.deepEqual(call('nested',{Err:{Ok:7}}),{Ok:[false]});assert.equal(builds,7);
  assert.deepEqual(call('nested',{Err:{Err:'missing'}}),{Err:'missing'});assert.equal(builds,7);
  for(const name of Object.keys(stable)){const before=builds;
   for(const q of [1,7,2]){
    const got=c[name].result.materialize(m.callPreparedCompiled(stable[name],[c[name].params[1].capture(q)]));
    assert.deepEqual(got,name.startsWith('result')?{Ok:q!==7}:q!==7);
   }
   assert.equal(builds,before+1,name+' retains captured payload work through wrappers');
  }
  const before=builds;
  for(const [x,want]of [[{Some:[1,2]},true],[{Some:[7]},false],[{None:null},false],[{Some:[1,2]},true]]){
   assert.equal(c.payload_forward.result.materialize(m.callPreparedCompiled(dynamic,[c.payload_forward.params[0].capture(x)])),want);
  }
  assert.equal(builds,before+3,'changing sum payloads rebuild');
  let at=builds;
  for(const q of [1,7,2])assert.equal(call('receiver_work',q),q!==7);
  assert.equal(builds,at+4,'receiver executes once per call; fixed captured index once');
  at=builds;
  assert.deepEqual(call('with_default',{None:null},7),{Err:7});assert.equal(builds,at+1);
  assert.deepEqual(call('with_default',{Some:1},9),{Ok:true});
  assert.deepEqual(call('with_default',{Some:7},4),{Ok:false});assert.equal(builds,at+4,'ok_or default remains strict');
  for(const [x,want] of [[{None:null},9],[{Some:7},7],[{Some:9},9],[{Some:7},7]]){
   const output=call('owned',x);assert.deepEqual(output,[1,2,3,want]);output[0]=99;
   assert.deepEqual(call('owned',x),[1,2,3,want]);
  }
  at=builds;
  assert.throws(()=>call('checked',{Some:1},false),/precondition/);assert.equal(builds,at);
  assert.equal(call('checked',{Some:1},true),true);assert.equal(builds,at+1);
  assert.throws(()=>call('checked',{Some:7},false),/precondition/);
  assert.equal(call('checked',{Some:7},true),false);assert.equal(builds,at+1);
  at=builds;
  assert.equal(call('mixed',{None:null},9),false);assert.equal(builds,at);
  for(const [q,offset,want] of [[1,0,true],[7,2,false],[0,1,true]])assert.equal(call('mixed',{Some:q},offset),want);
  assert.equal(builds,at+1,'partial record captures stay precise inside a sum arm');
 }finally{globalThis.Map=NativeMap;}
 const retry=m.prepareCompiled('optional',[[0,c.optional.params[0].capture([1,2,3])]]),sentinel=new Error('arm construction');let attempts=0;
 globalThis.Map=new Proxy(NativeMap,{construct(target,args){if(++attempts===1)throw sentinel;return Reflect.construct(target,args,target);}});
 const again=x=>c.optional.result.materialize(m.callPreparedCompiled(retry,[c.optional.params[1].capture(x)]));
 try{assert.equal(again({None:null}),false);assert.equal(attempts,0);assert.throws(()=>again({Some:7}),e=>e===sentinel);assert.equal(again({None:null}),false);assert.equal(again({Some:1}),true);assert.equal(again({Some:7}),false);assert.equal(attempts,2);}finally{globalThis.Map=NativeMap;}
 delete globalThis.__sumSourceMap;
 console.log(JSON.stringify({module:file,source_core:m.metadata.core_sha256,referenceCases:cases.length,calls,selectedArmsLazy:true,capturedPayloadRetained:true,dynamicPayloadFresh:true,defaultStrict:true,failedWorkRetried:true}));
}
