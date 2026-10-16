// External bounded cost search. Profiles are observations, never proof premises.
import {placementBackends,pipelineScope,segmentContext,segmentContexts} from './pipeline-contract.mjs';
export {pipelineScope,segmentContext,segmentScope} from './pipeline-contract.mjs';
export function validatePlacementProfile(value,targetKey) {
  if(value==null)return null;
  if(value.schema!==1||value.target_key!==targetKey||!value.models||typeof value.models!=='object'||Array.isArray(value.models))throw Error('invalid placement profile target/schema');
  const models=Object.entries(value.models);
  if(models.length>256)throw Error('placement profile model budget');
  if(JSON.stringify(value).length>4*1024*1024)throw Error('placement profile byte budget');
  if(value.setup_ns!==undefined&&(typeof value.setup_ns!=='object'||Array.isArray(value.setup_ns)||value.setup_ns===null||Object.entries(value.setup_ns).some(([b,n])=>!placementBackends.includes(b)||!Number.isFinite(n)||n<0||n>1e12)))throw Error('invalid placement setup cost');
  const features=new Set(['input_elements','input_bytes','output_capacity_elements','dispatches','iterations']);
  for(const [scope,m]of models) {
    if(scope.length>65536||m.boundary!=='captured-segment'||!m.domains||!m.backends)throw Error('invalid placement model');
    for(const [k,r]of Object.entries(m.domains))if(!features.has(k)||!Array.isArray(r)||r.length!==2||r.some(n=>!Number.isFinite(n)||n<0)||r[0]>r[1])throw Error('invalid placement domain');
    for(const [backend,cost]of Object.entries(m.backends)) {
      if(!placementBackends.includes(backend)||!cost||!Number.isFinite(cost.intercept_ns)||cost.intercept_ns<0||cost.intercept_ns>1e12||!cost.terms)throw Error('invalid placement cost');
      for(const [k,v]of Object.entries(cost.terms))if(!features.has(k)||!Object.hasOwn(m.domains,k)||!Number.isFinite(v)||v<0||v>1e12)throw Error('invalid placement term');
    }
  }
  const copy=JSON.parse(JSON.stringify(value));
  const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v};return freeze(copy);
}
export function segmentPrices(profile,context,available) {
  const m=profile?.models[context.scope];
  if(!context.known||!m||Object.entries(m.domains).some(([k,[lo,hi]])=>!Number.isFinite(context.features[k])||context.features[k]<lo||context.features[k]>hi))return {};
  const prices={};
  for(const backend of available) {
    if(backend==='gpu'&&!context.gpu)continue;
    const c=m.backends[backend];if(!c)continue;
    const price=c.intercept_ns+Object.entries(c.terms).reduce((n,[k,v])=>n+v*context.features[k],0);
    if(Number.isFinite(price))prices[backend]=price;
  }
  return prices;
}
export function createPipelineSelector({placementProfile=null,targetKey='',parallelism=0,expectedCalls=32}={}) {
  if(!Number.isInteger(expectedCalls)||expectedCalls<1||expectedCalls>1000000)throw Error('expectedCalls must be 1..1000000');
  const saved=validatePlacementProfile(placementProfile,targetKey),cache=new Map();let lastManifest=null;
  return {
    clear(){cache.clear()},
    choose(manifest,p,available,workerCount=parallelism,ready=['javascript']) {
      workerCount=Math.max(0,Math.min(parallelism,workerCount));
      const n=p.steps.length;
      if(lastManifest!==manifest){cache.clear();lastManifest=manifest;}
      // The generated host freezes metadata. A warm cache hit need not rebuild
      // large emitted-source/hash scope strings. Mutable test/external metadata
      // still enters the key so mutation cannot reuse an old decision.
      const topology=[p.constants.map(c=>c.type),p.steps.map(s=>[s.f.name,s.args.map(a=>a.input?['i',a.input]:[a.kind,a.index])]),p.outputs,[...p.feedback],p.iterations];
      const key=JSON.stringify([Object.isFrozen(manifest)?null:manifest,topology,p.constants.map(c=>[c.count,c.finite]),p.steps.map(s=>s.count),available,workerCount,ready,expectedCalls]);
      if(cache.has(key))return cache.get(key);
      const scope=pipelineScope(manifest,p);
      const full=segmentContext(scope,p,0,n),fullPrices=segmentPrices(saved,full,available);
      // Whole-segment prices always describe one pass, so comparison against
      // partitioned execution accounts for the same number of passes.
      const setup=backend=>ready.includes(backend)?0:saved?.setup_ns?.[backend];
      const baseline=fullPrices.cpu===undefined?undefined:fullPrices.cpu+(setup('cpu')??0)/expectedCalls/p.iterations;
      let choice={scope,segments:[{start:0,end:n,backend:'cpu'}],reason:'no comparable placement profile; compiled CPU baseline',cost_ns:null,baseline_ns:baseline??null};
      if(baseline!==undefined) {
        const beams=Array.from({length:n+1},()=>[]);
        beams[0]=[{cost:0,segments:[],finish:[],main:0,gpu:0,workers:Array(Math.max(1,workerCount)).fill(0),activated:new Set(ready)}];
        let queries=0,attempts=0;
        // Only the at-most-256 explicitly saved intervals are queried. This
        // bounds planning independently of the combinatorial placement space.
        const intervals=[];
        for(const k of Object.keys(saved.models)) {
          let parts;try{parts=JSON.parse(k)}catch{continue}
          if(Array.isArray(parts)&&parts[0]===scope&&Number.isInteger(parts[1])&&Number.isInteger(parts[2])&&parts[1]>=0&&parts[1]<parts[2]&&parts[2]<=n)intervals.push([parts[1],parts[2]]);
        }
        intervals.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
        for(const [start,end]of intervals) {
          queries++;if(!beams[start].length)continue;
          const context=segmentContext(scope,p,start,end),prices=segmentPrices(saved,context,available);
          for(const state of beams[start])for(const backend of placementBackends)if(prices[backend]!==undefined&&(!backend.endsWith('-worker')||workerCount>0)&&(backend==='cpu'||setup(backend)!==undefined)&&attempts++<40960) {
            let readyAt=0;
            for(let i=start;i<end;i++)for(const a of p.steps[i].args)if(a.kind==='step'&&a.index<start)readyAt=Math.max(readyAt,state.finish[a.index]);
            const next={...state,activated:new Set(state.activated),finish:state.finish.slice(),workers:state.workers.slice(),segments:[...state.segments,{start,end,backend}]};
            const cost=prices[backend]+(state.activated.has(backend)?0:(setup(backend)??0)/expectedCalls/p.iterations);next.activated.add(backend);
            let finish;
            if(backend.endsWith('-worker')) {
              let lane=0;for(let i=1;i<next.workers.length;i++)if(next.workers[i]<next.workers[lane])lane=i;
              finish=Math.max(readyAt,next.workers[lane])+cost;next.workers[lane]=finish;
            }else if(backend==='gpu'){finish=Math.max(readyAt,next.gpu)+cost;next.gpu=finish;}
            else {finish=Math.max(readyAt,next.main)+cost;next.main=finish;}
            for(let i=start;i<end;i++)next.finish[i]=finish;
            next.cost=Math.max(state.cost,finish);
            beams[end].push(next);
          }
          beams[end].sort((a,b)=>a.cost-b.cost);beams[end].length=Math.min(32,beams[end].length);
        }
        const best=beams[n][0];
        if(best&&best.segments.some(s=>s.backend!=='cpu')&&best.cost<baseline*0.9)choice={scope,segments:best.segments,reason:'saved complete segment costs; bounded parallel scheduling and amortised startup; 10% saving over CPU; no runtime probes',cost_ns:best.cost*p.iterations,baseline_ns:baseline*p.iterations,queries,attempts:Math.min(attempts,40960)};
        else choice={...choice,reason:'placement profile retains CPU at 10% saving threshold',cost_ns:baseline*p.iterations,baseline_ns:baseline*p.iterations,queries};
      }
      for(const s of choice.segments)Object.freeze(s);Object.freeze(choice.segments);Object.freeze(choice);
      if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,choice);return choice;
    },
    contexts(manifest,p) {
      return segmentContexts(manifest,p);
    },
    prices: (context,available)=>segmentPrices(saved,context,available),
  };
}

