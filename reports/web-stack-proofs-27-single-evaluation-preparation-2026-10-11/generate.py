"""Original materialized stages and strongest already-fused one-pass controls."""
import ast,json
from pathlib import Path
from spec import TASKS,source,public_spec,kernel_source,CAL,NORM,PRED,STEP
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
 e=lambda s:expression(s,'js');op=t['operation'];idx=t['index']
 if op=='nested_zip':
  if not expert:return 'const paired=[];for(let j=0;j<Math.min(xs.length,ys.length);j++){const a=xs[j],b=ys[j];paired.push('+e(t['combine'])+');}const out=[];for(let j=0;j<paired.length;j++){const v=paired[j],x='+('xs[j]' if t['side']=='left' else 'ys[j]')+';out.push('+e(t['outer'])+');}return out;'
  return f'const out=scratch[{idx}],n=Math.min(xs.length,ys.length);for(let j=0;j<n;j++){{const a=xs[j],b=ys[j],v='+e(t['combine'])+',x='+('a' if t['side']=='left' else 'b')+';out[j]='+e(t['outer'])+';}return out.subarray(0,n);'
 if op=='helper_fold':
  c=e('choose(x<seed,x*k+bias,x-seed)' if expert else CAL);step=e(STEP)
  if not expert:return 'let a=seed;for(let j=xs.length-1;j>=0;j--){a=stepWord(calibrate(xs[j],seed,k),a,seed,k);}return a;'
  return 'let a=seed;for(let j=xs.length-1;j>=0;j--){let x=xs[j];x='+c+';a='+step+';}return a;'
 if op=='helper_zip':
  if not expert:return 'return Array.from({length:Math.min(xs.length,ys.length)},(_,j)=>pairWord(xs[j],ys[j],seed,k));'
  return f'const out=scratch[{idx}],n=Math.min(xs.length,ys.length);for(let j=0;j<n;j++){{let x=xs[j];const a='+e('choose(x<seed,x*k+bias,x-seed)')+';x=ys[j];const b='+e(NORM)+';out[j]='+e('choose(a<b,a+b*k,a-b*k)')+';}return out.subarray(0,n);'
 if not expert:
  if op=='helper_map':return 'return Array.prototype.map.call(xs,x=>calibrate(x,seed,k));'
  if op=='helper_indexed':return 'return Array.prototype.map.call(xs,(x,i)=>i%2===0?normalize(calibrate(x,seed,k),seed,k):calibrate(x,seed,k));'
  if op=='helper_filter_map':return 'const accepted=acceptList(xs,seed,k);return accepted.map(x=>normalize(calibrate(x,seed,k),seed,k));'
 if expert and op.startswith('helper'):
  pred=e(PRED);cal=e('choose(x<seed,x*k+bias,x-seed)');norm=e(NORM)
  if op=='helper_filter_map':return f'const out=scratch[{idx}];let n=0;for(let j=0;j<xs.length;j++){{let x=xs[j];if({pred}){{x={cal};out[n++]={norm};}}}}return out.subarray(0,n);'
  value=cal if op=='helper_map' else f'((j&1)===0?{norm}:x)'
  if op=='helper_indexed':return f'const out=scratch[{idx}];for(let j=0;j<xs.length;j++){{let x=xs[j];x={cal};out[j]={value};}}return out.subarray(0,xs.length);'
  return f'const out=scratch[{idx}];for(let j=0;j<xs.length;j++){{const x=xs[j];out[j]={value};}}return out.subarray(0,xs.length);'
 if op=='modular_mix':
  prefix=''.join(f'const c{j}=add(k,{2*j+1});' for j in range(16)) if expert else ''
  stages='let v=add(x,seed);'+''.join(f'v=rem(add(mul(v,'+(f'c{j}' if expert else f'add(k,{2*j+1})')+'),x),4294967291,seed);' for j in range(16))
  if expert:
   stages='let v=add(x,seed);'+''.join(f'v=add(mul(v,c{j}),x);if(v>=4294967291)v-=4294967291;' for j in range(16))
   return prefix+f'const out=scratch[{t["index"]}];for(let j=0;j<xs.length;j++){{const x=xs[j];'+stages+'out[j]=v;}return out.subarray(0,xs.length);'
  return 'return Array.prototype.map.call(xs,x=>{'+stages+'return v;});'
 raise ValueError(op)
