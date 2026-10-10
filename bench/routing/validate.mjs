import {loadRoute} from './ink-route.mjs';
import {loadInk} from './ink-gpu.mjs';
const output=document.querySelector('#result');
try {
  const fixtures=await (await fetch('./fixtures.json')).json();
  const route=await loadRoute('./'),cpu=await loadInk('./',{backend:'cpu'});
  let comparisons=0,gpuCalls=0;const costs=[];
  for(const fixture of fixtures){
    const start=performance.now(),baseline=await cpu.run('entry',fixture.args),baselineMs=performance.now()-start;
    const result=await route.run(fixture.args);
    if(result.value!==fixture.expected||baseline.value!==fixture.expected)throw Error('oracle mismatch');
    if(result.stages[1].backend!=='cpu')throw Error('finishing stage did not run on CPU');
    gpuCalls+=result.stages.filter(s=>s.backend==='gpu').length;comparisons+=2;
    costs.push({length:fixture.args[0].length,baseline_ms:baselineMs,...result});
  }
  if(gpuCalls!==fixtures.length)throw Error(`expected actual GPU stages, got ${gpuCalls}/${fixtures.length}: ${costs[0].stages[0].reason}`);
  const xs=new Uint32Array([100,200,300,0xffffffff]),expected=1921;
  const pending=route.run([xs,3,100]);xs.fill(0);if((await pending).value!==(expected>>>0))throw Error('caller input mutation changed captured computation');
  const concurrent=await Promise.all([route.run([[100],3,1]),route.run([[200],3,2])]);
  if(concurrent[0].value!==308||concurrent[1].value!==609)throw Error('concurrent input crossed graph boundary');
  let rejected=0;for(const args of [[[4294967296],1,1],[[1],-1,1],[[1],1,true],[[1],1]]){try{await route.run(args);}catch{rejected++;}}
  if(rejected!==4)throw Error('invalid original arguments admitted');
  const profiles=[];
  for(const length of (location.hash.includes("correctness-only") ? [] : [32,4096,1048576])){
    const xs=new Uint32Array(length);for(let i=0;i<length;i++)xs[i]=(Math.imul(i,1664525)+1013904223)>>>0;
    const args=[xs,3,7],cpuTimes=[],mixedTimes=[];let reference;
    // Separate profiling from correctness fixtures. Calibrate clock granularity
    // with bounded repeated complete calls, including capture and transfers.
    for(let trial=0;trial<3;trial++){
      const sampleCPU=async()=>{const start=performance.now();let calls=0,elapsed;do{reference=await cpu.run('entry',args);calls++;elapsed=performance.now()-start;}while(elapsed<1&&calls<256);cpuTimes.push(elapsed/calls);};
      const sampleMixed=async()=>{const r=await route.run(args);mixedTimes.push(r.total_ms);if(reference&&r.value!==reference.value)throw Error('profile result mismatch');};
      if(trial%2){await sampleMixed();await sampleCPU();}else{await sampleCPU();await sampleMixed();}
    }
    profiles.push({length,cpu_ms:cpuTimes,mixed_ms:mixedTimes});
  }
  await route.close();try{await route.run([[1],1,1]);throw Error('closed runtime executed');}catch(e){if(!String(e).includes('closed'))throw e;}
  await cpu.close();
  output.textContent=JSON.stringify({status:'passed',comparisons,gpuCalls,capture_and_concurrent_checks:true,invalid_arguments_rejected:rejected,profiles,costs},null,2);
}catch(e){output.textContent=JSON.stringify({status:'failed',error:String(e),stack:e.stack});}
