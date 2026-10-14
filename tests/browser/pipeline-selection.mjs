import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'ink-planner-'));
await copyFile(new URL('../../planner/browser/pipeline-selection.mjs',import.meta.url),join(dir,'pipeline-selection.mjs'));
await copyFile(new URL('../../runtime/hosts/pipeline-contract.mjs',import.meta.url),join(dir,'pipeline-contract.mjs'));
const {createPipelineSelector,pipelineScope,segmentContext,segmentScope,fitPlacementProfile}=await import(pathToFileURL(join(dir,'pipeline-selection.mjs')));
await rm(dir,{recursive:true,force:true});
const type={kind:'list',element:{kind:'u32'}},manifest={core_sha256:'program',cpu_rust_sha256:'wasm',javascript_sha256:'js',shaders:{'map.wgsl':'shader'}};
function plan(independent=false) {
 const f={name:'map',result:type,shader:'map.wgsl',lengths:[0]};
 return {constants:[{type,count:100,finite:true}],steps:[{id:'a',f,args:[{kind:'constant',index:0,type,count:100}],count:100},{id:'b',f,args:[{kind:independent?'constant':'step',index:0,type,count:100}],count:100}],outputs:['a','b'],ids:new Map([['a',0],['b',1]]),feedback:new Map(),iterations:1};
}
function profile(p,prices) {
 const scope=pipelineScope(manifest,p);
 return {schema:1,target_key:'device',setup_ns:{cpu:0,javascript:0,gpu:0,'cpu-worker':0,'javascript-worker':0},models:Object.fromEntries(prices.map(([start,end,backends])=>[segmentScope(scope,start,end),{boundary:'captured-segment',domains:{input_elements:[0,1000]},backends:Object.fromEntries(Object.entries(backends).map(([b,price])=>[b,{intercept_ns:price,terms:{}}]))}]))};
}
test('complete GPU groups beat superficially faster individual stages after host bridge costs',()=>{
 const p=plan(),costs=profile(p,[[0,2,{cpu:100,gpu:45}],[0,1,{cpu:50,javascript:40,gpu:35}],[1,2,{cpu:50,javascript:40,gpu:35}]]);
 const selector=createPipelineSelector({placementProfile:costs,targetKey:'device'}),r=selector.choose(manifest,p,['cpu','javascript','gpu']);
 assert.deepEqual(r.segments,[{start:0,end:2,backend:'gpu'}]);assert.equal(r.cost_ns,45);
 costs.models[segmentScope(r.scope,0,2)].backends.gpu.intercept_ns=10000;
 assert.strictEqual(selector.choose(manifest,p,['cpu','javascript','gpu']),r,'observations and decisions are privately bound');
 assert.equal(selector.choose(manifest,p,['cpu','javascript']).segments[0].backend,'javascript');
});
test('bounded scheduling retains alternatives that exploit independent worker branches',()=>{
 const p=plan(true),costs=profile(p,[[0,2,{cpu:100}],[0,1,{cpu:50,'javascript-worker':60}],[1,2,{cpu:50,'javascript-worker':60}]]);
 const selector=createPipelineSelector({placementProfile:costs,targetKey:'device',parallelism:2});
 const r=selector.choose(manifest,p,['cpu','javascript-worker']);
 assert.deepEqual(r.segments.map(s=>s.backend).sort(),['cpu','javascript-worker']);assert.equal(r.cost_ns,60);
 const dependent=plan(false),dep=createPipelineSelector({placementProfile:profile(dependent,[[0,2,{cpu:100}],[0,1,{cpu:50,'javascript-worker':60}],[1,2,{cpu:50,'javascript-worker':60}]]),targetKey:'device',parallelism:2});
 assert.deepEqual(dep.choose(manifest,dependent,['cpu','javascript-worker']).segments,[{start:0,end:2,backend:'cpu'}]);
});
test('no baseline, domain miss, inadequate saving and changed compiled topology retain CPU',()=>{
 const p=plan();
 for(const rows of [[[0,2,{gpu:1}]],[[0,2,{cpu:100,gpu:91}]],[[0,1,{gpu:1}],[1,2,{gpu:1}]]]) {
  const selector=createPipelineSelector({placementProfile:profile(p,rows),targetKey:'device'});
  assert.equal(selector.choose(manifest,p,['cpu','gpu']).segments[0].backend,'cpu');
 }
 const costs=profile(p,[[0,2,{cpu:100,gpu:1}]]),selector=createPipelineSelector({placementProfile:costs,targetKey:'device'});
 const changed=plan();changed.constants[0].count=2000;assert.equal(selector.choose(manifest,changed,['cpu','gpu']).segments[0].backend,'cpu');
 assert.equal(selector.choose({...manifest,shaders:{'map.wgsl':'changed'}},p,['cpu','gpu']).segments[0].backend,'cpu');
 assert.equal(selector.choose({...manifest,runtime_host_sha256:'changed'},p,['cpu','gpu']).segments[0].backend,'cpu');
 assert.equal(selector.choose({...manifest,pipeline_planner_sha256:'changed'},p,['cpu','gpu']).segments[0].backend,'cpu');
 const topology=plan(true);assert.equal(selector.choose(manifest,topology,['cpu','gpu']).segments[0].backend,'cpu');
 assert.throws(()=>createPipelineSelector({placementProfile:costs,targetKey:'other'}),/target/);
});
test('segment boundaries include shared, requested and feedback results with unique ingress accounting',()=>{
 const p=plan();p.steps[1].args.push({...p.steps[1].args[0]});p.feedback.set('xs',0);
 const c=segmentContext(pipelineScope(manifest,p),p,0,1);
 assert.deepEqual(c.outputs,['a']);assert.equal(c.features.input_elements,100);
 assert.equal(segmentContext(c.scope,p,1,2).features.input_elements,100,'fanout does not double charge one captured input');
 p.steps[0].count=null;assert.equal(segmentContext(c.scope,p,1,2).known,false);assert.equal(segmentContext(c.scope,p,0,2).known,false,'unknown public capacity cannot become a zero-byte measured boundary');
});

