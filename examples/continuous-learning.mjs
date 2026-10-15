// Build continuous-learning.ink as JavaScript, then serve JSONL action requests.
import {createInterface} from 'node:readline';
import {readFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DurableState} from '../runtime/hosts/durable-state.mjs';
import {openFileStore} from '../runtime/hosts/durable-file.mjs';
import {ScheduledActions} from '../runtime/hosts/scheduled-actions.mjs';
import {stringifyExactJSON} from '../runtime/hosts/state-wasm.mjs';
const [program,path,initial]=process.argv.slice(2);
if(!program||!path)throw Error('Usage: node examples/continuous-learning.mjs PROGRAM.mjs STORE [INITIAL.snapshot]');
const {createState,restoreState}=await import(pathToFileURL(resolve(program)).href);
const restore=restoreState??(async bytes=>{const state=await createState();await state.restore(bytes);return state;});
await mkdir(dirname(resolve(path)),{recursive:true});
const host=await DurableState.open({factory:{create:()=>initial?readFile(initial).then(restore):createState(),restore},store:await openFileStore(path)});
const output=value=>process.stdout.write(stringifyExactJSON(value)+'\n');
const service=new ScheduledActions({host,async plan(host){
 const version=await host.version();
 const reply=await host.invoke('schedule:'+version,'status',[]),status=reply.result.Ok;
 if(!status)throw Error('Session status rejected');
 if(status.paused||!status.pending)return null;
 return {id:'training:'+version,call:'pump',args:[],delayMs:5};
},onResult(reply){output({training:reply});if(!reply.committed)throw Error('Training rejected; inspect candidate/queue and explicitly recover');}});
let failed;
let running;
const start=()=>{failed=undefined;running=service.run().catch(error=>{failed=error;output({service_error:error.message});});};
const coordinate=value=>{
 if((typeof value!=='string'||!/^(0|[1-9][0-9]*)$/.test(value))&&!Number.isSafeInteger(value))throw Error('Event coordinates require exact unsigned integers');
 const n=BigInt(value);if(n<0n||n>18446744073709551615n)throw Error('Event coordinate domain');return n;
};
start();
try {
 for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})) {
  if(!line.trim())continue;
  try {
   if(Buffer.byteLength(line)>4*1024*1024)throw Error('Request byte limit');
   const request=JSON.parse(line);
   if(request.service) {
    if(request.service==='pause')await service.pause();
    else if(request.service==='resume'){service.resume();if(!service.running)start();}
    else if(request.service==='wake')service.wake();
    else throw Error('Unknown service control');
    output({service:request.service});continue;
   }
   if(request.acknowledge) {
    if(!Array.isArray(request.acknowledge)||request.acknowledge.length!==2)throw Error('Acknowledgement requires commit and position');
    const [commit,position]=request.acknowledge.map(coordinate);
    await host.acknowledge(commit,position);output({acknowledged:[commit,position]});continue;
   }
   const {id,call,args}=request;
   const reply=await host.invoke(id,call,args);output({id,reply});service.wake();
  } catch(error){output({request_error:error.message});}
 }
} finally {
 // Quiesce the current turn. Pending observations remain in durable source state;
 // shutdown does not silently drain, discard, or publish an unfinished candidate.
 await service.stop().catch(error=>{failed??=error;});await running;await host.close();
}
if(failed)process.exitCode=1;
