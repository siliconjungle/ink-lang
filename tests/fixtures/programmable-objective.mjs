import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const [folder,goalPath,out]=process.argv.slice(2),root=resolve(folder);
const bundle=JSON.parse(await fs.readFile(join(root,'bundle.json'),'utf8'));
const {createAdaptiveState}=await import(pathToFileURL(join(root,'adaptive-state.mjs')));
const {prepareInkObjective,objectiveIdentity}=await import(pathToFileURL(join(root,'objective.mjs')));
const model=await import(pathToFileURL(resolve(goalPath)));
const modules=Object.fromEntries(await Promise.all(bundle.artifacts.map(async a=>[a.id,await import(pathToFileURL(join(root,a.file)))])));
let executions=0;
function wrapped(state){
 return {bind(name){const call=state.bind(name);return (...args)=>{executions++;return call(...args);};},
   checkpoint:()=>state.checkpoint(),dispose:()=>state.dispose?.()};
}
const variants=Object.fromEntries(Object.entries(modules).map(([id,m])=>[id,{
 create:()=>wrapped(m.createState()),
 restore:async bytes=>{const state=m.createState();await state.restore(bytes);return wrapped(state);}
}]));
const baseline=modules.direct.createState();
const cells=ns=>Object.fromEntries(['put','zero','get','replace_zero','erase_zero'].map(name=>['action:'+name+'@s',{low_ns:ns,high_ns:ns}]));
// Synthetic prices intentionally make cached slower but smaller. They test
// objective semantics and checked migration, and are not performance evidence.
const profile={binding:bundle.binding,variants:{
 direct:{cells:cells(100),peak_bytes:400},cached:{cells:cells(200),peak_bytes:80}},
 migrations:['direct','cached'].map(from=>({from,to:from==='direct'?'cached':'direct',
   high_ns:5,peak_bytes:500,max_pause_ns:5,min_state_elements:0,max_state_elements:1000}))};
const policy={horizon_calls:100,min_residence_calls:1,stable_windows:2,min_gain:0.15,
 migration_margin:2,memory_limit_bytes:1000,max_pause_ns:1e9,max_switches:4};
const context=(latency,memory)=>({latency_weight:latency,memory_weight:memory,switch_penalty:0,preferences:[]});
const latency=await prepareInkObjective(model,{entry:'rank',revision:1,context:context(1,0)});
const mutable=context(0,1);
const memory=await prepareInkObjective(model,{entry:'rank',revision:2,context:mutable});
// Offline planning uses the same compiled goal and Rust/Wasm contract.
const requestPath=join(root,'objective-request.json'),configPath=join(root,'objective-config.json');
const previousPath=join(root,'previous-goal.json'),offlinePath=join(root,'offline-objective.json');
await fs.writeFile(requestPath,JSON.stringify({binding:bundle.binding,profile,policy,current:'direct',
 state:{pending:'cached',confirmations:1,last_switch_call:0,switches:0},
 window:{counts:{'action:zero@s':2},calls:2,total_calls:10,state_elements:1,saturated:false}}));
await fs.writeFile(configPath,JSON.stringify({entry:'rank',revision:2,context:mutable}));
await fs.writeFile(previousPath,JSON.stringify(objectiveIdentity(memory)));
execFileSync('python3',['planner/ink_planner/objective.py','--host-dir',root,'--goal-module',resolve(goalPath),
 '--adaptive',requestPath,'--configuration',configPath,'--previous-goal',previousPath,'-o',offlinePath]);
const offline=JSON.parse(await fs.readFile(offlinePath,'utf8'));
assert.equal(offline.decision.selected,'cached');
assert.deepEqual(offline.decision.goal,objectiveIdentity(memory));
mutable.memory_weight=0;mutable.latency_weight=1; // token owns the captured context
const diagnostic=[],host=await createAdaptiveState({binding:bundle.binding,profile,variants,
 baseline:'direct',policy,objective:latency,recording:{windowCalls:2,sampleEvery:1},onDiagnostic:e=>diagnostic.push(e)});
