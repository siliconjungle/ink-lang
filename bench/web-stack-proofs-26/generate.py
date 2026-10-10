"""Original materialized stages and strongest already-fused one-pass controls."""
import ast,json
from pathlib import Path
from spec import TASKS,source,public_spec,mix_expression,fallback
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

 if op=='invariant_fold':
  if not expert:return 'let a=seed;for(let j=xs.length-1;j>=0;j--){const x=xs[j];a='+e('choose('+t['gate']+','+t['yes']+','+t['no']+')')+';}return a;'
  loop=lambda expr:'let a=seed;for(let j=xs.length-1;j>=0;j--){const x=xs[j];a='+e(expr)+';}return a;'
  return 'if('+e(t['gate'])+'){'+loop(t['yes'])+'}else{'+loop(t['no'])+'}'
 if op in ['zip_map','zip_fold']:
  combine=e(t['combine']);length='Math.min(xs.length,ys.length)' if op=='zip_map' else 'xs.length';right='ys[j]' if op=='zip_map' else 'xs[j]'
  if not expert:
   staged=f'const paired=[];for(let j=0;j<{length};j++){{const a=xs[j],b={right};paired.push({combine});}}'
   if op=='zip_map':return staged+'return paired.map(v=>'+e(t['postmap'])+');'
   return staged+'let acc=seed;for(let j=paired.length-1;j>=0;j--){const v=paired[j];acc='+e(t['reducer'])+';}return acc;'
  if op=='zip_map':return f'const out=scratch[{t["index"]}],n={length};for(let j=0;j<n;j++){{const a=xs[j],b={right},v={combine};out[j]='+e(t['postmap'])+';}return out.subarray(0,n);'
  return f'let acc=seed;for(let j=xs.length-1;j>=0;j--){{const a=xs[j],b=xs[j],v={combine};acc='+e(t['reducer'])+';}return acc;'
 if op=='modular_mix':
  prefix=''.join(f'const c{j}=add(k,{2*j+1});' for j in range(16)) if expert else ''
  stages='let v=add(x,seed);'+''.join(f'v=rem(add(mul(v,'+(f'c{j}' if expert else f'add(k,{2*j+1})')+'),x),4294967291,seed);' for j in range(16))
  if expert:
   stages='let v=add(x,seed);'+''.join(f'v=add(mul(v,c{j}),x);if(v>=4294967291)v-=4294967291;' for j in range(16))
   return prefix+f'const out=scratch[{t["index"]}];for(let j=0;j<xs.length;j++){{const x=xs[j];'+stages+'out[j]=v;}return out.subarray(0,xs.length);'
  return 'return Array.prototype.map.call(xs,x=>{'+stages+'return v;});'
 if op in ['repair','repair_fold','repair_sum']:
  m=e(t['mapper']);g=e(t['rejected_mapper']);gate=e(t['predicate']);prefix=''
  if expert and t['cohort']=='heldout':
   prefix='const cutoff=quot(k,2,0);';gate=gate.replace('quot(k,2,0)','cutoff')
  if not expert:
   staged=f'const accepted=Array.prototype.filter.call(xs,x=>{p});const mapped=accepted.map(x=>{p}?{m}:{g});'
   if op=='repair_sum':return staged+'let a=0;for(const x of mapped)a=add(a,x);return a;'
   return staged+('let a=seed;for(let j=mapped.length-1;j>=0;j--){const x=mapped[j];a='+e(t['reducer'])+';}return a;' if op=='repair_fold' else 'return mapped;')
  if op=='repair_sum':return prefix+f'let a=0;for(let j=0;j<xs.length;j++){{const x=xs[j];if({gate})a=add(a,{m});}}return a;'
  if op=='repair_fold':return prefix+f'let a=seed;for(let j=xs.length-1;j>=0;j--){{const x=xs[j];if({gate}){{const v={m};a='+e(t['reducer']).replace('x','v')+';}}return a;'
  return prefix+f'const out=scratch[{t["index"]}];let n=0;for(let j=0;j<xs.length;j++){{const x=xs[j];if({gate})out[n++]={m};}}return out.subarray(0,n);'
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

 if op=='invariant_fold':
  if not expert:return 'let mut a=seed;for &x in xs.iter().rev(){a='+e('choose('+t['gate']+','+t['yes']+','+t['no']+')')+';}a as u64'
  loop=lambda expr:'let mut a=seed;for &x in xs.iter().rev(){a='+e(expr)+';}a as u64'
  return 'if '+e(t['gate'])+'{'+loop(t['yes'])+'}else{'+loop(t['no'])+'}'
 if op in ['zip_map','zip_fold']:
  combine=e(t['combine']);length='xs.len().min(ys.len())' if op=='zip_map' else 'xs.len()';right='ys[j]' if op=='zip_map' else 'xs[j]'
  if not expert:
   staged=f'let mut paired=Vec::new();for j in 0..{length}{{let a=xs[j];let b={right};paired.push({combine});}}'
   if op=='zip_map':return staged+'let mapped:Vec<u32>=paired.iter().copied().map(|v|'+e(t['postmap'])+').collect();for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()'
   return staged+'let mut acc=seed;for &v in paired.iter().rev(){acc='+e(t['reducer'])+';}acc as u64'
  if op=='zip_map':return f'let n={length};for j in 0..n{{let a=xs[j];let b={right};let v={combine};*out.add(j)='+e(t['postmap'])+';}n'
  return f'let mut acc=seed;for &x in xs.iter().rev(){{let a=x;let b=x;let v={combine};acc='+e(t['reducer'])+';}acc as u64'
 if op=='modular_mix':
  prefix=''.join(f'let c{j}=k.wrapping_add({2*j+1}u32);' for j in range(16)) if expert else ''
  stages='let mut v=x.wrapping_add(seed);'+''.join('v=rem(v.wrapping_mul('+(f'c{j}' if expert else f'k.wrapping_add({2*j+1}u32)')+').wrapping_add(x),4294967291u32,seed);' for j in range(16))
  if expert:
   stages='let mut v=x.wrapping_add(seed);'+''.join(f'v=v.wrapping_mul(c{j}).wrapping_add(x);if v>=4294967291u32{{v-=4294967291u32;}}' for j in range(16))
   return prefix+'for(j,&x)in xs.iter().enumerate(){'+stages+'*out.add(j)=v;}xs.len()'
  return 'let mapped:Vec<u32>=xs.iter().copied().map(|x|{'+stages+'v}).collect();for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()'
 if op in ['repair','repair_fold','repair_sum']:
  m=e(t['mapper']);g=e(t['rejected_mapper']);gate=e(t['predicate']);prefix=''
  if expert and t['cohort']=='heldout':
   prefix='let cutoff=quot(k,2u32,0u32);';gate=gate.replace('quot(k,2u32,0u32)','cutoff')
  if not expert:
   staged=f'let accepted:Vec<u32>=xs.iter().copied().filter(|&x|{p}).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|if {p}{{{m}}}else{{{g}}}).collect();'
   if op=='repair_sum':return staged+'let mut a=0u32;for &x in &mapped{a=a.wrapping_add(x);}a as u64'
   return staged+('let mut a=seed;for &x in mapped.iter().rev(){a='+e(t['reducer'])+';}a as u64' if op=='repair_fold' else 'for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()')
  if op=='repair_sum':return prefix+f'let mut a=0u32;for &x in xs{{if {gate}{{a=a.wrapping_add({m});}}}}a as u64'
  if op=='repair_fold':return prefix+f'let mut a=seed;for &x in xs.iter().rev(){{if {gate}{{let x={m};a='+e(t['reducer'])+';}}a as u64'
  return prefix+f'let mut n=0;for &x in xs{{if {gate}{{*out.add(n)={m};n+=1;}}}}n'
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
 (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n');(HERE/'kernels.ink').write_text('module WebProof26;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
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