def rust_scalar(t):return t['output']!='list_u32'
def rust_body(t,expert):
 e=lambda s:expression(s,'rust');op=t['operation']
 if op=='nested_zip':
  if not expert:return 'let mut paired=Vec::new();for j in 0..xs.len().min(ys.len()){let a=xs[j];let b=ys[j];paired.push('+e(t['combine'])+');}let mapped:Vec<u32>=paired.iter().copied().enumerate().map(|(j,v)|{let x='+('xs[j]' if t['side']=='left' else 'ys[j]')+';'+e(t['outer'])+'}).collect();for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()'
  return 'let n=xs.len().min(ys.len());for j in 0..n{let a=xs[j];let b=ys[j];let v='+e(t['combine'])+';let x='+('a' if t['side']=='left' else 'b')+';*out.add(j)='+e(t['outer'])+';}n'
 if op=='helper_fold':
  if not expert:return 'let mut a=seed;for &x in xs.iter().rev(){a=step_word(calibrate(x,seed,k),a,seed,k);}a as u64'
  return 'let mut a=seed;for &raw in xs.iter().rev(){let x=raw;let x='+e('choose(x<seed,x*k+bias,x-seed)')+';a='+e(STEP)+';}a as u64'
 if op=='helper_zip':
  if not expert:return 'let mapped:Vec<u32>=xs.iter().copied().zip(ys.iter().copied()).map(|(a,b)|pair_word(a,b,seed,k)).collect();for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()'
  return 'let n=xs.len().min(ys.len());for j in 0..n{let x=xs[j];let a='+e('choose(x<seed,x*k+bias,x-seed)')+';let x=ys[j];let b='+e(NORM)+';*out.add(j)='+e('choose(a<b,a+b*k,a-b*k)')+';}n'
 if not expert:
  if op=='helper_map':value='calibrate(x,seed,k)';base='xs.iter().copied().map(|x|'+value+')'
  elif op=='helper_indexed':base='xs.iter().copied().enumerate().map(|(i,x)|if i%2==0{normalize(calibrate(x,seed,k),seed,k)}else{calibrate(x,seed,k)})'
  elif op=='helper_filter_map':return 'let accepted=accept_list(xs,seed,k);let mapped:Vec<u32>=accepted.iter().copied().map(|x|normalize(calibrate(x,seed,k),seed,k)).collect();for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()'
  else:base=None
  if base:return 'let mapped:Vec<u32>='+base+'.collect();for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()'
 if expert and op.startswith('helper'):
  cal=e('choose(x<seed,x*k+bias,x-seed)');norm=e(NORM)
  if op=='helper_filter_map':return 'let mut n=0;for &x in xs{if '+e(PRED)+'{let x='+cal+';*out.add(n)='+norm+';n+=1;}}n'
  if op=='helper_indexed':return 'for(j,&x)in xs.iter().enumerate(){let x='+cal+';*out.add(j)=if j%2==0{'+norm+'}else{x};}xs.len()'
  return 'for(j,&x)in xs.iter().enumerate(){*out.add(j)='+cal+';}xs.len()'
 if op=='modular_mix':
  prefix=''.join(f'let c{j}=k.wrapping_add({2*j+1}u32);' for j in range(16)) if expert else ''
  stages='let mut v=x.wrapping_add(seed);'+''.join('v=rem(v.wrapping_mul('+(f'c{j}' if expert else f'k.wrapping_add({2*j+1}u32)')+').wrapping_add(x),4294967291u32,seed);' for j in range(16))
  if expert:
   stages='let mut v=x.wrapping_add(seed);'+''.join(f'v=v.wrapping_mul(c{j}).wrapping_add(x);if v>=4294967291u32{{v-=4294967291u32;}}' for j in range(16))
   return prefix+'for(j,&x)in xs.iter().enumerate(){'+stages+'*out.add(j)=v;}xs.len()'
  return 'let mapped:Vec<u32>=xs.iter().copied().map(|x|{'+stages+'v}).collect();for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()'
 raise ValueError(op)
