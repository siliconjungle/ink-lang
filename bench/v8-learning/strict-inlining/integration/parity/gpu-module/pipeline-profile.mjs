// Explicit offline training for pure packed pipelines. Adaptive execution never
// calls this tool. Timed boundaries include capture, codecs, messages and output.
import {placementBackends} from './pipeline-contract.mjs';
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return a[Math.floor(a.length/2)]};
const equal=(a,b)=>{
  if(typeof a==='number'&&typeof b==='number')return Object.is(a,b);
  if(Array.isArray(a)||ArrayBuffer.isView(a))return (Array.isArray(b)||ArrayBuffer.isView(b))&&a.length===b.length&&Array.from(a).every((x,i)=>equal(x,b[i]));
  if(a&&b&&typeof a==='object'&&typeof b==='object')return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
  return a===b;
};
export async function collectPlacementObservations(engine,plans,{intervals=null,backends=placementBackends,samples=7,warmup=2}={}) {
  if(!Array.isArray(plans)||!plans.length||plans.length>16||!Number.isInteger(samples)||samples<1||samples>31||!Number.isInteger(warmup)||warmup<0||warmup>10)throw Error('placement training budget');
  if(!Array.isArray(backends)||!backends.length||backends.length>5||new Set(backends).size!==backends.length||backends.some(b=>!placementBackends.includes(b)))throw Error('invalid training backends');
  if(intervals!==null&&(!Array.isArray(intervals)||!intervals.length||intervals.length>64||intervals.some(a=>!Array.isArray(a)||a.length!==2||a.some(n=>!Number.isInteger(n)))))throw Error('invalid training intervals');
  // Capture the entire requested training set before the first await.
  plans=structuredClone(plans);
  const observations=[],scopes=new Set();let requests=0;
  const run=async(plan,backend)=>{
    if(++requests>4096)throw Error('placement training request budget');
    const start=performance.now(),result=await engine.pipeline(plan,{backend:'auto',placements:[{end:plan.steps.length,backend}]});
    return {result,ns:(performance.now()-start)*1e6};
  };
  for(const plan of plans) {
    const contexts=(await engine.describePipeline(plan)).filter(c=>!intervals||intervals.some(([start,end])=>c.start===start&&c.end===end));
    if(contexts.length>64)throw Error('choose at most 64 training intervals');
    const oracle=await engine.pipeline({...plan,iterations:1,feedback:undefined,outputs:plan.steps.map(s=>s.id)},{backend:'cpu'});
    const ids=new Map(plan.steps.map((s,i)=>[s.id,i]));
    for(const context of contexts) {
      if(!context.known)continue;
      scopes.add(context.scope);if(scopes.size>256)throw Error('placement training model budget');
      const inputs=Object.create(null);
      const steps=plan.steps.slice(context.start,context.end).map(step=>({...step,args:step.args.map(arg=>{
        if(arg&&typeof arg==='object'&&Object.hasOwn(arg,'step')&&Object.keys(arg).length===1) {
          if(ids.get(arg.step)>=context.start)return arg;
          const name=`step:${arg.step}`;inputs[name]=oracle.values[arg.step];return {input:name};
        }
        if(arg&&typeof arg==='object'&&Object.hasOwn(arg,'input')&&Object.keys(arg).length===1){inputs[arg.input]=plan.inputs[arg.input];return arg;}
        return arg;
      })}));
      const local={inputs,steps,outputs:context.outputs},reference=(await run(local,'cpu')).result.values;
      const timings={};
      // Alternate backend order between trials to reduce order/thermal bias.
      for(let trial=-warmup;trial<samples;trial++)for(const backend of (trial%2?backends.slice().reverse():backends)) {
        if(backend==='gpu'&&!context.gpu)continue;
        const {result,ns}=await run(local,backend);
        if(!equal(result.values,reference))throw Error(`training output mismatch: ${backend} [${context.start},${context.end})`);
        if(result.backend!==backend)continue; // fallback is not a target timing
        timings[backend]??={cold_ns:ns,samples_ns:[]};if(trial>=0)timings[backend].samples_ns.push(ns);
      }
      observations.push({scope:context.scope,boundary:context.boundary,features:context.features,backends:Object.fromEntries(Object.entries(timings).filter(([,t])=>t.samples_ns.length===samples).map(([b,t])=>[b,{...t,median_ns:median(t.samples_ns)}]))});
    }
  }
  return {schema:1,boundary:'captured-segment',requests,observations};
}

// New engines make lazy Wasm/device/worker startup visible. Collection is
// explicit, pure and bounded; driver/process caches remain environment state.
export async function collectPlacementStartup(load,plan,{backends=placementBackends,trials=3}={}) {
  if(typeof load!=='function'||!Number.isInteger(trials)||trials<1||trials>5||!Array.isArray(backends)||backends.length>5||backends.some(b=>!placementBackends.includes(b)))throw Error('invalid startup training');
  plan=structuredClone(plan);const records={},setup_ns={};
  for(const backend of backends) {
    const cold=[],warm=[];
    for(let trial=0;trial<trials;trial++) {
      const engine=await load();
      try {
        for(let i=0;i<4;i++) {
          const start=performance.now(),r=await engine.pipeline(plan,{placements:[{end:plan.steps.length,backend}]});const ns=(performance.now()-start)*1e6;
          if(r.backend!==backend)break;
          (i===0?cold:warm).push(ns);
        }
      }finally{await engine.close();}
    }
    if(cold.length===trials&&warm.length===trials*3){records[backend]={cold_ns:cold,warm_ns:warm};setup_ns[backend]=Math.max(0,Math.max(...cold)-median(warm));}
  }
  return {schema:1,setup_ns,records};
}
