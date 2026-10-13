// Paired candidate experiment. Both modules run in one process in rotated order.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import{fileURLToPath,pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const mode=process.argv[2]??'codec',candidate=process.argv[3];if(!candidate)throw Error('candidate module required');
const baseline=process.argv.find(a=>a.startsWith('--baseline='))?.slice('--baseline='.length)??'build/frontier-json/ink.mjs';
const paths={baseline,candidate};
const label=path.basename(candidate,'.mjs');if(!/^[a-z0-9-]+$/.test(label))throw Error('candidate label');
const runLabel=process.argv.find(a=>a.startsWith('--run='))?.slice('--run='.length);
const copyKind=process.argv.find(a=>a.startsWith('--copy='))?.slice('--copy='.length)??'capture';
const textFields=Number(process.argv.find(a=>a.startsWith('--fields='))?.slice('--fields='.length)??512);
const textFixture=process.argv.find(a=>a.startsWith('--text-fixture='))?.slice('--text-fixture='.length)??'numeric';
if(!Number.isSafeInteger(textFields)||textFields<1||textFields>10000)throw Error('invalid text field count');
if(!['numeric','unicode','nested'].includes(textFixture))throw Error('invalid text fixture');
if(!['capture','trusted'].includes(copyKind))throw Error('copy kind');
if(runLabel&&!/^[a-z0-9-]+$/.test(runLabel))throw Error('run label');
const reportPath=path.join(root,`reports/frontier-json-2026-10-13/variants-${mode}-${label}${runLabel?'-'+runLabel:''}.json`);
if(fs.existsSync(reportPath))throw Error('report already exists; choose a fresh --run label');
const hashes=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,createHash('sha256').update(fs.readFileSync(path.resolve(root,p))).digest('hex')]));
const modules=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([k,p])=>[k,await import(pathToFileURL(path.resolve(root,p)).href)])));
const groups={};let sink=0;
if(mode==='codec'){
 const text=JSON.stringify(Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),i])));
 for(const[name,ink]of Object.entries(modules)){
  const json=new ink.JsonCodec(ink.valueCodecs.identity.result),value=json.parse(text),next=ink.parseJson('777');
  assert.equal(json.stringify(value),text);
  const wire=json.parseBinary(text),nextWire=json.parseBinary('777'),args=ink.valueCodecs.set_document.arguments;
  const binaryPipeline=()=>{const doc=json.parseBinary(text),request=args.encodeWith(w=>w.frame(w=>{w.bytes(doc.subarray(40));w.frame(w=>w.text('k00000'));w.bytes(nextWire.subarray(40));})),reply=ink.callBinary('set_document',request);assert.equal(reply[44],0);const result=new Uint8Array(40+reply.length-45);result.set(doc.subarray(0,40));result.set(reply.subarray(45),40);return json.stringifyBinary(result);};
  assert.equal(JSON.parse(binaryPipeline()).k00000,777);
  for(const[operation,run]of Object.entries({'logical-validation':()=>json.values.validateValue(value)?1:0,'binary-encode':()=>json.values.encode(value).length,'binary-decode':()=>json.values.decode(wire).payload?1:0,'text-edit-text':()=>json.stringify(ink.call('set_document',[json.parse(text),'k00000',next]).Ok).length,'binary-schema-validation':()=>json.values.validate(wire)?1:0,'binary-json-validation':()=>json.validateBinary(wire)?1:0,'binary-edit-text':()=>binaryPipeline().length})){
   (groups[operation]??={})[name]=run;
  }
 }
}else if(mode==='ownership'){
 const text=JSON.stringify(Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),i])));
 for(const[name,ink]of Object.entries(modules)){
  const json=new ink.JsonCodec(ink.valueCodecs.identity.result),value=json.parse(text),next=ink.parseJson('777');
  const copy=name==='candidate'?v=>copyKind==='trusted'?json.values.copy(v):json.values.capture(v):v=>structuredClone(v);
  const edit=name==='candidate'&&copyKind==='trusted'?()=>ink.callOwned('set_document',[value,'k00000',next]).Ok:()=>copy(ink.call('set_document',[value,'k00000',next]).Ok);
  const owned=copy(value);assert.deepEqual(owned,value);owned.payload.Err.Err.Err.Err.Err.item0[0].key='changed';assert.equal(json.stringify(value),text);
  for(const[operation,run]of Object.entries({'copy-owned-json':()=>copy(value).payload?1:0,'edit-owned-json':()=>edit().payload?1:0})){
   (groups[operation]??={})[name]=run;
  }
 }
}else if(mode==='text'||mode==='text-bytes'){
 const encoder=new TextEncoder(),consume=mode==='text-bytes'?text=>encoder.encode(text).length:text=>text.length;
 const text=JSON.stringify(Object.fromEntries(Array.from({length:textFields},(_,i)=>['k'+String(i).padStart(5,'0'),textFixture==='unicode'?`雪😀${i}\n"\\`:textFixture==='nested'?{items:[i,true,null,'雪😀'],enabled:false}:i])));
 for(const[name,ink]of Object.entries(modules)){
  const json=new ink.JsonCodec(ink.valueCodecs.identity.result),value=json.parse(text),next=ink.parseJson('777');
  assert.equal(json.stringify(value),text);
  for(const[operation,run]of Object.entries({'parse-owned-json':()=>json.parse(text).payload?1:0,'render-checked-json':()=>consume(json.stringify(value)),'text-edit-text':()=>consume(json.stringify(ink.call('set_document',[json.parse(text),'k00000',next]).Ok))})){
   (groups[operation]??={})[name]=run;
  }
 }
}else if(mode==='transport'){
 for(const[name,ink]of Object.entries(modules)){
  const values=ink.valueCodecs.identity.result,codec=await ink.createValueCodec({kind:'record',name:'Update',fields:[{name:'key',type:{kind:'string'}},{name:'value',type:values.descriptor.root}]},values.descriptor.named),value={key:'k00000',value:ink.parseJson('777')};
  for(const[format,encoder]of Object.entries({portable:codec,compact:codec.compact()})){
   const bytes=encoder.encode(value);assert.deepEqual(encoder.decode(bytes),value);
   (groups['encode-'+format]??={})[name]=()=>encoder.encode(value).length;
   (groups['decode-'+format]??={})[name]=()=>encoder.decode(bytes).key.length;
  }
 }
}else if(mode==='row'){
 const f=JSON.parse(fs.readFileSync(path.join(root,'build/frontier-json/fixtures.json'))).find(f=>f.id==='replace-4096');
 for(const[name,ink]of Object.entries(modules)){
  const state=ink.createState(),row=r=>({...r,metadata:ink.parseJson(JSON.stringify(r.metadata))});
  for(const[key,r]of Object.entries(f.initial)){state.invoke('put',[key,row(r),false]);state.acknowledgeThrough(0xffffffffffffffffn,0xffffffffffffffffn);}
  const script=f.script.map(s=>[s.args[0],row(s.args[1]),false]);
  (groups['replace-owned-row']??={})[name]=i=>{const r=state.invoke('put',script[i%script.length]);state.acknowledgeThrough(0xffffffffffffffffn,0xffffffffffffffffn);return r.events[0].value;};
 }
}else throw Error('unknown variant mode');
const measure=(run,count)=>{const at=process.hrtime.bigint();for(let i=0;i<count;i++)sink^=run(i);return Number(process.hrtime.bigint()-at);};
const measurements=[];
for(const[operation,lanes]of Object.entries(groups)){
 const counts={};for(const[name,run]of Object.entries(lanes)){measure(run,100);counts[name]=Math.max(10,Math.min(100000,Math.ceil(50000000/(measure(run,100)/100))));}
 for(let round=0;round<15;round++)for(const name of round%2?['baseline','candidate']:['candidate','baseline']){
  global.gc?.();const calls=counts[name],elapsed_ns=measure(lanes[name],calls);measurements.push({operation,lane:name,round,calls,elapsed_ns});
 }
}
for(const[k,p]of Object.entries(paths))assert.equal(createHash('sha256').update(fs.readFileSync(path.resolve(root,p))).digest('hex'),hashes[k],'artifact changed during timing');
fs.writeFileSync(reportPath,JSON.stringify({schema:1,diagnostic_experiment:true,instrumented:process.execArgv.some(a=>a.startsWith("--cpu-prof")||a.startsWith("--prof")||a.startsWith("--trace")),copy_kind:copyKind,text_fields:textFields,text_fixture:textFixture,consume_utf8:mode==='text-bytes',paths,hashes,measurements,sink,scope:'Paired source candidate experiment on a shared host. Setup excluded; compare candidate ratios, not historical absolute timings.'},null,2)+'\n',{flag:'wx'});
