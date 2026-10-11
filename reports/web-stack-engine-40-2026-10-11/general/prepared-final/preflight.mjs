// Untimed expert and literal emitted Rust-Wasm full-output checks.
import{readFile,writeFile}from'node:fs/promises';import path from'node:path';import{expert}from'./expert.mjs';
const root=path.resolve(process.argv[2]),read=async p=>JSON.parse(await readFile(p,'utf8'));
const declaration=path.join(path.dirname(root),'declaration'),spec=await read(path.join(declaration,'spec.json')),fixtures=await read(path.join(declaration,'fixtures.json')),capability=await read(path.join(root,'capability.json'));
const equal=(a,b)=>Array.isArray(b)?a.length===b.length&&b.every((x,i)=>a[i]===x):a===b;
const modules={};for(const[name,p]of[['ink-rust',capability.wasm_path],['expert','rust-expert.wasm']])modules[name]=(await WebAssembly.instantiate(await readFile(path.join(root,p)),{})).instance.exports;
const out={status:'running',timed_or_profiled:false,validation:[],checks:0};
for(const f of fixtures.frames){
 const args=[Uint32Array.from(f.xs),Uint32Array.from(f.ys),f.seed,f.k],index=spec.tasks.findIndex(t=>t.name===f.task);
 if(!equal(expert[f.task](...args),f.expected))throw Error('JS expert mismatch '+f.id);out.validation.push({frame:f.id,variant:'expert-js',full_output:true});out.checks++;
 for(const[name,cpu]of Object.entries(modules)){
  const xp=cpu.bench_alloc(Math.max(1,args[0].length)),yp=cpu.bench_alloc(Math.max(1,args[1].length));
  try{new Uint32Array(cpu.memory.buffer,xp,args[0].length).set(args[0]);new Uint32Array(cpu.memory.buffer,yp,args[1].length).set(args[1]);
   let actual;if(Array.isArray(f.expected)){const n=cpu.bench_eval_owned(index,xp,args[0].length,yp,args[1].length,f.seed,f.k);actual=Array.from(new Uint32Array(cpu.memory.buffer,cpu.bench_owned_ptr(),n));cpu.bench_owned_clear()}else actual=cpu.bench_eval_scalar32(index,xp,args[0].length,yp,args[1].length,f.seed,f.k)>>>0;
   if(!equal(actual,f.expected)||!equal(new Uint32Array(cpu.memory.buffer,xp,args[0].length),f.xs)||!equal(new Uint32Array(cpu.memory.buffer,yp,args[1].length),f.ys))throw Error('Rust-Wasm output/nonmutation '+f.id+'/'+name);
   out.validation.push({frame:f.id,variant:name+'-wasm',full_output:true,nonmutation:true,owned_vec_to_array_readback:true});out.checks++;
  }finally{cpu.bench_free(xp,Math.max(1,args[0].length));cpu.bench_free(yp,Math.max(1,args[1].length))}
 }
}
out.status='passed';await writeFile(path.join(root,'node.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:out.status,checks:out.checks}));
