// The same measurement body runs inside each fresh Node process / Chrome process.
export function equal(a,b,path='result') {
  if (Array.isArray(a)||ArrayBuffer.isView(a)) {
    if (!(Array.isArray(b)||ArrayBuffer.isView(b))||a.length!==b.length) throw Error(`${path}: length`);
    for(let i=0;i<a.length;i++) equal(a[i],b[i],`${path}[${i}]`);
  } else if(a && typeof a==='object') {
    if(!b||typeof b!=='object'||Object.keys(a).sort().join('\0')!==Object.keys(b).sort().join('\0')) throw Error(`${path}: keys`);
    for(const k of Object.keys(a)) equal(a[k],b[k],`${path}.${k}`);
  } else if(!Object.is(a,b)) throw Error(`${path}: unequal scalar`);
}
export const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
export async function measure({baseline,candidate,workload,settings,reverse=false}) {
  const imports={}, modules={};
  const urls={baseline,candidate,control:baseline};
  for(const name of reverse?['control','candidate','baseline']:['baseline','candidate','control']) {
    const t=performance.now();
    modules[name]=await import(urls[name]+(urls[name].includes('?')?'&':'?')+'engineGate='+name);
    imports[name]=performance.now()-t;
  }
  const adapter=await import(workload), verification={};
  for(const [name,module] of Object.entries(modules)) verification[name]=await adapter.verify(module);
  const rows=[];
  for(const c of adapter.cases) {
    const time=(name,n)=>{
      const call=c.create(modules[name]);let value;
      const t=performance.now();for(let i=0;i<n;i++) value=call();
      return {ms:performance.now()-t,value};
    };
    // Equal warmup counts, separate from calibration and measurement; fresh state per batch.
    let warm=settings.warmCalls;
    while(warm<settings.maxCalls && time('baseline',warm).ms<settings.warmMs) warm*=2;
    for(const name of ['baseline','candidate','control']) time(name,warm);
    let n=1;
    while(n<settings.maxCalls && time('baseline',n).ms<settings.batchMs) n*=2;
    const samples={baseline:[],candidate:[],control:[]};
    for(let trial=0;trial<settings.samples;trial++) {
      const values={};
      for(const name of (trial+Number(reverse))%2?['control','candidate','baseline']:['baseline','candidate','control']) {
        const r=time(name,n);samples[name].push(r.ms*1000/n);values[name]=r.value;
      }
      // Complete outputs, including the sequential model state, consumed outside timing.
      equal(values.baseline,values.candidate,c.name);equal(values.baseline,values.control,c.name+' A/A');
    }
    rows.push({name:c.name,lifetime:c.lifetime,callsPerBatch:n,warmCalls:warm,samplesUs:samples,
      candidateRatios:samples.candidate.map((v,i)=>v/samples.baseline[i]),
      controlRatios:samples.control.map((v,i)=>v/samples.baseline[i]),completeOutputsChecked:settings.samples});
  }
  return {importsMs:imports,verification,rows};
}
