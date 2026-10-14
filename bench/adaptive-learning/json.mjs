import fs from'node:fs';import assert from'node:assert/strict';
import{createJsonLookup,parseJson,stringifyJson}from'../../abi/src/json-value.mjs';
function rawLookup(text){
 let root=parseJson(text);
 const variant=v=>{let p=v.payload,index=0;while(index<5&&Object.hasOwn(p,'Err')){p=p.Err;index++;}return {index,item:(index<5?p.Ok:p).item0};};
 const find=(root,path)=>{let v=root;for(const key of path){const o=variant(v);if(o.index!==5)throw Error('expected object');const m=o.item.find(m=>m.key===key);if(!m)return {found:false};v=m.value;}return {found:true,value:v};};
 return {lookup(path){const r=find(root,path);return r.found?{found:true,value:structuredClone(r.value)}:r;},set(path,key,text){const value=parseJson(text),next=structuredClone(root),r=find(next,path);if(!r.found)throw Error('missing');let p=r.value.payload;for(let i=0;i<5;i++)p=p.Err;p.item0=[{key,value},...p.item0.filter(m=>m.key!==key)];stringifyJson(next);root=next;},replace(text){root=parseJson(text);},stringify(){return stringifyJson(root);},stats(){return {};}};
}
const output=process.argv[2],rotation=Number(process.env.BENCH_ROTATION??0);
const scenarios=[{name:'hot_flat',size:1024,reads:8192},{name:'changing_paths',size:1024,reads:8192,random:true},{name:'short_session',size:1024,reads:8},{name:'small',size:8,reads:8192},{name:'writes',size:128,reads:1024,writeEvery:4},{name:'nested_local_updates',size:128,reads:2048,nested:true,writeEvery:128},{name:'shape_changes',size:128,reads:2048,replaceEvery:64},{name:'missing',size:1024,reads:8192,missing:true}];
const results=[],modes=['raw_linear','linear','incremental','eager'];
for(const spec of scenarios){
 const object=Object.fromEntries(Array.from({length:spec.size},(_,i)=>['k'+i,{value:String(i)}]));const text=JSON.stringify(spec.nested?{hot:object,cold:{unchanged:1}}:object);
 for(const mode of [...modes.slice(rotation%4),...modes.slice(0,rotation%4)]){
  const t=performance.now();const view=mode==='raw_linear'?rawLookup(text):createJsonLookup(text,{stepEntries:mode==='linear'?0:mode==='eager'?4096:16,minReads:mode==='eager'?1:4,maxEntries:4096,maxIndexBytes:1024*1024});
  let checksum=0;
  for(let i=0;i<spec.reads;i++){
   if(spec.writeEvery&&i%spec.writeEvery===0)view.set(spec.nested?['hot']:[],'k0',JSON.stringify({value:String(i)}));
   if(spec.replaceEvery&&i%spec.replaceEvery===0)view.replace(JSON.stringify({...object,extra:i%128?'changed':[]}));
   const key=spec.missing?'absent':'k'+(spec.random?(i*137)%spec.size:spec.size-1),p=[...(spec.nested?['hot']:[]),key,'value'];
   const value=view.lookup(p);if(value.found)checksum+=Number(stringifyJson(value.value).slice(1,-1));
  }
  const elapsed_ns=(performance.now()-t)*1e6;results.push({scenario:spec.name,mode,elapsed_ns,checksum,stats:view.stats(),final:view.stringify()});
 }
 const rows=results.filter(r=>r.scenario===spec.name);assert.ok(rows.every(r=>r.checksum===rows[0].checksum&&r.final===rows[0].final));
}
// Compare exact JSON boundary values against parsed logical carriers, including
// unknown shapes, null, exact decimal spelling, arrays, Unicode and failures.
for(const text of ['null','[1,null,"日本語"]','{"__proto__":-0,"n":1.2300e+1000}']){const v=createJsonLookup(text);assert.deepEqual(v.lookup([]).value,parseJson(text));assert.equal(v.stringify(),stringifyJson(parseJson(text)));}
fs.writeFileSync(output,JSON.stringify({rotation,scope:'Owned JSON read-view API; setup, lookup result copies and updates included. Same exact-token logical carrier for every mode. Eager means first-touch index construction, not a native JS object.',results:results.map(({final,...r})=>r)},null,2));
console.log(JSON.stringify(results.map(({scenario,mode,elapsed_ns,stats})=>({scenario,mode,ms:elapsed_ns/1e6,built:stats.built_entries}))));
