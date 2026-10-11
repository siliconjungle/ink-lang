"""Original materialized stages and strongest already-fused one-pass controls."""
import ast,json
from pathlib import Path
from spec import TASKS,source,public_spec,fallback
HERE=Path(__file__).resolve().parent

def expression(text,language):
    def go(n):
        if isinstance(n,ast.Name):return n.id
        if isinstance(n,ast.Constant):
            if isinstance(n.value,bool):return str(n.value).lower()
            return str(n.value)+('u32' if language=='rust' else '')
        if isinstance(n,ast.Compare):return '('+go(n.left)+{ast.Lt:'<',ast.Gt:'>',ast.Eq:'=='}[type(n.ops[0])]+go(n.comparators[0])+')'
        if isinstance(n,ast.Call):
            if n.func.id in ['scanFirst','scan_first'] and not n.args:return n.func.id+'()'
            if n.func.id in ['quot_or','rem_or']:return ('quot' if n.func.id=='quot_or' else 'rem')+'('+','.join(map(go,n.args))+')'
            assert n.func.id=='choose';c,a,b=map(go,n.args)
            return f'({c}?{a}:{b})' if language=='js' else f'(if {c}{{{a}}}else{{{b}}})'
        if isinstance(n,ast.BinOp):
            op={ast.Add:'add',ast.Sub:'sub',ast.Mult:'mul'}[type(n.op)];a,b=go(n.left),go(n.right)
            return f'{op}({a},{b})' if language=='js' else f'({a}).wrapping_{op}({b})'
        raise ValueError(ast.dump(n))
    return go(ast.parse(text,mode='eval').body)
def js_body(t,expert):
 e=lambda s:expression(s,'js');op=t['operation'];p=e(t.get('predicate','true'))
 if op=='count':return 'return BigInt(xs.length);'
 if op in ['mapped_head','filtered_mapped_head']:
  m=e(t['mapper']);z=e(fallback(t))
  if expert:
   if op=='mapped_head':return f'const x=xs.length?xs[0]:seed;return {m};'
   return f'for(let j=0;j<xs.length;j++){{const x=xs[j];if({p})return {m};}}const x=seed;return {m};'
  accepted=f'const accepted=Array.prototype.filter.call(xs,x=>{p});' if op=='filtered_mapped_head' else ''
  base='accepted' if op=='filtered_mapped_head' else 'xs'
  return accepted+f'const mapped=Array.prototype.map.call({base},x=>{m});const fallback={z};return mapped.length?mapped[0]:fallback;'
 if op=='first_accepted':
  return f'for(let j=0;j<xs.length;j++){{const x=xs[j];if({p})return x;}}return seed;' if expert else f'const accepted=Array.prototype.filter.call(xs,x=>{p});return accepted.length?accepted[0]:seed;'
 m=e(t['mapper'])
 if expert:return f'const out=scratch[{t["index"]}];for(let j=0;j<xs.length;j++){{const x=xs[j],i=j>>>0;out[j]={m};}}return out.subarray(0,xs.length);'
 return f'return Array.prototype.map.call(xs,(x,j)=>{{const i=j>>>0;return {m};}});'
def rust_scalar(t):return t['output']!='list_u32'
def rust_body(t,expert):
 e=lambda s:expression(s,'rust');op=t['operation'];p=e(t.get('predicate','true'))
 if op=='count':return 'xs.len() as u64'
 if op in ['mapped_head','filtered_mapped_head']:
  m=e(t['mapper']);z=e(fallback(t))
  if expert:
   if op=='mapped_head':return f'let x=xs.first().copied().unwrap_or(seed);{m} as u64'
   return f'for &x in xs{{if {p}{{return {m} as u64;}}}}let x=seed;{m} as u64'
  accepted=f'let accepted:Vec<u32>=xs.iter().copied().filter(|&x|{p}).collect();' if op=='filtered_mapped_head' else ''
  base='accepted' if op=='filtered_mapped_head' else 'xs'
  return accepted+f'let mapped:Vec<u32>={base}.iter().copied().map(|x|{m}).collect();mapped.first().copied().unwrap_or({z}) as u64'
 if op=='first_accepted':
  return f'for &x in xs{{if {p}{{return x as u64;}}}}seed as u64' if expert else f'let accepted:Vec<u32>=xs.iter().copied().filter(|&x|{p}).collect();accepted.first().copied().unwrap_or(seed) as u64'
 m=e(t['mapper'])
 if expert:return f'for(j,&x)in xs.iter().enumerate(){{let i=j as u32;*out.add(j)={m};}}xs.len()'
 return f'let mapped:Vec<u32>=xs.iter().copied().enumerate().map(|(j,x)|{{let i=j as u32;{m}}}).collect();for(j,&value)in mapped.iter().enumerate(){{*out.add(j)=value;}}mapped.len()'
def generate():
 (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n');(HERE/'kernels.ink').write_text('module WebProof24;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
 for mode in ['literal','expert']:
  expert=mode=='expert';common='const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0,quot=(a,b,z)=>b?Math.floor(a/b)>>>0:z,rem=(a,b,z)=>b?a%b:z;\n'
  functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{js_body(t,expert)}}}' for t in TASKS)
  if expert:js=common+'export function createExpert(capacity){const scratch=Object.fromEntries('+json.dumps([t['index'] for t in TASKS if t['output']=='list_u32'])+'.map(i=>[i,new Uint32Array(capacity)]));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args),get:name=>functions[name]};}\n'
  else:js=common+'const functions={'+functions+'};export const call=(name,args)=>functions[name](...args);\n'
  (HERE/f'{mode}.mjs').write_text(js)
  rust='// Source-stage/fused algorithms shared by native and Wasm.\nfn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}\nfn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}\n#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}\n'
  rust+='pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{\n'+'\n'.join(f'{t["index"]}=>{{{rust_body(t,expert)}}},' for t in TASKS if rust_scalar(t))+'\n_=>panic!("non-scalar case")}}\n'
  rust+='#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{\n'
  for t in TASKS:
   if t['output']=='u64':body='let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;*out.add(1)=(value>>32) as u32;2'
   elif rust_scalar(t):body='*out=bench_scalar(case,xs,ys,seed,k) as u32;1'
   else:body=rust_body(t,expert)
   rust+=f'{t["index"]}=>{{{body}}},\n'
  rust+='_=>panic!("unknown case")}}\n';(HERE/f'{mode}.rs').write_text(rust)
if __name__=='__main__':generate()
