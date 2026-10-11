// Untimed preflight for independent oracle fixtures and handwritten controls.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expert} from './expert.mjs';
const root=process.argv[2],spec=JSON.parse(await readFile(root+'/control-spec.json')),fixtures=JSON.parse(await readFile(root+'/control-fixtures.json')),wasm=await readFile(root+'/rust-expert.wasm');
const {instance:{exports:r}}=await WebAssembly.instantiate(wasm,{}),max=Math.max(2,...fixtures.frames.map(f=>f.xs.length+f.ys.length)),xp=r.bench_alloc(max),yp=r.bench_alloc(max),op=r.bench_alloc(max);
const equal=(a,b)=>a.length===b.length&&b.every((v,i)=>a[i]===v),rows=[];
for(const f of fixtures.frames){
 const xs=Uint32Array.from(f.xs),ys=Uint32Array.from(f.ys),index=spec.tasks.findIndex(t=>t.name===f.task),owned=expert[f.task](xs,ys,f.seed,f.k);
 if(!equal(owned,f.expected))throw Error('JS full-output '+f.id);
 new Uint32Array(r.memory.buffer,xp,xs.length).set(xs);new Uint32Array(r.memory.buffer,yp,ys.length).set(ys);
 const count=r.bench_eval(index,xp,xs.length,yp,ys.length,f.seed,f.k,op),actual=new Uint32Array(r.memory.buffer,op,count);
 if(!equal(actual,f.expected))throw Error('Rust Wasm full-output '+f.id);
 for(const value of[owned,actual]){let code=value.length>>>0;for(let i=0;i<value.length;i++)code=(code+Math.imul((i+1)>>>0,value[i]))>>>0;const independent=Number(BigInt.asUintN(32,BigInt(value.length)+Array.from(value).reduce((a,x,i)=>a+BigInt(i+1)*BigInt(x),0n)));if(code!==f.web_consumption_code||code!==independent)throw Error('Full-vector consumption code '+f.id);}
 const task=spec.tasks[index],donor=task.unused_side==='left'?xs:ys,changed=Uint32Array.from(donor,x=>(x^0xa5a5a5a5)>>>0),projected=expert[f.task](task.unused_side==='left'?changed:xs,task.unused_side==='right'?changed:ys,f.seed,f.k);if(!equal(projected,f.expected))throw Error('Ignored donor values observed '+f.id);
 if(!equal(xs,f.xs)||!equal(ys,f.ys)||!equal(new Uint32Array(r.memory.buffer,xp,xs.length),f.xs)||!equal(new Uint32Array(r.memory.buffer,yp,ys.length),f.ys))throw Error('Control mutation '+f.id);
 const retained=Array.from(owned);expert[f.task](Uint32Array.from(xs,x=>(x^0xa5a5a5a5)>>>0),Uint32Array.from(ys,x=>(x^0xa5a5a5a5)>>>0),(f.seed^0x40000000)>>>0,f.k);
 if(!equal(owned,retained))throw Error('Control owned lifetime '+f.id);
 rows.push({frame:f.id,js_complete:true,rust_wasm_complete:true,input_nonmutation:true,js_owned_lifetime:true,ignored_donor_values_unobserved:true,full_vector_consumption_code:true});
}
for(const p of[xp,yp,op])r.bench_free(p,max);
const sha=x=>createHash('sha256').update(x).digest('hex'),receipt={status:'passed',timed:false,node:process.version,frames:rows.length,complete_outputs:rows.length*2,rows,bindings:{}};
for(const name of['control-spec.json','control-fixtures.json','rust-expert.wasm'])receipt.bindings[name]=sha(await readFile(root+'/'+name));
for(const name of['expert.mjs','expert.rs','control-validation.mjs'])receipt.bindings[name]=sha(await readFile(new URL(name,import.meta.url)));
await writeFile(root+'/control-validation.json',JSON.stringify(receipt,null,2)+'\n');console.log(receipt.status,receipt.frames,'frames',receipt.complete_outputs,'complete outputs; untimed');