// Offline nonnegative affine fit. Held-out COMPLETE requests still gate use:
// fitting isolated segments cannot prove that overlapping tasks are profitable.
export function fitPlacementProfile(record,{targetKey,margin=1.15,setupNs}={}) {
  if(record?.schema!==1||record.boundary!=='captured-segment'||!Array.isArray(record.observations)||record.observations.length>1024||typeof targetKey!=='string'||!Number.isFinite(margin)||margin<1||margin>4)throw Error('invalid placement observations');
  const groups=new Map();
  for(const row of record.observations){if(row.boundary!=='captured-segment'||!row.features||!row.backends)throw Error('invalid placement observation');const rows=groups.get(row.scope)??[];rows.push(row);groups.set(row.scope,rows);}
  const models={};
  for(const [scope,rows]of groups) {
    const keys=['input_elements','input_bytes','output_capacity_elements','dispatches','iterations'];
    const domains=Object.fromEntries(keys.map(k=>{const a=rows.map(r=>r.features[k]);if(a.some(n=>!Number.isFinite(n)||n<0))throw Error('invalid observed feature');return [k,[Math.min(...a),Math.max(...a)]]}));
    const backends={};
    for(const backend of placementBackends) {
      if(rows.some(r=>!r.backends[backend]))continue;
      const xs=rows.map(r=>r.features.input_elements),ys=rows.map(r=>r.backends[backend].median_ns);
      if(ys.some(n=>!Number.isFinite(n)||n<0))throw Error('invalid observed cost');
      const mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=ys.reduce((a,b)=>a+b,0)/ys.length;
      const variance=xs.reduce((n,x)=>n+(x-mx)**2,0),slope=variance?Math.max(0,xs.reduce((n,x,i)=>n+(x-mx)*(ys[i]-my),0)/variance):0;
      // Upper envelope of training medians, with an additional cost margin.
      const intercept=Math.max(0,...ys.map((y,i)=>y-slope*xs[i]));
      backends[backend]={intercept_ns:intercept*margin,terms:{input_elements:slope*margin}};
    }
    if(backends.cpu)models[scope]={boundary:'captured-segment',domains,backends};
  }
  return validatePlacementProfile({schema:1,target_key:targetKey,models,...(setupNs?{setup_ns:setupNs}:{})},targetKey);
}
