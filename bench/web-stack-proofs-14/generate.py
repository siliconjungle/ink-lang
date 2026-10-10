"""Generate faithful staged and independently fused expert source controls.

Generation does not compile, publish, validate or time anything. Expert algorithms
are frozen before measurement. Native and Wasm Rust consume identical sources.
"""
import ast
import json
from pathlib import Path
from spec import MAPPERS, TASKS, public_spec, source

HERE=Path(__file__).resolve().parent


def expression(text,language):
    def convert(n):
        if isinstance(n,ast.Name):return n.id
        if isinstance(n,ast.Constant):return str(n.value)+('u32' if language=='rust' else '')
        if isinstance(n,ast.Compare):
            op={ast.Lt:'<',ast.Gt:'>',ast.Eq:'=='}[type(n.ops[0])]
            return '('+convert(n.left)+op+convert(n.comparators[0])+')'
        if isinstance(n,ast.Call):
            assert n.func.id=='choose' and len(n.args)==3
            c,a,b=map(convert,n.args)
            return f'({c}?{a}:{b})' if language=='js' else f'(if {c}{{{a}}}else{{{b}}})'
        if isinstance(n,ast.BinOp):
            op={ast.Add:'add',ast.Sub:'sub',ast.Mult:'mul'}[type(n.op)]
            a,b=convert(n.left),convert(n.right)
            return f'{op}({a},{b})' if language=='js' else f'({a}).wrapping_{op}({b})'
        raise ValueError(ast.dump(n))
    return convert(ast.parse(text,mode='eval').body)


def js_body(t,expert):
    op=t['operation'];mapper=expression(MAPPERS[t.get('mapper','identity')],'js')
    pred='x<seed' if t.get('predicate')=='below' else 'x>seed'
    if op in ('sum','fold'):
        if expert:
            mapping=f'x={mapper};' if 'map' in t['pipeline'] else ''
            filtering=f'if(!({pred}))continue;' if 'filter' in t['pipeline'] else ''
            iteration='let i=xs.length-1;i>=0;i--' if op=='fold' else 'let i=0;i<xs.length;i++'
            step='add(x,mul(a,k))' if op=='fold' else 'add(a,x)'
            return f'let a={"seed" if op=="fold" else "0"};for({iteration}){{let x=xs[i];{mapping}{filtering}a={step};}}return a;'
        stage='let values=xs;'
        if 'map' in t['pipeline']:stage+=f'values=Array.from(values,x=>{mapper});'
        if 'filter' in t['pipeline']:stage+=f'values=filter(values,x=>{pred});'
        if op=='fold':return stage+'let a=seed;for(let i=values.length-1;i>=0;i--)a=add(values[i],mul(a,k));return a;'
        return stage+'let a=0;for(let i=0;i<values.length;i++)a=add(a,values[i]);return a;'
    if op=='head':
        after='mul(value,k)' if t['offset']=='*k' else 'sub(value,seed)'
        if expert:return f'const x=xs[0];const value=xs.length?{mapper}:{t["fallback"]};return {after};'
        return f'const values=Array.from(xs,x=>{mapper});const value=values.length?values[0]:{t["fallback"]};return {after};'
    if op=='concat_head':
        fall=t['fallback'];offset='add(value,k)' if t['offset']=='+k' else 'sub(value,seed)'
        first='xs.length?xs[0]:ys.length?ys[0]:'+fall if expert else f'values.length?values[0]:{fall}'
        stages='' if expert else 'const values=new Array(xs.length+ys.length);for(let i=0;i<xs.length;i++)values[i]=xs[i];for(let i=0;i<ys.length;i++)values[xs.length+i]=ys[i];'
        return stages+f'const value={first};return {offset};'
    if op=='zip_count':
        if expert:return 'return BigInt(xs.length);'
        body='choose(a<seed,a*k+b,b-seed)' if t['combiner']=='piecewise' else 'choose(a==b,a*k-seed,b+seed)'
        return f'const values=zip(xs,xs,(a,b)=>{expression(body,"js")});return BigInt(values.length);'
    if expert:return f'const out=scratch[{t["index"]}];for(let i=0;i<xs.length;i++){{const x=xs[i];out[i]={mapper};}}return out.subarray(0,xs.length);'
    if t['pipeline']=='two_maps':return 'return Array.from(xs,x=>x<seed?seed:x).map(x=>mul(x,k));'
    return f'return Array.from(xs,x=>{mapper});'