test('dead worker capacity changes the cached schedule and zero workers cannot be selected',()=>{
 const p=plan(true),costs=profile(p,[[0,2,{cpu:100}],[0,1,{'javascript-worker':60}],[1,2,{'javascript-worker':60}]]);
 const selector=createPipelineSelector({placementProfile:costs,targetKey:'device',parallelism:2});
 assert.equal(selector.choose(manifest,p,['cpu','javascript-worker'],2).cost_ns,60);
 assert.equal(selector.choose(manifest,p,['cpu','javascript-worker'],1).segments[0].backend,'cpu');
 assert.equal(selector.choose(manifest,p,['cpu','javascript-worker'],0).segments[0].backend,'cpu');
});
test('offline fitting binds all feature domains and keeps a nonnegative upper envelope of training medians',()=>{
 const features=n=>({input_elements:n,input_bytes:n*4,output_capacity_elements:n,dispatches:2,iterations:1});
 const record={schema:1,boundary:'captured-segment',observations:[10,20].map(n=>({scope:'scope',boundary:'captured-segment',features:features(n),backends:{cpu:{median_ns:100+n},gpu:{median_ns:200-n}}}))};
 const result=fitPlacementProfile(record,{targetKey:'device',margin:1});
 assert.deepEqual(result.models.scope.domains.input_elements,[10,20]);assert.equal(result.models.scope.backends.cpu.terms.input_elements,1);assert.equal(result.models.scope.backends.gpu.terms.input_elements,0);assert.equal(result.models.scope.backends.gpu.intercept_ns,190);assert.ok(Object.isFrozen(result.models));
 record.observations[0].features.input_bytes=-1;assert.throws(()=>fitPlacementProfile(record,{targetKey:'device'}),/feature/);
});

test('cold setup is amortised once over the declared lifetime and charged once for repeated backend segments',()=>{
 const p=plan(),costs=profile(p,[[0,2,{cpu:100,gpu:10}]]);costs.setup_ns.gpu=10000;
 const short=createPipelineSelector({placementProfile:costs,targetKey:'device',expectedCalls:1});assert.equal(short.choose(manifest,p,['cpu','gpu']).segments[0].backend,'cpu');
 const long=createPipelineSelector({placementProfile:costs,targetKey:'device',expectedCalls:1000});assert.equal(long.choose(manifest,p,['cpu','gpu']).cost_ns,20);assert.equal(long.choose(manifest,p,['cpu','gpu'],0,['cpu','javascript','gpu']).cost_ns,10);
 const absent=profile(p,[[0,2,{cpu:100,gpu:10}]]);delete absent.setup_ns;
 assert.equal(createPipelineSelector({placementProfile:absent,targetKey:'device'}).choose(manifest,p,['cpu','gpu']).segments[0].backend,'cpu','unmeasured cold alternatives stay unavailable');
 const repeated=plan();repeated.iterations=4;const r=profile(repeated,[[0,2,{cpu:100}],[0,1,{gpu:10}],[1,2,{gpu:10}]]);r.setup_ns.gpu=1000;
 assert.equal(createPipelineSelector({placementProfile:r,targetKey:'device',expectedCalls:100}).choose(manifest,repeated,['cpu','gpu']).cost_ns,90);
});
