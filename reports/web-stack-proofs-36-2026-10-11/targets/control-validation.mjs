import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expert} from './expert.mjs';
const root=process.argv[2],spec=JSON.parse(await readFile(root+'/control-spec.json')),fixtures=JSON.parse(await readFile(root+'/control-fixtures.json')),wasm=await readFile(root+'/rust-expert.wasm');
const {instance:{exports:r}}=await WebAssembly.instantiate(wasm,{}),max=Math.max(2,...fixtures.frames.map(f=>f.xs.length+f.ys.length)),xp=r.bench_alloc(max),yp=r.bench_alloc(max),op=r.bench_alloc(max);
const equal=(a,b)=>a.length===b.length&&b.every((v,i)=>a[i]===v),rows=[];
for(const f of fixtures.frames){
 const xs=Uint32Array.from(f.xs),ys=Uint32Array.from(f.ys),index=spec.tasks.findIndex(t=>t.name===f.task),value=expert[f.task](xs,ys,f.seed,f.k);
 if(value!==f.expected)throw Error('JS complete scalar '+f.id);
 new Uint32Array(r.memory.buffer,xp,xs.length).set(xs);new Uint32Array(r.memory.buffer,yp,ys.length).set(ys);
 const count=r.bench_eval(index,xp,xs.length,yp,ys.length,f.seed,f.k,op),words=new Uint32Array(r.memory.buffer,op,count),actual=words[0]+words[1]*2**32;
 if(count!==2||actual!==f.expected)throw Error('Rust Wasm complete scalar '+f.id);
 if(!equal(xs,f.xs)||!equal(ys,f.ys)||!equal(new Uint32Array(r.memory.buffer,xp,xs.length),f.xs)||!equal(new Uint32Array(r.memory.buffer,yp,ys.length),f.ys))throw Error('Control mutation '+f.id);
 rows.push({frame:f.id,js_complete_scalar:true,rust_wasm_complete_scalar:true,input_nonmutation:true,result_kind:'scalar_u32'});
}
for(const p of[xp,yp,op])r.bench_free(p,max);
const sha=x=>createHash('sha256').update(x).digest('hex'),receipt={status:'passed',timed:false,result_kind:'scalar_u32',node:process.version,frames:rows.length,complete_outputs:rows.length*2,rows,negative_order_controls:fixtures.negative_order_controls,bindings:{}};
for(const name of['control-spec.json','control-fixtures.json','rust-expert.wasm'])receipt.bindings[name]=sha(await readFile(root+'/'+name));
for(const name of['expert.mjs','expert.rs','control-validation.mjs'])receipt.bindings[name]=sha(await readFile(new URL(name,import.meta.url)));
await writeFile(root+'/control-validation.json',JSON.stringify(receipt,null,2)+'\n');console.log(receipt.status,receipt.frames,'frames',receipt.complete_outputs,'complete scalars; untimed');
