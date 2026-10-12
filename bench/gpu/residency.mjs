#!/usr/bin/env node
// Browser-host twin of residency.py. The measuring function runs in any
// page that can load a bundle (pass the engine from loadInk); the CLI runs
// it under Node with Dawn's WebGPU.
//   node bench/gpu/residency.mjs SESSION_BUNDLE PARTICLES_BUNDLE [--quick] [--out FILE]
// Times are wall-clock; on a software adapter they measure the mechanism,
// not GPU performance.
export function workloads(rnd) {
  const one=(input,call,args,small)=>(xs=>({plan:{inputs:{[input]:xs},steps:[{id:'out',call,args:[{input},...args]}],feedback:{[input]:'out'},outputs:['out']},small}));
  return {
    'life (element-wise stencil)':{bundle:'session',make:n=>{const w=Math.floor(Math.sqrt(n));return {...one('cells','life',[w,w],{step:'out',reduce:'sum'})(Array.from({length:w*w},()=>rnd()<0.3?1:0)),elements:w*w};}},
    'particles (element-wise records)':{bundle:'particles',make:n=>({...one('xs','particles',[0.01],{step:'out',reduce:'bounds',field:'position'})(Array.from({length:n},()=>({position:[0,0,0].map(()=>rnd()*200-100),velocity:[0,0,0].map(()=>rnd()*10-5),mass:1+rnd()*9}))),elements:n})},
    'prefix (parallel scan, feedback)':{bundle:'session',make:n=>({...one('xs','prefix',[],{step:'out',reduce:'max'})(Array.from({length:n},()=>Math.floor(rnd()*4))),elements:n})},
    'shuffle (map + radix sort, feedback)':{bundle:'session',make:n=>({...one('xs','shuffle',[],{step:'out',reduce:'bounds'})(Array.from({length:n},()=>Math.floor(rnd()*2000)-1000)),elements:n})},
  };
}
const now=()=>performance.now()/1e3;
async function timed(f){const t=now(),value=await f();return {value,seconds:now()-t};}
export async function measure(engine, plan, small, backend, k1, k2, oneshot) {
  // A first session compiles pipelines and creates the device.
  const warm=await engine.open(plan,{backend});await warm.step(1);await warm.finish();await warm.close();
  const opened=await timed(async()=>{const s=await engine.open(plan,{backend});await s.finish();return s;}),s=opened.value;
  if(s.backend!==(backend==='cpu'?'cpu':'gpu'))throw Error(`${backend} session ran on ${s.backend}: ${s.reason}`);
  const first=await timed(async()=>{await s.step(1);await s.finish();});
  const a=await timed(async()=>{await s.step(k1);await s.finish();}),b=await timed(async()=>{await s.step(k2);await s.finish();});
  const smallRead=await timed(()=>s.read(small)),full=await timed(()=>s.read({outputs:['out']}));
  await s.close();
  let steady=(b.seconds-a.seconds)/(k2-k1);steady=Math.max(steady,b.seconds/k2/4);
  const out={backend:s.backend,open_s:opened.seconds,upload_bytes:s.counters.upload_bytes,first_step_s:first.seconds,steady_s_per_iteration:steady,
    small_read_s:smallRead.seconds,small_read_bytes:smallRead.value.counters.readback_bytes,full_read_s:full.seconds,full_read_bytes:full.value.counters.readback_bytes};
  out.fixed_s=out.open_s+out.full_read_s;
  if(oneshot){let t=0;for(let i=0;i<oneshot;i++)t+=(await timed(()=>engine.pipeline({...plan,iterations:1},{backend}))).seconds;out.oneshot_s_per_iteration=t/oneshot;}
  return out;
}
export function breakEven(g,c) {
  const gain=c.steady_s_per_iteration-g.steady_s_per_iteration,extra=g.fixed_s-c.fixed_s;
  return gain<=0?null:extra>0?Math.max(1,Math.ceil(extra/gain)):1;
}
export async function residency(engines, {sizes=[4096,65536,262144,1048576], k=[10,110], seed=1, log=()=>{}}={}) {
  let state=seed>>>0||1;const rnd=()=>{state^=state<<13;state>>>=0;state^=state>>>17;state^=state<<5;state>>>=0;return state/4294967296;};
  const rows=[];
  for(const [name,{bundle,make}] of Object.entries(workloads(rnd))) for(const n of sizes) {
    const {plan,small,elements}=make(n),row={workload:name,elements};
    try {
      row.gpu=await measure(engines[bundle],plan,small,'gpu-required',k[0],k[1],3);
      row.cpu=await measure(engines[bundle],plan,small,'cpu',k[0],k[1],0);
      row.break_even_iterations=breakEven(row.gpu,row.cpu);
      row.speedup_steady=row.cpu.steady_s_per_iteration/row.gpu.steady_s_per_iteration;
      row.residency_gain=row.gpu.oneshot_s_per_iteration/row.gpu.steady_s_per_iteration;
    } catch(e){row.error=String(e.message??e);}
    rows.push(row);log(row);
  }
  return {k,rows};
}
const ms=s=>s<1?(s*1e3).toFixed(3):(s*1e3).toFixed(0);
export function table(report) {
  const lines=['| workload | elements | GPU steady ms/iter | CPU steady ms/iter | GPU one-shot ms/iter | GPU fixed ms (upload+read) | small read bytes | break-even iterations |','|---|---:|---:|---:|---:|---:|---:|---:|'];
  for(const r of report.rows) {
    if(r.error){lines.push(`| ${r.workload} | ${r.elements} | error: ${r.error.slice(0,60)} | | | | | |`);continue;}
    const {gpu:g,cpu:c}=r;
    lines.push(`| ${r.workload} | ${r.elements} | ${ms(g.steady_s_per_iteration)} | ${ms(c.steady_s_per_iteration)} | ${ms(g.oneshot_s_per_iteration)} | ${ms(g.fixed_s)} | ${g.small_read_bytes} | ${r.break_even_iterations??'never (CPU faster per iteration)'} |`);
  }
  return lines.join('\n');
}
if(typeof process!=='undefined'&&import.meta.url===`file://${process.argv[1]}`) {
  const {installWebGpu,loadBundle}=await import('./node-webgpu.mjs');
  const argv=process.argv.slice(2),quick=argv.includes('--quick'),outAt=argv.indexOf('--out');
  await installWebGpu();
  const engines={session:await loadBundle(argv[0]),particles:await loadBundle(argv[1])};
  const report=await residency(engines,quick?{sizes:[4096,65536],k:[5,25],log:r=>console.error(JSON.stringify(r))}:{log:r=>console.error(JSON.stringify(r))});
  report.host='browser';
  if(outAt>=0)(await import('node:fs')).writeFileSync(argv[outAt+1],JSON.stringify(report,null,1));
  console.log(table(report));
  for(const e of Object.values(engines))await e.close();
  process.exit(0);
}