def rust_body(t,expert):
    op=t['operation'];mapper=expression(MAPPERS[t.get('mapper','identity')],'rust')
    pred='x<seed' if t.get('predicate')=='below' else 'x>seed'
    if op in ('sum','fold'):
        if expert:
            it='xs.iter().rev()' if op=='fold' else 'xs.iter()'
            mapping=f'let x={mapper};' if 'map' in t['pipeline'] else ''
            filtering=f'if !({pred}){{continue;}}' if 'filter' in t['pipeline'] else ''
            step='x.wrapping_add(a.wrapping_mul(k))' if op=='fold' else 'a.wrapping_add(x)'
            return f'let mut a:u32={"seed" if op=="fold" else "0"};for &x in {it}{{{mapping}{filtering}a={step};}}*out=a;1'
        code='let values=xs;'
        if 'map' in t['pipeline']:code+=f'let mapped:Vec<u32>=values.iter().map(|&x|{mapper}).collect();let values=&mapped[..];'
        if 'filter' in t['pipeline']:code+=f'let filtered:Vec<u32>=values.iter().copied().filter(|&x|{pred}).collect();let values=&filtered[..];'
        it='values.iter().rev()' if op=='fold' else 'values.iter()'
        step='x.wrapping_add(a.wrapping_mul(k))' if op=='fold' else 'a.wrapping_add(x)'
        return code+f'let mut a:u32={"seed" if op=="fold" else "0"};for &x in {it}{{a={step};}}*out=a;1'
    if op=='head':
        after='wrapping_mul(k)' if t['offset']=='*k' else 'wrapping_sub(seed)'
        if expert:return f'let value=xs.first().map(|&x|{mapper}).unwrap_or({t["fallback"]});*out=value.{after};1'
        return f'let values:Vec<u32>=xs.iter().map(|&x|{mapper}).collect();let value=values.first().copied().unwrap_or({t["fallback"]});*out=value.{after};1'
    if op=='concat_head':
        stages='' if expert else 'let mut values=Vec::with_capacity(xs.len()+ys.len());values.extend_from_slice(xs);values.extend_from_slice(ys);'
        first='xs.first().or_else(||ys.first())' if expert else 'values.first()'
        operation='wrapping_add(k)' if t['offset']=='+k' else 'wrapping_sub(seed)'
        return stages+f'let value={first}.copied().unwrap_or({t["fallback"]});*out=value.{operation};1'
    if op=='zip_count':
        prefix=''
        count='xs.len()'
        if not expert:
            expr='choose(a<seed,a*k+b,b-seed)' if t['combiner']=='piecewise' else 'choose(a==b,a*k-seed,b+seed)'
            prefix=f'let values:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|{expression(expr,"rust")}).collect();'
            count='values.len()'
        return prefix+f'let value={count} as u64;*out=value as u32;*out.add(1)=(value>>32)as u32;2'
    if expert:return f'for(i,&x)in xs.iter().enumerate(){{*out.add(i)={mapper};}}xs.len()'
    if t['pipeline']=='two_maps':return 'let values:Vec<u32>=xs.iter().map(|&x|if x<seed{seed}else{x}).collect();for(i,&x)in values.iter().enumerate(){*out.add(i)=x.wrapping_mul(k);}xs.len()'
    return f'for(i,&x)in xs.iter().enumerate(){{*out.add(i)={mapper};}}xs.len()'


def generate():
    spec=public_spec()
    for i,t in enumerate(TASKS):t['index']=i
    (HERE/'spec.json').write_text(json.dumps(spec,indent=2)+'\n')
    (HERE/'kernels.ink').write_text('module WebProof14;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
    for mode in ['literal','expert']:
        expert=mode=='expert'
        common='const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;\nconst filter=(xs,p)=>{const out=[];for(let i=0;i<xs.length;i++)if(p(xs[i]))out.push(xs[i]);return out;};\nconst zip=(xs,ys,f)=>Array.from({length:Math.min(xs.length,ys.length)},(_,i)=>f(xs[i],ys[i]));\n'
        functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{js_body(t,expert)}}}' for t in TASKS)
        if expert:
            js=common+'export function createExpert(capacity){const scratch='+str([None]*len(TASKS)).replace('None','null')+'.map(()=>new Uint32Array(capacity));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args)};}\n'
        else:js=common+'const functions={'+functions+'};export const call=(name,args)=>functions[name](...args);\n'
        (HERE/f'{mode}.mjs').write_text(js)
        rust='// Strong controls; native/Wasm use identical Rust source and fixed ABI.\n#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}\n#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{\n'
        rust+='\n'.join(f'{t["index"]}=>{{{rust_body(t,expert)}}},' for t in TASKS)+'\n_=>panic!("unknown case")}}\n'
        (HERE/f'{mode}.rs').write_text(rust)


if __name__=='__main__':generate()
