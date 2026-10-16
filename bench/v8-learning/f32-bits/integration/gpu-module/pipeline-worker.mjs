import {loadInk} from './ink-gpu.mjs';
const engines=new Map();
let tail=Promise.resolve();
globalThis.onmessage=({data})=>{
  const task=tail.then(async()=>{
    if(!['cpu','javascript'].includes(data.backend))throw Error('invalid pure worker backend');
    const key=JSON.stringify([data.root,data.backend]);
    if(!engines.has(key))engines.set(key,loadInk(data.root,{gpu:false,policy:'static',staticBackend:data.backend}));
    const engine=await engines.get(key),m=engine.manifest;
    if(JSON.stringify([m.core_sha256,m.cpu_rust_sha256,m.javascript_sha256])!==data.identity)throw Error('pure worker compiled identity mismatch');
    const result=await engine.pipeline(data.plan,{backend:data.backend,placement:'whole'});
    globalThis.postMessage({id:data.id,result});
  });
  tail=task.catch(error=>globalThis.postMessage({id:data.id,error:String(error.message??error)}));
};