def generate():
 (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n');(HERE/'kernels.ink').write_text(kernel_source())
 for mode in ['literal','expert']:
  expert=mode=='expert';common='const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0,quot=(a,b,z)=>b?Math.floor(a/b)>>>0:z,rem=(a,b,z)=>b?a%b:z;\n'
  if not expert:common+='function calibrate(x,seed,k){return '+expression(CAL,'js')+';}function normalize(x,seed,k){return '+expression(NORM,'js')+';}function stepWord(x,a,seed,k){return '+expression(STEP,'js')+';}function pairWord(a,b,seed,k){const left=calibrate(a,seed,k),right=normalize(b,seed,k);return left<right?add(left,mul(right,k)):sub(left,mul(right,k));}function acceptList(xs,seed,k){return Array.prototype.filter.call(xs,x=>'+expression(PRED,'js')+');}\n'
  functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{('const bias=mul(7,k);' if expert and t['operation'].startswith('helper') else '')+js_body(t,expert)}}}' for t in TASKS)
  if expert:js=common+'export function createExpert(capacity){const scratch=Object.fromEntries('+json.dumps([t['index'] for t in TASKS if t['output']=='list_u32'])+'.map(i=>[i,new Uint32Array(capacity)]));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args),get:name=>functions[name]};}\n'
  else:js=common+'const functions={'+functions+'};export const call=(name,args)=>functions[name](...args);\n'
  (HERE/f'{mode}.mjs').write_text(js)
  rust='// Source-stage/fused algorithms shared by native and Wasm.\nfn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}\nfn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}\n#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}\n'
  if not expert:rust+='fn calibrate(x:u32,seed:u32,k:u32)->u32{'+expression(CAL,'rust')+'}fn normalize(x:u32,seed:u32,k:u32)->u32{'+expression(NORM,'rust')+'}fn step_word(x:u32,a:u32,seed:u32,k:u32)->u32{'+expression(STEP,'rust')+'}fn pair_word(a:u32,b:u32,seed:u32,k:u32)->u32{let a=calibrate(a,seed,k);let b=normalize(b,seed,k);'+expression('choose(a<b,a+b*k,a-b*k)','rust')+'}fn accept_list(xs:&[u32],seed:u32,k:u32)->Vec<u32>{xs.iter().copied().filter(|&x|'+expression(PRED,'rust')+').collect()}\n'
  rust+='pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{\n'+'\n'.join(f'{t["index"]}=>{{{('let bias=7u32.wrapping_mul(k);' if expert and t['operation'].startswith('helper') else '')+rust_body(t,expert)}}},' for t in TASKS if rust_scalar(t))+'\n_=>panic!("non-scalar case")}}\n'
  rust+='#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{\n'
  for t in TASKS:
   if t['output']=='u64':body='let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;*out.add(1)=(value>>32) as u32;2'
   elif rust_scalar(t):body='*out=bench_scalar(case,xs,ys,seed,k) as u32;1'
   else:body=('let bias=7u32.wrapping_mul(k);' if expert and t['operation'].startswith('helper') else '')+rust_body(t,expert)
   rust+=f'{t["index"]}=>{{{body}}},\n'
  rust+='_=>panic!("unknown case")}}\n';(HERE/f'{mode}.rs').write_text(rust)
if __name__=='__main__':generate()
