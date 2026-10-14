import test from 'node:test';
import assert from 'node:assert/strict';
import {replayContracts} from './contract-replay.mjs';

const fixture={name:'contract',steps:[{pure:'copy',args:[['18446744073709551615']],expect_gpu:true}],wanted:[{reply:{value:[18446744073709551615n]},snapshot:[0]}]};
function packed(abi='ink-packed-pipeline-v2') {
  const calls=[];
  const host={manifest:{runtime_abi:abi,javascript:{functions:[{name:'copy',params:[{type:{kind:'list',element:{kind:'u64'}}}]}]}},calls};
  const call=async(name,args,backend)=>{assert.equal(typeof args[0][0],'bigint');calls.push(backend);return {value:args[0],backend:backend==='gpu-required'?'gpu':backend};};
  if(abi==='ink-scalar-pipeline-v1')host.run=call;
  else host.call=(name,args,{backend})=>call(name,args,backend);
  return host;
}
function stateful({corrupt=false,mutateOnRestore=false}={}) {
  const host=packed();host.manifest.runtime_abi='ink-module-v1';
  host.manifest.javascript.state={actions:[{name:'set',params:[{type:{kind:'u32'}}]}]};
  const states=[];
  function create() {
    let value=0;
    const state={disposed:false,invoke:(_,[v])=>{value=v;return {ok:true};},snapshot:()=>[value+(corrupt?1:0)],checkpoint:async()=>[value+(corrupt?1:0)],restore:async()=>{if(mutateOnRestore)value++;throw Error('invariant rejected');},dispose(){this.disposed=true;}};
    states.push(state);return state;
  }
  host.createState=create;host.createJavaScriptState=create;
  host.restoreState=()=>{throw Error('invariant rejected');};
  return {host,states};
}
test('pure packed and scalar ABIs preserve exact values and explicit backend requests without state methods',async()=>{
  for(const abi of ['ink-packed-pipeline-v2','ink-scalar-pipeline-v1']) {
    const host=packed(abi),r=await replayContracts(host,fixture);
    assert.deepEqual(host.calls,['cpu','javascript','gpu-required']);
    assert.deepEqual(r,{name:'contract',abi,comparisons:3,gpu_calls:1,rejectedRestores:0,snapshotComparisons:0});
  }
});
test('packed ABI rejects state actions and restore fixtures before execution',async()=>{
  for(const step of [{call:'set',args:[1]},{reject_restore:[1]}]) {
    const host=packed();await assert.rejects(replayContracts(host,{...fixture,steps:[step]}),/state fixture requires/);assert.equal(host.calls.length,0);
  }
});
test('state module checks snapshots after every value and action and rejects restore atomically',async()=>{
  const {host,states}=stateful();
  const r=await replayContracts(host,{name:'state',steps:[...fixture.steps,{call:'set',args:[7]},{reject_restore:[8]}],wanted:[...fixture.wanted,{reply:{outcome:{ok:true}},snapshot:[7]}]});
  assert.equal(r.comparisons,6);assert.equal(r.snapshotComparisons,6);assert.equal(r.rejectedRestores,3);
  assert.equal(states.length,3);assert.ok(states.every(s=>s.disposed));
});
test('corrupt state snapshots and mutation on rejected restore remain failures',async()=>{
  const bad=stateful({corrupt:true});await assert.rejects(replayContracts(bad.host,fixture),/snapshot differs/);assert.ok(bad.states.every(s=>s.disposed));
  const mutated=stateful({mutateOnRestore:true});await assert.rejects(replayContracts(mutated.host,{...fixture,steps:[...fixture.steps,{reject_restore:[1]}]}),/restore was not atomic/);assert.ok(mutated.states.every(s=>s.disposed));
});
test('missing replies, unsupported ABI and silent required GPU fallback fail',async()=>{
  await assert.rejects(replayContracts(packed(),{...fixture,wanted:[]}),/reply count differs/);
  await assert.rejects(replayContracts(packed('unknown'),fixture),/unsupported contract replay ABI/);
  const host=packed();host.call=async(_,args)=>({value:args[0],backend:'cpu'});
  await assert.rejects(replayContracts(host,fixture),/required GPU fell back/);
});

test("packed companions replay real values and snapshots and reject mismatches",async()=>{
 for(const corruption of ["none","value","snapshot"]){
  let disposed=0;const pureStateModule={create:()=>({pure:(_,args)=>corruption==="value"?[]:args[0],snapshot:()=>corruption==="snapshot"?[1]:[0],dispose:()=>{disposed++;}})};
  const work=replayContracts(packed(),{...fixture,pureStateModule});
  if(corruption==="none"){const result=await work;assert.equal(result.snapshotComparisons,3);assert.equal(disposed,3);}
  else {await assert.rejects(work,/replay differs|snapshot differs/);assert.equal(disposed,1);}
 }
});
