"""Original materialized stages and strongest already-fused one-pass controls."""
import ast,json
from pathlib import Path
from spec import TASKS,source,public_spec
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
 e=lambda s:expression(s,'js');op=t['operation'];p=e(t.get('predicate','true'));m=e(t['mapper'])
 if op=='skip_partition_count':
  return 'return BigInt(xs.length);' if expert else f'const yes=Array.prototype.filter.call(xs,x=>{p}),no=Array.prototype.filter.call(xs,x=>!{p});return BigInt(yes.length)+BigInt(no.length);'
 if op.startswith('skip_'):
  mapped=op=='skip_mapped_first_accepted'
  if expert:return f'for(let j=0;j<xs.length;j++){{const x=xs[j];if({p})return '+(m if mapped else 'x')+';}return seed;'
  return f'const accepted=Array.prototype.filter.call(xs,x=>{p});'+(f'const mapped=accepted.map(x=>{m});return mapped.length?mapped[0]:seed;' if mapped else 'return accepted.length?accepted[0]:seed;')
 if op=='scan_first_value':
  post=e(t['post'])
  if expert:return f'const first=xs.length?xs[0]:seed;return {post};'
  # Each syntactic scan invocation must be retained, including lazy branch selection.
  return 'const scanFirst=()=>{let a=0;const values=Array.from(xs,x=>{a=add(a,x);return a;});return values.length?values[0]:seed;};return '+e(t['post'].replace('first','scanFirst()'))+';'
 if expert:return f'const out=scratch[{t["index"]}];for(let j=0;j<xs.length;j++){{const x=xs[j];out[j]={m};}}return out.subarray(0,xs.length);'
 return f'let a=0;const prefixes=Array.from(xs,x=>{{a=add(a,x);return a;}});return Array.from({{length:Math.min(prefixes.length,xs.length)}},(_,j)=>{{const prefix=prefixes[j],x=xs[j];return {m};}});'
def rust_scalar(t):return t['output']!='list_u32'
def rust_body(t,expert):
 e=lambda s:expression(s,'rust');op=t['operation'];p=e(t.get('predicate','true'));m=e(t['mapper'])
 if op=='skip_partition_count':
  return 'xs.len() as u64' if expert else f'let yes:Vec<u32>=xs.iter().copied().filter(|&x|{p}).collect();let no:Vec<u32>=xs.iter().copied().filter(|&x|!{p}).collect();(yes.len() as u64).wrapping_add(no.len() as u64)'
 if op.startswith('skip_'):
  mapped=op=='skip_mapped_first_accepted'
  if expert:return f'for &x in xs{{if {p}{{return '+(m if mapped else 'x')+' as u64;}}seed as u64'
  return f'let accepted:Vec<u32>=xs.iter().copied().filter(|&x|{p}).collect();'+(f'let mapped:Vec<u32>=accepted.iter().copied().map(|x|{m}).collect();mapped.first().copied().unwrap_or(seed) as u64' if mapped else 'accepted.first().copied().unwrap_or(seed) as u64')
 if op=='scan_first_value':
  if expert:return f'let first=xs.first().copied().unwrap_or(seed);{e(t["post"])} as u64'
  return 'let scan_first=||{let mut a=0u32;let values:Vec<u32>=xs.iter().map(|&x|{a=a.wrapping_add(x);a}).collect();values.first().copied().unwrap_or(seed)};'+e(t['post'].replace('first','scan_first()'))+' as u64'
 if expert:return f'for(j,&x)in xs.iter().enumerate(){{*out.add(j)={m};}}xs.len()'
 pair='prefixes.iter().zip(xs.iter()).map(|(&prefix,&x)|' if op=='scan_left_project' else 'xs.iter().zip(prefixes.iter()).map(|(&x,&prefix)|'
 return f'let mut a=0u32;let prefixes:Vec<u32>=xs.iter().map(|&x|{{a=a.wrapping_add(x);a}}).collect();let zipped:Vec<u32>='+pair+f'{m}).collect();for(j,&value)in zipped.iter().enumerate(){{*out.add(j)=value;}}zipped.len()'
def generate():
 (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n');(HERE/'kernels.ink').write_text('module WebProof23;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
 for mode in ['literal','expert']:
  expert=mode=='expert';common='const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0,quot=(a,b,z)=>b?Math.floor(a/b)>>>0:z,rem=(a,b,z)=>b?a%b:z;\n'
  functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{js_body(t,expert)}}}' for t in TASKS)
  if expert:js=common+'export function createExpert(capacity){const scratch=Object.fromEntries('+json.dumps([t['index'] for t in TASKS if t['output']=='list_u32'])+'.map(i=>[i,new Uint32Array(capacity)]));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args)};}\n'
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
