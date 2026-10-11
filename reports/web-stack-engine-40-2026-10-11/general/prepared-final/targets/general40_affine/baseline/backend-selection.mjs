// Bounded profiling of already eligible PURE execution candidates.
// Measurements choose a target; they never establish semantic applicability.
const median = xs => [...xs].sort((a,b)=>a-b)[1];
// Saved cost profiles affect profitability only. Candidates supplied by the
// compiled host remain the sole eligible implementations. No value probing.
const FEATURES = new Set(['input_elements','input_bytes','output_capacity_elements','dispatches','iterations']);
export function profileScope(manifest,entry) { return JSON.stringify([manifest.core_sha256,manifest.cpu_c_sha256,manifest.javascript_sha256,entry]); }
export function validateCostProfile(value,targetKey) {
  if(value == null)return null;
  if(value.schema!==1 || value.target_key!==targetKey || !value.models || typeof value.models!=='object' || Array.isArray(value.models))throw Error('invalid cost profile target/schema');
  const models=Object.entries(value.models);if(models.length>256)throw Error('cost profile model budget');
  for(const [scope,model]of models) {
    if(!scope || scope.length>4096 || !['captured-owned','resident-input-owned-readback'].includes(model.boundary) || !model.domains || !model.backends)throw Error('invalid cost profile model');
    for(const [name,range]of Object.entries(model.domains))if(!FEATURES.has(name)||!Array.isArray(range)||range.length!==2||range.some(x=>!Number.isFinite(x)||x<0)||range[0]>range[1])throw Error('invalid cost profile domain');
    for(const [backend,price]of Object.entries(model.backends)) {
      if(!['cpu','javascript','gpu'].includes(backend) || !Number.isFinite(price.intercept_ns)||price.intercept_ns<0||price.intercept_ns>1e12||!price.terms)throw Error('invalid backend cost');
      for(const [name,weight]of Object.entries(price.terms))if(!FEATURES.has(name)||!Object.hasOwn(model.domains,name)||!Number.isFinite(weight)||weight<0||weight>1e12)throw Error('invalid cost profile term');
    }
  }
  // Bind a private immutable copy once; callers cannot alter cached decisions.
  const copy=JSON.parse(JSON.stringify(value));
  const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x};return freeze(copy);
}
export function createSelector({expectedCalls=32,recheckEvery=32,clock=()=>performance.now(),policy='adaptive',staticBackend='cpu',costProfile=null,targetKey=''}={}) {
  if (!Number.isInteger(expectedCalls) || expectedCalls<1 || expectedCalls>100000 ||
      !Number.isInteger(recheckEvery) || recheckEvery<1 || recheckEvery>100000) throw Error('invalid profiling budget');
  if(!['adaptive','static','profile'].includes(policy)||!['cpu','javascript','gpu'].includes(staticBackend))throw Error('invalid execution policy');
  const saved=validateCostProfile(costProfile,targetKey);
  const profiles=new Map(),startupCharged=new Set();
  return {
    clear(){profiles.clear();},
    async run(key,candidates,selection='auto',context={}) {
      const baseline=candidates.find(c=>c.name==='cpu');
      if(!baseline) throw Error('compiled CPU baseline required');
      if(!['auto','cpu','javascript','gpu'].includes(selection)) throw Error('backend must be auto, cpu, javascript or gpu');
      if(selection!=='auto') {
        const candidate=candidates.find(c=>c.name===selection);
        if(!candidate) {if(selection==='gpu'){if(baseline.prepare)await baseline.prepare();return {result:await baseline.run(),backend:'cpu',reason:'GPU unavailable for this computation'};}throw Error(`backend ${selection} unavailable for this computation`);}
        try {if(candidate.prepare)await candidate.prepare();return {result:await candidate.run(),backend:selection,reason:'explicit backend selection'};}
        catch(error) {if(selection!=='gpu') throw error;if(baseline.prepare)await baseline.prepare(); return {result:await baseline.run(),backend:'cpu',reason:`GPU fallback: ${error.message??error}`};}
      }
      if(policy!=='profile') {
        const available=candidates.map(c=>c.name).join(',');
        const cacheKey=JSON.stringify([key,context.scope,context.boundary,context.features,available]);
        let decision=profiles.get(cacheKey);
        if(!decision) {
          let backend=policy==='static'?staticBackend:'cpu',reason=policy==='static'?'static execution policy':'no comparable saved profile; compiled CPU baseline';
          const model=policy==='adaptive'?saved?.models[context.scope]:null;
          const features=context.features??{},costs={};
          if(model && model.boundary===context.boundary && Object.entries(model.domains).every(([name,[lo,hi]])=>Number.isFinite(features[name])&&features[name]>=lo&&features[name]<=hi)) {
            for(const c of candidates) {
              const p=model.backends[c.name];if(!p)continue;
              const estimate=p.intercept_ns+Object.entries(p.terms).reduce((sum,[name,weight])=>sum+weight*features[name],0);
              if(Number.isFinite(estimate))costs[c.name]=estimate;
            }
            // A baseline estimate is necessary for a comparable saving.
            if(Object.hasOwn(costs,'cpu')) {
              let best='cpu';
              for(const c of candidates)if(Object.hasOwn(costs,c.name)&&costs[c.name]<costs[best])best=c.name;
              if(costs[best]<costs.cpu*0.9)backend=best;
              reason='saved target profile; 10% minimum predicted saving; no runtime probes';
            }
          }
          if(!candidates.some(c=>c.name===backend)){backend='cpu';reason='static target unavailable; compiled CPU baseline';}
          decision=Object.freeze({backend,reason,cost_ns:Object.freeze(costs),policy});
          if(profiles.size>=32)profiles.delete(profiles.keys().next().value);
          profiles.set(cacheKey,decision);
        }
        const chosen=candidates.find(c=>c.name===decision.backend)??baseline;
        try {if(chosen.prepare)await chosen.prepare();return {result:await chosen.run(),backend:chosen.name,reason:decision.reason,profile:decision};}
        catch(error) {profiles.delete(cacheKey);if(chosen===baseline)throw error;if(baseline.prepare)await baseline.prepare();return {result:await baseline.run(),backend:'cpu',reason:`${chosen.name} fallback: ${error.message??error}`};}
      }
      let profile=profiles.get(key);
      // Availability is dynamic: device loss or unsupported input can remove a target.
      const available=candidates.map(c=>c.name).join(',');
      if(!profile || profile.uses>=recheckEvery || profile.available!==available) {
        const times={},setups={},failures={};
        const ready=[];
        for(const c of candidates) {
          try {
            const start=clock();if(c.prepare)await c.prepare();
            setups[c.name]=(startupCharged.has(c.name)?0:(c.startupMs??0))+(clock()-start);
            startupCharged.add(c.name);times[c.name]=[];ready.push(c);
          } catch(error) {if(c===baseline)throw error;failures[c.name]=String(error);}
        }
        const reference=await baseline.run();
        for(let trial=0;trial<3;trial++) {
          const order=trial%2?[...ready].reverse():ready;
          for(const c of order) {
            if(failures[c.name])continue;
            try {
              const start=clock();let calls=0,elapsed;
              do {
                let value=c.run(); if(value && typeof value.then==='function') value=await value;
                if(c.verify && !c.verify(value,reference))throw Error(`${c.name}/compiled CPU result mismatch`);
                calls++;elapsed=clock()-start;
              } while(!c.async && elapsed<0.5 && calls<256);
              times[c.name].push(elapsed/calls);
            }catch(error){if(c===baseline)throw error;failures[c.name]=String(error);}
          }
        }
        const medians=Object.fromEntries(ready.filter(c=>!failures[c.name]).map(c=>[c.name,median(times[c.name])]));
        const costs=Object.fromEntries(Object.entries(medians).map(([name,ms])=>[name,ms+setups[name]/expectedCalls]));
        let backend='cpu';
        for(const c of ready) if(!failures[c.name] && costs[c.name]<costs[backend]*0.9) backend=c.name;
        profile={backend,times_ms:medians,setup_ms:setups,cost_ms:costs,failures,expected_calls:expectedCalls,available,uses:0};
        if(profiles.size>=32&&!profiles.has(key))profiles.delete(profiles.keys().next().value);
        profiles.set(key,profile);
      }
      profile.uses++;
      const chosen=candidates.find(c=>c.name===profile.backend)??baseline;
      try { return {result:await chosen.run(),backend:chosen.name,reason:'measured full execution cost; setup amortised over expected calls, 10% minimum saving',profile:{...profile}}; }
      catch(error) {profiles.delete(key);if(chosen===baseline)throw error;if(baseline.prepare)await baseline.prepare();return {result:await baseline.run(),backend:'cpu',reason:`${chosen.name} fallback: ${error.message??error}`};}
    }
  };
}
