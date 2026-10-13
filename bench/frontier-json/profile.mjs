// Diagnostic profiles start after construction and warmup. Never use these timings as benchmark results.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Session} from 'node:inspector';
import * as ink from '../../build/frontier-json/ink.mjs';
import * as indexed from '../../build/frontier-json/ink-indexed.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const mode=process.argv[2]??'row',session=new Session();let run;
if(mode.startsWith('row')){
 const f=JSON.parse(fs.readFileSync(path.join(root,'build/frontier-json/fixtures.json'))).find(f=>f.id==='replace-4096');
 const state=(mode==='row-indexed'?indexed:ink).createState();
 const row=r=>({...r,metadata:ink.parseJson(JSON.stringify(r.metadata))});
 for(const [key,value]of Object.entries(f.initial)){state.invoke('put',[key,row(value),false]);state.acknowledgeThrough(0xffffffffffffffffn,0xffffffffffffffffn);}
 let script=f.script.map(s=>({...s,args:[s.args[0],row(s.args[1]),false]}));
 if(mode==='row-prepared')script=script.map(s=>({...s,token:state.prepare(s.call,s.args)}));
 run=i=>{const s=script[i%script.length],r=s.token?state.invokePrepared(s.token):state.invoke(s.call,s.args);state.acknowledgeThrough(0xffffffffffffffffn,0xffffffffffffffffn);return Number(r.version)+r.events.length;};
}else{
 const doc=Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),i]));
 doc.unknown={nested:['雪',true,null,3],enabled:false};
 const text=JSON.stringify(doc),json=new ink.JsonCodec(ink.valueCodecs.identity.result),value=ink.parseJson('777'),wire=json.parseBinary(text);
 if(mode==='json-text')run=()=>json.stringify(ink.call('set_document',[json.parse(text),'k00000',value]).Ok).length;
 else if(mode==='json-validate')run=()=>json.validateBinary(wire)?1:0;
 else throw Error('unknown profile mode');
}
let sink=0;for(let i=0;i<500;i++)sink^=run(i);
session.connect();const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(e,r)=>e?reject(e):resolve(r)));
await post('Profiler.enable');await post('Profiler.start');
const deadline=performance.now()+2000;let calls=0;
do{sink^=run(calls++);}while((calls&255)!==0||performance.now()<deadline);
const {profile}=await post('Profiler.stop');session.disconnect();
fs.writeFileSync(path.join(root,`build/frontier-json/${mode}-steady.cpuprofile`),JSON.stringify(profile));
console.log(JSON.stringify({mode,calls,sink,diagnostic:true}));
