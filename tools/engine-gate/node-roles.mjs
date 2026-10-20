// Each role uses an ordinary Node default realm. V8 serialization preserves
// exceptional floats and typed values; IPC and output transfer are outside time.
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export async function createNodeRole(init) {
  const child=fork(fileURLToPath(new URL('./node-role.mjs',import.meta.url)),[],{
    execArgv:[],serialization:'advanced',stdio:['ignore','ignore','pipe','ipc']});
  let serial=0,errors='';const pending=new Map();
  const fail=error=>{for(const p of pending.values())p.reject(error);pending.clear();};
  child.stderr.on('data',data=>{errors=(errors+data).slice(-16000);});
  child.on('error',fail);
  child.on('exit',(code,signal)=>fail(Error(`benchmark role exited (${code??signal}): ${errors}`)));
  child.on('message',({id,value,error})=>{const p=pending.get(id);if(!p)return;pending.delete(id);error?p.reject(Error(error)):p.resolve(value);});
  const request=(op,args)=>new Promise((resolve,reject)=>{
    const id=++serial;pending.set(id,{resolve,reject});
    child.send({id,op,args},error=>{if(error){pending.delete(id);reject(error);}});
  });
  try {
    const api=await request('open',init);
    return {...api,time:(name,n)=>request('time',{name,n}),async close(){
      const exited=new Promise(resolve=>child.once('exit',resolve));
      await request('close');await exited;
    }};
  }catch(error){if(child.connected)child.disconnect();throw error;}
}
