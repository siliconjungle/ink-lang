#!/usr/bin/env node
// Browser-host resident sessions: GPU sessions against CPU sessions and
// one-shot pipelines, split steps, small reads, writes and buffer views.
//   node bench/gpu/session-check.mjs SESSION_BUNDLE PARTICLES_BUNDLE [PARALLEL_BUNDLE]
import {installWebGpu,loadBundle,random} from './node-webgpu.mjs';
const [sessionDir,particlesDir,parallelDir]=process.argv.slice(2),rnd=random(7);
await installWebGpu();
let failures=0,checks=0;
const same=(label,a,b)=>{checks++;if(JSON.stringify(a)!==JSON.stringify(b)){failures++;console.log(`FAIL ${label}\n  ${JSON.stringify(a).slice(0,300)}\n  ${JSON.stringify(b).slice(0,300)}`);}};
const truth=(label,ok)=>{checks++;if(!ok){failures++;console.log(`FAIL ${label}`);}};
async function both(engine,plan,script) {
  // Run the same session script on the GPU and the CPU; every read matches.
  const out={};
  for(const backend of ['gpu-required','cpu']) {
    const s=await engine.open(plan,{backend});
    truth(`${backend} session backend`,s.backend===(backend==='cpu'?'cpu':'gpu'));
    out[backend]=await script(s);await s.close();
  }
  return out;
}
{
  const engine=await loadBundle(sessionDir),W=64,H=48;
  const cells=Array.from({length:W*H},()=>rnd.chance(0.3)?1:0);
  const plan=n=>({inputs:{cells},steps:[{id:'next',call:'life',args:[{input:'cells'},W,H]}],feedback:{cells:'next'},outputs:['next'],iterations:n});
  const gpu=await engine.pipeline(plan(120),{backend:'gpu-required'}),cpu=await engine.pipeline(plan(120),{backend:'cpu'});
  same('life pipeline gpu=cpu',gpu.values,cpu.values);
  const fresh=Array.from({length:W*H},()=>rnd.chance(0.5)?1:0);
  const r=await both(engine,plan(1),async s=>{
    const reads=[];
    await s.step(50);await s.step(70);
    reads.push((await s.read({outputs:['next']})).values);
    reads.push((await s.read({step:'next',reduce:'sum'})).value,(await s.read({step:'next',length:true})).length,(await s.read({step:'next',slice:[100,50]})).value);
    await s.write('cells',fresh);await s.step(10);
    reads.push((await s.read({outputs:['next']})).values,(await s.read({step:'next',reduce:'bounds'})).value);
    if(s.backend==='gpu') {
      // Zero-readback handoff: the view is the live device buffer.
      const v=s.buffer('next'),device=engine.gpuDevice(),bytes=v.capacity*4;
      const staging=device.createBuffer({size:bytes,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});
      const e=device.createCommandEncoder();e.copyBufferToBuffer(v.buffer,v.offset,staging,0,bytes);device.queue.submit([e.finish()]);
      await staging.mapAsync(GPUMapMode.READ);const words=Array.from(new Uint32Array(staging.getMappedRange()));staging.unmap();staging.destroy();
      same('life view = read',words,reads[4].next);
    }
    return reads;
  });
  same('life session gpu=cpu',r['gpu-required'],r.cpu);
  same('life session(50+70) = pipeline(120)',r.cpu[0],cpu.values);
  // Graph feedback: scan, shrinking filter, chained graph steps.
  const xs=Array.from({length:3000},()=>rnd.below(5));
  const prefix={inputs:{xs},steps:[{id:'p',call:'prefix',args:[{input:'xs'}]}],feedback:{xs:'p'},outputs:['p'],iterations:5};
  const pp=await engine.pipeline(prefix,{backend:'cpu'});
  const pr=await both(engine,{...prefix,iterations:1},async s=>{await s.step(2);await s.step(3);return [(await s.read({outputs:['p']})).values,(await s.read({step:'p',reduce:'max'})).value];});
  same('prefix session gpu=cpu',pr['gpu-required'],pr.cpu);same('prefix session(2+3) = pipeline(5)',pr.cpu[0],pp.values);
  const ys=Array.from({length:5000},()=>rnd.range(-20,40)),shorter=ys.slice(0,1234).map(x=>x+5);
  const pos={inputs:{xs:ys},steps:[{id:'q',call:'positives',args:[{input:'xs'}]}],feedback:{xs:'q'},outputs:['q']};
  const qr=await both(engine,pos,async s=>{
    const out=[];await s.step(3);out.push((await s.read({step:'q',length:true})).length,(await s.read({step:'q',reduce:'bounds'})).value);
    await s.write('xs',shorter);await s.step(2);out.push((await s.read({outputs:['q']})).values,(await s.read({step:'q',slice:[10,20]})).value);
    return out;
  });
  same('positives session gpu=cpu (shrinking feedback, shorter write)',qr['gpu-required'],qr.cpu);
  const chain={inputs:{xs,ys:xs.slice(0,700)},steps:[{id:'p',call:'prefix',args:[{input:'xs'}]},{id:'j',call:'joined',args:[{step:'p'},{input:'ys'}]},{id:'t',call:'total',args:[{step:'j'}]}],outputs:['j','t']};
  const cr=await both(engine,chain,async s=>{await s.step(1);const all=await s.read({outputs:['j','t']});return [all.values,(await s.read({step:'j',reduce:'sum'})).value];});
  same('chain session gpu=cpu',cr['gpu-required'],cr.cpu);same('device sum = total step',cr.cpu[1],cr.cpu[0].t);
  await engine.close();
}
{
  // Element-wise f32 records with vector fields: exact min/max, tree-order sums.
  const engine=await loadBundle(particlesDir);
  const xs=Array.from({length:10000},()=>({position:[rnd.range(-100,100),rnd.range(-100,100),rnd.range(-100,100)],velocity:[rnd.range(-5,5),rnd.range(-5,5),rnd.range(-5,5)],mass:rnd.range(1,10)}));
  const plan={inputs:{xs},steps:[{id:'next',call:'particles',args:[{input:'xs'},0.25]}],feedback:{xs:'next'},outputs:['next']};
  const pr=await both(engine,plan,async s=>{
    await s.step(40);await s.step(60);
    return [(await s.read({step:'next',reduce:'bounds',field:'position'})).value,(await s.read({step:'next',reduce:'max',field:'mass'})).value,(await s.read({step:'next',reduce:'sum',field:'mass'})).value,(await s.read({step:'next',slice:[5,3]})).value];
  });
  const [g,c]=[pr['gpu-required'],pr.cpu];
  same('particles bounds/max/slice gpu=cpu',[g[0],g[1],g[3]],[c[0],c[1],c[3]]);
  truth('particles f32 sum within tolerance',Math.abs(g[2]-c[2])<=1e-4*Math.abs(c[2]));
  const one=await engine.pipeline({...plan,iterations:100},{backend:'cpu'});
  same('particles session(40+60) slice = pipeline(100)',c[3],one.values.next.slice(5,8));
  await engine.close();
}
if(parallelDir) {
  // Two-lane u64 reductions and record-field reads over graph stages.
  const engine=await loadBundle(parallelDir);
  const big=Array.from({length:70000},()=>(rnd.u64()>>8n).toString());
  const items=Array.from({length:9000},()=>({key:rnd.range(-100,100),weight:rnd.u32(),flag:rnd.chance(0.5)}));
  const plan={inputs:{xs:big,items},steps:[{id:'s',call:'scan_u64',args:[{input:'xs'}]},{id:'k',call:'keep_items',args:[{input:'items'},30]}],outputs:['s','k']};
  const r=await both(engine,plan,async s=>{await s.step(1);const out=[];for(const q of [{step:'s',reduce:'sum'},{step:'s',reduce:'bounds'},{step:'k',reduce:'sum',field:'weight'},{step:'k',reduce:'bounds',field:'key'},{step:'k',reduce:'max',field:'flag'},{step:'k',length:true}])out.push((await s.read(q)).value??(await s.read(q)).length);return out;});
  same('u64 and record-field reductions gpu=cpu',r['gpu-required'],r.cpu);
  await engine.close();
}
console.log(JSON.stringify({host:'browser',checks,failures}));
process.exit(failures?1:0);
