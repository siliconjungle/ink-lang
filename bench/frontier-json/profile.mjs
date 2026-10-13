// Diagnostic profiles start after construction and warmup. Never use these timings as benchmark results.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {Session} from 'node:inspector';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const mode=process.argv[2]??'row',session=new Session();let run;
const modulePath=process.argv.find(a=>a.startsWith('--module='))?.slice('--module='.length)??(mode==='row-indexed'?'build/frontier-json/ink-indexed.mjs':'build/frontier-json/ink.mjs');
const artifactPath=path.resolve(root,modulePath),hash=()=>createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex'),artifactHash=hash();
const ink=await import(pathToFileURL(artifactPath).href);
const runLabel=process.argv.find(a=>a.startsWith('--run='))?.slice('--run='.length);
if(runLabel&&!/^[a-z0-9-]+$/.test(runLabel))throw Error('run label');
const output=path.join(root,`build/frontier-json/${mode}${runLabel?'-'+runLabel:''}-steady.cpuprofile`);
if(fs.existsSync(output))throw Error('profile exists; choose a fresh --run label');
if(mode.startsWith('row')){
 const f=JSON.parse(fs.readFileSync(path.join(root,'build/frontier-json/fixtures.json'))).find(f=>f.id==='replace-4096');
 const state=ink.createState();
 const row=r=>({...r,metadata:ink.parseJson(JSON.stringify(r.metadata))});
 for(const [key,value]of Object.entries(f.initial)){state.invoke('put',[key,row(value),false]);state.acknowledgeThrough(0xffffffffffffffffn,0xffffffffffffffffn);}
 let script=f.script.map(s=>({...s,args:[s.args[0],row(s.args[1]),false]}));
 if(mode==='row-prepared')script=script.map(s=>({...s,token:state.prepare(s.call,s.args)}));
 run=i=>{const s=script[i%script.length],r=s.token?state.invokePrepared(s.token):state.invoke(s.call,s.args);state.acknowledgeThrough(0xffffffffffffffffn,0xffffffffffffffffn);return Number(r.version)+r.events.length;};
}else{
 const doc=Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),i]));
 doc.unknown={nested:['雪',true,null,3],enabled:false};
 const text=JSON.stringify(doc),json=new ink.JsonCodec(ink.valueCodecs.identity.result),value=ink.parseJson('777'),wire=json.parseBinary(text),logical=json.parse(text);
 if(mode==='json-text')run=()=>json.stringify(ink.call('set_document',[json.parse(text),'k00000',value]).Ok).length;
 else if(mode==='json-validate')run=()=>json.validateBinary(wire)?1:0;
 else if(mode==='json-parse')run=()=>json.parse(text).payload?1:0;
 else if(mode==='json-stringify')run=()=>json.stringify(logical).length;
 else if(mode==='json-edit')run=()=>ink.call('set_document',[logical,'k00000',value]).Ok.payload?1:0;
 else if(mode==='json-copy-checked')run=()=>json.values.capture(logical).payload?1:0;
 else if(mode==='json-copy-trusted')run=()=>json.values.copy(logical).payload?1:0;
 else if(mode==='json-owned')run=()=>ink.callOwned('set_document',[logical,'k00000',value]).Ok.payload?1:0;
 else throw Error('unknown profile mode');
}
let sink=0;for(let i=0;i<500;i++)sink^=run(i);
session.connect();const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(e,r)=>e?reject(e):resolve(r)));
await post('Profiler.enable');await post('Profiler.start');
const deadline=performance.now()+2000;let calls=0;
do{sink^=run(calls++);}while((calls&255)!==0||performance.now()<deadline);
const {profile}=await post('Profiler.stop');session.disconnect();
if(hash()!==artifactHash)throw Error('artifact changed during profiling');
fs.writeFileSync(output,JSON.stringify(profile),{flag:'wx'});
const receipt={mode,calls,sink,diagnostic:true,module:modulePath,sha256:artifactHash,profile:path.relative(root,output),scope:'CPU samples after warmup; timings do not establish performance gains.'};
fs.writeFileSync(output+'.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt));
