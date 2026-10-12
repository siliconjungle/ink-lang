#!/usr/bin/env node
// Browser-host twin of parallel-check.py: every function of
// examples/gpu-parallel.ink at schedule size boundaries, GPU against the
// compiled CPU (Wasm), requiring identical results.
//   node bench/gpu/parallel-check.mjs BUNDLE_DIR [--large N] [--seed S]
import {installWebGpu,loadBundle,random} from './node-webgpu.mjs';
const argv=process.argv.slice(2),opt=(k,d)=>{const i=argv.indexOf(k);return i<0?d:Number(argv[i+1]);};
const dir=argv[0],large=opt('--large',300000),rnd=random(opt('--seed',1));
const values=(kind,n)=>Array.from({length:n},()=>kind==='u32'?rnd.u32():kind==='i32'?rnd.u32()|0:kind==='small'?rnd.range(-50,50)
  :kind==='u64'?(v=>v>2n**53n?v.toString():Number(v))(rnd.u64()):{key:rnd.range(-100,100),weight:rnd.u32(),flag:rnd.chance(0.5)});
await installWebGpu();
const engine=await loadBundle(dir);
const sizes=[0,1,2,255,256,257,4096,65535,65536,65537,large],cases=[];
for(const n of sizes) {
  for(const [f,k] of [['scan_u32','u32'],['scan_i32','i32'],['scan_u64','u64'],['sort_u32','u32'],['sort_i32','i32'],['sort_u64','u64'],['keep_odd','u64'],['sum_u32','u32'],['sum_i32','i32'],['sum_u64','u64'],['pipeline','small']])cases.push([f,[values(k,n)]]);
  cases.push(['keep_items',[values('item',n),rnd.range(-100,100)]]);
  cases.push(['cat_items',[values('item',n),values('item',Math.floor(n/3))]]);
}
let failures=0;
for(const [f,args] of cases) {
  const n=args[0].length;
  let g;try{g=await engine.call(f,args,{backend:'gpu-required'});}catch(e){console.log(`FAIL ${f} n=${n}: GPU did not run: ${e.message}`);failures++;continue;}
  const c=await engine.call(f,args,{backend:'cpu'});
  if(g.backend!=='gpu'){console.log(`FAIL ${f} n=${n}: ran on ${g.backend}: ${g.reason}`);failures++;continue;}
  if(JSON.stringify(g.value)!==JSON.stringify(c.value)){console.log(`FAIL ${f} n=${n}: GPU and CPU differ`);failures++;}
}
await engine.close();
console.log(JSON.stringify({host:'browser',cases:cases.length,failures,sizes}));
process.exit(failures?1:0);
