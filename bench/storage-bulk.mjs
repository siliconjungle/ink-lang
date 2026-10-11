import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
const files=JSON.parse(process.argv[2]);
const modules=await Promise.all(files.map(async ([label,file])=>[label,await import(pathToFileURL(path.resolve(file)))]));
const bool=process.argv[3]==='boolean';
let checksum=0;
for(const n of [16,128,1024]){
 const states=[];
 for(const [label,module] of modules){const state=module.createState();for(let i=0;i<n;i++)await state.invoke_json(bool?'insert':'put',bool?[i,true,false]:[i,i*13]);state.acknowledge_through(state.version,0);states.push([label,state]);}
 const phases=bool?['any_query','all_query','insert','replace','erase']:['get-hot','get-cold','put','erase'];
 for(const phase of phases){
  const times=Object.fromEntries(states.map(([label])=>[label,[]]));const iterations=phase==='insert'?16:phase==='put'||phase==='replace'||phase==='erase'?32:512;
  const args=i=>bool?phase==='insert'?[n+i,true,false]:phase==='replace'?[n-1,(i%2)===0,false]:phase==='erase'?[n+100,false]:[]:phase==='get-hot'?[1023]:phase==='get-cold'?[n-1]:phase==='put'?[n-1,i+1]:[n+100,false];
  const action=phase.startsWith('get-')?'get':phase;
  for(const [,state] of states){for(let i=0;i<16;i++)if(phase!=='insert')await state.invoke_json(action,args(i));state.acknowledge_through(state.version,0);}
  for(let sample=0;sample<7;sample++){
   for(const [label,state] of sample%2?[...states].reverse():states){
    // Setup, outbox acknowledgement and teardown remain outside this action phase.
    const start=performance.now();
    for(let i=0;i<iterations;i++){const result=await state.invoke_json(action,args(i+sample*iterations));checksum^=Number(result.version&255n);}
    times[label].push(Math.round((performance.now()-start)*1e6/iterations));state.acknowledge_through(state.version,0);
   }
  }
  const replies=await Promise.all(states.map(async ([,s])=>s.invoke_json(bool?'get':'get',[n-1])));
  for(const reply of replies.slice(1))assert.deepEqual(reply,replies[0]);
  for(const [label] of states)console.log(JSON.stringify({label,rows:n,phase:'action:'+phase,samples_ns:times[label],iterations,transport:'public generated JavaScript invoke_json, including argument/result conversion and events'}));
 }
}
assert(Number.isInteger(checksum));
