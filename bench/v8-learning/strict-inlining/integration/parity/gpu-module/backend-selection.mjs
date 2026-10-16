// Decisions execute the same ink-abi Rust implementation used by native hosts.
import {selectionRequest} from './ink-selection.mjs';
import {pipelineScope} from './pipeline-contract.mjs';
export async function workloadFeatures(workload){return selectionRequest({operation:'features',workload});}
export function profileScope(manifest,entry){return JSON.stringify([manifest.core_sha256,manifest.cpu_rust_sha256,manifest.javascript_sha256,entry]);}
export async function validateCostProfile(profile,targetKey){await selectionRequest({operation:'validate',profile,target_key:targetKey});return profile==null?null:structuredClone(profile);}
// An explicit preparation owns one private snapshot and encoding. Opaque tokens
// hold no device or execution state and cannot be forged by shape or name.
// The caller accounts for preparation once and may reuse the token across engines.
const preparedProfiles=new WeakMap();
export async function prepareCostProfile(profile,targetKey){
 const existing=preparedProfiles.get(profile);
 const captured=existing?existing.profile:structuredClone(profile);
 await selectionRequest({operation:'validate',profile:captured,target_key:targetKey});
 if(captured==null)return null;
 const token=Object.freeze(Object.create(null));
 preparedProfiles.set(token,{profile:captured,encoded:existing?.encoded??JSON.stringify(captured)});
 return token;
}
export function captureCostProfile(profile){
 return preparedProfiles.has(profile)?profile:structuredClone(profile);
}
// The shared ABI decision is a pure function of these complete JSON inputs.
// Reuse across engines avoids resending an identical profile. No object identity,
// profile name, predicted cost, or partial workload key can establish a hit.
// Bound retained encodings as well as entry count; returned objects never alias.
const decisionGroups=new Map();
const MAX_DECISION_BYTES=8_000_000,MAX_DECISIONS=256;
let decisionBytes=0,decisionCount=0;
function forgetDecisions(optionsKey){
 const group=decisionGroups.get(optionsKey);if(!group)return;
 decisionBytes-=group.bytes;decisionCount-=group.values.size;decisionGroups.delete(optionsKey);
}
function cachedDecision(optionsKey,key){
 const group=decisionGroups.get(optionsKey);if(!group)return;
 const result=group.values.get(key);if(result===undefined)return;
 // Refresh the group's recency without changing any decision input.
 decisionGroups.delete(optionsKey);decisionGroups.set(optionsKey,group);return result;
}
function rememberDecision(optionsKey,key,result){
 const size=2*(key.length+result.length),header=2*optionsKey.length;
 if(size+header>MAX_DECISION_BYTES)return;
 let group=decisionGroups.get(optionsKey);
 if(group?.values.has(key))return;
 while(decisionGroups.size&&(decisionCount>=MAX_DECISIONS||decisionBytes+size+(group?0:header)>MAX_DECISION_BYTES)){
  forgetDecisions(decisionGroups.keys().next().value);group=decisionGroups.get(optionsKey);
 }
 if(!group){group={bytes:header,values:new Map()};decisionGroups.set(optionsKey,group);decisionBytes+=header;}
 group.values.set(key,result);group.bytes+=size;decisionBytes+=size;decisionCount++;
}

export function createSelector({policy='adaptive',staticBackend='cpu',costProfile=null,targetKey=''}={}){
 const prepared=preparedProfiles.get(costProfile);
 const options=structuredClone({policy,static_backend:staticBackend,target_key:targetKey,cost_profile:prepared?null:costProfile});
 if(prepared)options.cost_profile=prepared.profile;
 // Snapshot caller options once. Serialization is lazy, preserving constructor
 // behaviour and counting first-use profile preparation in the first decision.
 let optionsKey;
 const choose=async(eligible,context={})=>{
  const key=JSON.stringify({eligible,context});
  optionsKey??=JSON.stringify({policy:options.policy,static_backend:options.static_backend,target_key:options.target_key}).slice(0,-1)+',"cost_profile":'+(prepared?.encoded??JSON.stringify(options.cost_profile))+'}';
  const cached=cachedDecision(optionsKey,key);if(cached!==undefined)return JSON.parse(cached);
  // Capture before the Wasm loader can yield; caller mutation must not bind
  // a result for a different workload under the earlier key.
  const decision=await selectionRequest({options,...JSON.parse(key)});
  rememberDecision(optionsKey,key,JSON.stringify(decision));return decision;
 };
 return {
  choose,
  clear(){if(optionsKey!==undefined)forgetDecisions(optionsKey);},
  async run(key,candidates,selection='auto',context={}){
   const required=selection==='gpu-required';if(required)selection='gpu';
   const baseline=candidates.find(c=>c.name==='cpu');if(!baseline)throw Error('compiled CPU baseline required');
   if(!['auto','cpu','javascript','gpu'].includes(selection))throw Error('invalid backend selection');
   let decision;
   if(selection==='auto')decision=await choose(candidates.map(c=>c.name),context);
   else decision={backend:selection,reason:'explicit backend selection'};
   let chosen=candidates.find(c=>c.name===decision.backend);
   if(!chosen){if(required)throw Error('GPU required but unavailable for this computation');if(selection==='gpu')decision={backend:'cpu',reason:'GPU unavailable for this computation'};else throw Error('backend unavailable for this computation');chosen=baseline;}
   try{if(chosen.prepare)await chosen.prepare();return{result:await chosen.run(),backend:chosen.name,reason:decision.reason,profile:decision};}
   catch(error){if(required||chosen===baseline)throw error;if(baseline.prepare)await baseline.prepare();return{result:await baseline.run(),backend:'cpu',reason:`${chosen.name} fallback: ${error.message??error}`};}
  }
 };
}

// A forecast of open -> steps -> full output reads -> close. This is cost
// evidence only: it does not restrict subsequent legal session operations.
// Partial reads, writes or an unknown horizon have no comparable model here.
export function sessionWorkload(value){
 if(value==null)return null;
 if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['iterations','readbacks'].includes(k)))throw Error('session workload requires iterations and optional full readbacks');
 const iterations=value.iterations,readbacks=value.readbacks??1;
 if(!Number.isSafeInteger(iterations)||iterations<1||iterations>1_000_000||!Number.isSafeInteger(readbacks)||readbacks<0||readbacks>1_000_000)throw Error('session workload count limit');
 return {iterations,readbacks};
}
export async function sessionContext(manifest,p,workload,dispatches,preparation=null,objective='session'){
 if(!['session','engine'].includes(objective))throw Error('unsupported lifecycle cost objective');
 if(workload==null)return {};
 // A session ignores plan.iterations until step(n). Bind its actual topology,
 // including names -> constant slots, output ids and simultaneous feedback.
 // Distinct scope prevents ordinary-call/prepared-input profiles being reused.
 // Cold device/CPU initialization and missing shaders have different setup
 // costs. Unknown preparation state cannot match measured runtime contexts.
 const scope=JSON.stringify([objective==='engine'?'ink-resident-engine-v1':'ink-resident-session-v2',pipelineScope(manifest,{...p,iterations:1}),p.steps.map(s=>s.id),[...p.inputs].map(([name,r])=>[name,r.index]),workload.readbacks,preparation]);
 const features=await workloadFeatures({inputs:p.constants.map(c=>({list:c.type.kind==='list',count:c.count,bytes:c.words.byteLength})),outputs:p.outputs.map(id=>(p.steps[p.ids.get(id)].count??0)*workload.readbacks),stages:[{dispatches}],iterations:workload.iterations});
 return {scope,boundary:'captured-owned',features};
}
