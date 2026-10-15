import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';

const [baselinePath,selectedPath,processIndex='0']=process.argv.slice(2);
const order=Number(processIndex)%2?['selected','baseline']:['baseline','selected'];
const paths={baseline:resolve(baselinePath),selected:resolve(selectedPath)};
const modules={},startup={};
for(const name of order){
  modules[name]=await import(pathToFileURL(join(paths[name],'program.mjs')));
  const start=performance.now(),state=await modules[name].createState();
  startup[name]=performance.now()-start;state.dispose?.();
}
const samples=[];
for(const rows of [0,32,1024]){
  const states={};
  for(const name of order){
    states[name]=await modules[name].createState();
    for(let key=0;key<rows;key++)states[name].invoke('put',[key,key*3,false]);
  }
  const snapshot=async state=>Buffer.from(await state.checkpoint());
  assert.deepEqual(await snapshot(states.baseline),await snapshot(states.selected));
  for(const key of [0,7,rows])for(const x of [0,1,255,256,65535])
    assert.deepEqual(states.baseline.invoke('serve',[key,x]),states.selected.invoke('serve',[key,x]));
  const run=(state,count)=>{
    let checksum=0;
    for(let i=0;i<count;i++){
      const reply=state.invoke('serve',[i%Math.max(1,rows+1),i&65535]);
      checksum=(checksum+Number(reply.result)+Number(reply.version)+reply.events.length+Number(reply.committed))>>>0;
    }
    return checksum;
  };
  for(const name of order)run(states[name],10000);
  for(let sample=0;sample<7;sample++){
    const current=sample%2?[...order].reverse():order,checksums={};
    for(const name of current){
      const start=performance.now();checksums[name]=run(states[name],10000);
      samples.push({rows,sample,plan:name,iterations:10000,elapsed_ms:performance.now()-start,checksum:checksums[name]});
    }
    assert.equal(checksums.baseline,checksums.selected);
  }
  assert.deepEqual(await snapshot(states.baseline),await snapshot(states.selected));
  for(const state of Object.values(states))state.dispose?.();
}
console.log(JSON.stringify({process:Number(processIndex),node:process.version,startup_ms:startup,samples,
  scope:'complete state.invoke calls with changing u64 inputs, reply consumption and independent checkpoint controls; preparation excluded from serving samples'}));
