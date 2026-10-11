// Bounded profiling of already eligible PURE execution candidates.
// Measurements choose a target; they never establish semantic applicability.
const median = xs => [...xs].sort((a,b)=>a-b)[1];
export function createSelector({expectedCalls=32,recheckEvery=32,clock=()=>performance.now()}={}) {
  if (!Number.isInteger(expectedCalls) || expectedCalls<1 || expectedCalls>100000 ||
      !Number.isInteger(recheckEvery) || recheckEvery<1 || recheckEvery>100000) throw Error('invalid profiling budget');
  const profiles=new Map(),startupCharged=new Set();
  return {
    clear(){profiles.clear();},
    async run(key,candidates,selection='auto') {
      const baseline=candidates.find(c=>c.name==='cpu');
      if(!baseline) throw Error('compiled CPU baseline required');
      if(!['auto','cpu','javascript','gpu'].includes(selection)) throw Error('backend must be auto, cpu, javascript or gpu');
      if(selection!=='auto') {
        const candidate=candidates.find(c=>c.name===selection);
        if(!candidate) {if(selection==='gpu')return {result:await baseline.run(),backend:'cpu',reason:'GPU unavailable for this computation'};throw Error(`backend ${selection} unavailable for this computation`);}
        try {if(candidate.prepare)await candidate.prepare();return {result:await candidate.run(),backend:selection,reason:'explicit backend selection'};}
        catch(error) {if(selection!=='gpu') throw error; return {result:await baseline.run(),backend:'cpu',reason:`GPU fallback: ${error.message??error}`};}
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
      catch(error) {profiles.delete(key);if(chosen===baseline)throw error;return {result:await baseline.run(),backend:'cpu',reason:`${chosen.name} fallback: ${error.message??error}`};}
    }
  };
}