let observations=0;
const calls=[];
async function call(name,args=[]){
 const expected=baseline.bind(name)(...args);
 const actual=await host.call(name,args,{shape:'s',state_elements:1});
 assert.deepEqual(actual,expected);observations++;calls.push({name,args});
 assert.deepEqual(await host.checkpoint(),await baseline.checkpoint());
 return actual;
}
await call('put',[0n,9n]);for(let i=0;i<5;i++)await call('zero');
assert.equal(host.status().current,'direct');
const identity=objectiveIdentity(latency);
// Equivalent field order is not a stale goal.
await host.retarget(memory,{context:identity.context,revision:identity.revision,entry:identity.entry,source:identity.source});
assert.equal(host.status().usage.partial_calls,0);
for(let i=0;i<2;i++)await call('zero');assert.equal(host.status().current,'direct');
for(let i=0;i<2;i++)await call('zero');assert.equal(host.status().current,'cached',JSON.stringify({status:host.status(),diagnostic}));
assert.equal(host.status().state.switches,1);
const before=host.status();
await assert.rejects(host.retarget(latency,identity),/stale objective/);
assert.deepEqual(host.status(),before);
const memoryIdentity=objectiveIdentity(memory);
const queued=host.call('replace_zero',[17n,false],{shape:'s',state_elements:1});
const expected=baseline.bind('replace_zero')(17n,false);observations++;
const retarget=host.retarget(latency,memoryIdentity);
assert.deepEqual(await queued,expected);await retarget;
assert.equal(host.status().usage.partial_calls,0);
for(let i=0;i<4;i++)await call('zero');
assert.equal(host.status().current,'direct');assert.equal(host.status().state.switches,2);
await call('replace_zero',[22n,true]); // rejected mutation preserves both snapshots
assert.equal(executions,observations,'one compiled application call per accepted request');
const checkpoint=await host.checkpoint();
await host.restore(checkpoint);assert.equal(host.status().disabled,true);
await host.retarget(memory,objectiveIdentity(latency));assert.equal(host.status().disabled,true);
await host.close();

// Context identity preserves raw binary64 distinctions across capture.
const positive=await prepareInkObjective(model,{entry:'rank',context:context(0,0)});
const negative=await prepareInkObjective(model,{entry:'rank',context:context(-0,0)});
assert.notEqual(objectiveIdentity(positive).context,objectiveIdentity(negative).context);
await assert.rejects(prepareInkObjective(model,{entry:'missing',context:{}}),/compiled pure/);
await assert.rejects(createAdaptiveState({binding:bundle.binding,profile,variants,baseline:'direct',policy,objective:{}}),/forged objective/);
const gated=await createAdaptiveState({binding:bundle.binding,profile,variants,baseline:'direct',
 policy:{...policy,memory_limit_bytes:450},objective:memory,recording:{windowCalls:1}});
for(let i=0;i<4;i++)await gated.call('zero',[],{shape:'s',state_elements:0});
assert.equal(gated.status().current,'direct');await gated.close();
const unknown=await createAdaptiveState({binding:bundle.binding,profile,variants,baseline:'direct',
 policy,objective:memory,recording:{windowCalls:1}});
for(let i=0;i<4;i++)await unknown.call('zero',[],{shape:'unmeasured',state_elements:0});
assert.equal(unknown.status().current,'direct');assert.equal(unknown.status().disabled,false);await unknown.close();
const receipt={status:'passed',observations,switches:diagnostic.filter(e=>e.kind==='switched').length,
 goals:diagnostic.filter(e=>e.kind==='objective-changed').map(e=>e.goal),
 scope:'ordinary compiled Ink objective, proof-checked compiled application variants, full replies and exact checkpoints; synthetic prices are conformance inputs'};
if(out)await fs.writeFile(out,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
