import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFile} from 'node:fs/promises';
import {join,resolve,basename} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const [folder,expected]=process.argv.slice(2),root=resolve(folder),storePath=join(root,'../'+basename(root)+'.service.inkstate');
const manifest=JSON.parse(await readFile(join(root,'artifact.json'),'utf8'));
const entry=join(root,manifest.entry);
const child=spawn(process.execPath,[fileURLToPath(new URL('../../examples/continuous-learning.mjs',import.meta.url)),entry,storePath],{stdio:['pipe','pipe','pipe']});
let error='',trained=false,paused=false,final=false;child.stderr.on('data',chunk=>error+=chunk);
const timeout=setTimeout(()=>child.kill('SIGTERM'),20000);
const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Service exit '+code+': '+error)));});
try {
 for await(const line of createInterface({input:child.stdout})) {
  const reply=JSON.parse(line);assert(!reply.service_error&&!reply.request_error,line);
  if(reply.training?.result.Ok.published_through===4){trained=true;child.stdin.write('{"service":"pause"}\n');}
  if(reply.service==='pause'){paused=true;child.stdin.write('{"id":"final-status","call":"status","args":[]}\n');}
  if(reply.id==='final-status'){assert.equal(reply.reply.result.Ok.pending,0);assert.equal(reply.reply.result.Ok.version,2);final=true;child.stdin.end();}
 }
 await done;assert(trained&&paused&&final);
 const {createState,restoreState}=await import(pathToFileURL(entry).href);
 const {DurableState}=await import(pathToFileURL(join(root,'hosts/durable-state.mjs')).href);
 const {openFileStore}=await import(pathToFileURL(join(root,'hosts/durable-file.mjs')).href);
 const host=await DurableState.open({factory:{create:createState,restore:restoreState},store:await openFileStore(storePath)});
 assert.deepEqual(Buffer.from(await host.checkpoint()),await readFile(expected));await host.close();
 console.log('Build-stage unfinished candidate -> compiled continuous service -> durable final checkpoint matched exactly.');
}finally{clearTimeout(timeout);child.kill();}
