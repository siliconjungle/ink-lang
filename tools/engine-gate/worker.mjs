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
// A role owns its module, adapter and timed call sites. The coordinator never
// calls another build through those sites or shares its Function constructor ICs.
export async function openRole({module,workload,role}) {
  const t=performance.now();
  const m=await import(module+(module.includes('?')?'&':'?')+'engineGate='+role);
  const importMs=performance.now()-t,adapter=await import(workload);
  const verification=await adapter.verify(m);
  const cases=adapter.cases.map(c=>({name:c.name,lifetime:c.lifetime}));
  return {importMs,verification,cases,realm:{Array,Object,Function},time(name,n){
    const c=adapter.cases.find(c=>c.name===name);
    if(!c)throw Error('missing role case: '+name);
    const call=c.create(m);let value;const t=performance.now();
    for(let i=0;i<n;i++)value=call();
    return {ms:performance.now()-t,value};
  }};
}
async function browserRole(init) {
  const frame=document.createElement('iframe');frame.style.display='none';
  try {
    await new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error('benchmark realm failed to load'));document.body.append(frame);});
    const script=frame.contentDocument.createElement('script');script.type='module';
    const loaded=new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('benchmark realm module failed to load'));});
    script.textContent=`import {openRole} from ${JSON.stringify(import.meta.url)};globalThis.__inkEngineGateOpenRole=openRole;`;
    frame.contentDocument.head.append(script);await loaded;
    const api=await frame.contentWindow.__inkEngineGateOpenRole(init);
    return {...api,close(){frame.remove();}};
  }catch(error){frame.remove();throw error;}
}
export async function measure({baseline,candidate,workload,settings,reverse=false,createRole=browserRole}) {
  const imports={},roles={},verification={},urls={baseline,candidate,control:baseline};
  try {
    for(const name of reverse?['control','candidate','baseline']:['baseline','candidate','control']) {
      const role=await createRole({module:urls[name],workload,role:name});
      roles[name]=role;imports[name]=role.importMs;verification[name]=role.verification;
    }
    const roleRealms=Object.values(roles).map(role=>role.realm);
    if(roleRealms.every(realm=>realm.kind==='node-process')) {
      if(new Set(roleRealms.map(realm=>realm.pid)).size!==3 || roleRealms.some(realm=>realm.pid===process.pid || realm.node!==process.version || realm.v8!==process.versions.v8 || realm.execArgv.length))throw Error('ordinary independent Node processes required');
    }else for(const key of ['Array','Object','Function']) {
      const constructors=roleRealms.map(realm=>realm[key]);
      if(new Set(constructors).size!==3||constructors.includes(globalThis[key]))throw Error('benchmark realms share '+key+' feedback');
    }
    for(const name of ['candidate','control'])equal(roles[name].cases,roles.baseline.cases,'role cases');
    const rows=[];
    for(const c of roles.baseline.cases) {
      const time=(name,n)=>roles[name].time(c.name,n);
      let warm=settings.warmCalls;
      while(warm<settings.maxCalls && (await time('baseline',warm)).ms<settings.warmMs)warm*=2;
      for(const name of ['baseline','candidate','control'])await time(name,warm);
      let n=1;
      while(n<settings.maxCalls && (await time('baseline',n)).ms<settings.batchMs)n*=2;
      const samples={baseline:[],candidate:[],control:[]};
      for(let trial=0;trial<settings.samples;trial++) {
        const values={};
        for(const name of (trial+Number(reverse))%2?['control','candidate','baseline']:['baseline','candidate','control']) {
          const r=await time(name,n);samples[name].push(r.ms*1000/n);values[name]=r.value;
        }
        equal(values.baseline,values.candidate,c.name);equal(values.baseline,values.control,c.name+' A/A');
      }
      rows.push({name:c.name,lifetime:c.lifetime,callsPerBatch:n,warmCalls:warm,samplesUs:samples,
        candidateRatios:samples.candidate.map((v,i)=>v/samples.baseline[i]),
        controlRatios:samples.control.map((v,i)=>v/samples.baseline[i]),completeOutputsChecked:settings.samples});
    }
    return {isolation:'independent-roles',roleIsolation:roleRealms[0].kind==='node-process'?roleRealms:'same-thread-browser-realms',importsMs:imports,verification,rows};
  }finally{for(const role of Object.values(roles))await role.close();}
}
