import ast
from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[1];assets=root/'bench/web-stack-proofs-13'
source=(root/'knowledge/research/web-stack-proofs-13/compute/examples.ink').read_text()
def convert(node,language):
 if isinstance(node,ast.Name):return node.id
 if isinstance(node,ast.Constant):return str(node.value)+('u32' if language=='rust' else '')
 assert isinstance(node,ast.BinOp)
 op={ast.Add:'add',ast.Sub:'sub',ast.Mult:'mul'}[type(node.op)];a=convert(node.left,language);b=convert(node.right,language)
 return f'{op}({a},{b})' if language=='js' else f'({a}).wrapping_{op}({b})'
functions=[]
for line in source.splitlines()[1:]:
 name=line.split('fn ',1)[1].split('(',1)[0];expression=line.split('fn(x)=>',1)[1].split(');}',1)[0];tree=ast.parse(expression,mode='eval').body
 functions.append((name,convert(tree,'js'),convert(tree,'rust')))
jscollect=""" value_gated_left:(xs,seed,k)=>zip(Array.from(xs,x=>sub(x,seed)),Array.from(xs,x=>add(mul(x,x),k)),(a,b)=>a<seed?a:b).map(x=>add(mul(x,k),seed)),
 value_gated_right:(xs,seed,k)=>zip(Array.from(xs,x=>add(mul(x,x),k)),Array.from(xs,x=>sub(x,seed)),(a,b)=>b<seed?a:b).map(x=>add(mul(x,k),seed)),
 nested_gated_route:(xs,seed,k)=>zip(zip(xs,xs,(a,b)=>add(a,mul(b,k))),xs,(a,b)=>b<seed?a:b).map(x=>add(x,seed))"""
(assets/'literal.mjs').write_text('// Original source grouping/stages; normal JIT optimization allowed.\nconst mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;\nconst zip=(xs,ys,f)=>{const out=new Array(Math.min(xs.length,ys.length));for(let i=0;i<out.length;i++)out[i]=f(xs[i],ys[i]);return out;};\nconst functions={\n'+',\n'.join(f' {name}:(xs,seed,k)=>Array.from(xs,x=>{js})' for name,js,rust in functions)+',\n'+jscollect+'\n};\nexport const call=(name,args)=>functions[name](...args);\n')
rustcollect="""  3=>{let left:Vec<u32>=xs.iter().map(|&x|x.wrapping_sub(seed)).collect();let right:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(x).wrapping_add(k)).collect();let zipped:Vec<u32>=left.iter().zip(right.iter()).map(|(&a,&b)|if a<seed{a}else{b}).collect();for(j,&x)in zipped.iter().enumerate(){*out.add(j)=x.wrapping_mul(k).wrapping_add(seed);}len},
  4=>{let left:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(x).wrapping_add(k)).collect();let right:Vec<u32>=xs.iter().map(|&x|x.wrapping_sub(seed)).collect();let zipped:Vec<u32>=left.iter().zip(right.iter()).map(|(&a,&b)|if b<seed{a}else{b}).collect();for(j,&x)in zipped.iter().enumerate(){*out.add(j)=x.wrapping_mul(k).wrapping_add(seed);}len},
  5=>{let weighted:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|a.wrapping_add(b.wrapping_mul(k))).collect();let zipped:Vec<u32>=weighted.iter().zip(xs.iter()).map(|(&a,&b)|if b<seed{a}else{b}).collect();for(j,&x)in zipped.iter().enumerate(){*out.add(j)=x.wrapping_add(seed);}len},
"""
(assets/'literal.rs').write_text('// Original ordered source operations/stages; normal release optimization allowed.\n#[no_mangle]pub extern "C" fn bench_alloc(len:usize)->*mut u32{let mut xs=vec![0;len];let p=xs.as_mut_ptr();std::mem::forget(xs);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(ptr:*mut u32,len:usize){drop(Vec::from_raw_parts(ptr,len,len));}\n#[no_mangle]pub unsafe extern "C" fn bench_map(case:u32,ptr:*const u32,len:usize,seed:u32,k:u32,out:*mut u32)->usize{\n let xs=std::slice::from_raw_parts(ptr,len);\n match case{\n'+''.join(f'  {i}=>{{for(j,&x)in xs.iter().enumerate(){{*out.add(j)={rust};}}len}},\n' for i,(name,js,rust) in enumerate(functions))+rustcollect+'  _=>panic!("case")\n }\n}\n')
compute=source.replace('module Compute13;','module WebProof13;').replace('\nfn ','\npub fn ');collection=(root/'knowledge/research/web-stack-proofs-13/collection/representative.ink').read_text().split('\n',1)[1];(assets/'kernels.ink').write_text(compute+'\n'+collection)
print('six exact original static controls generated')
