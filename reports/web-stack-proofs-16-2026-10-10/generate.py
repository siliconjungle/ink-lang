"""Generate faithful staged and independently fused expert source controls.

Generation does not compile, publish, validate or time anything. Expert algorithms
are frozen before measurement. Native and Wasm Rust consume identical sources.
"""
import ast
import json
from pathlib import Path
from spec import MAPPERS, TASKS, public_spec, source, predicate

HERE=Path(__file__).resolve().parent

def extension_js(t,expert):
    f=expression(t['mapper_expression'],'js');p=t['predicate_expression']
    if t['extension']=='weight':
        if expert:
            gate=f'if(!({p}))continue;' if t['masked'] else ''
            weight='sub(k,seed)' if t['combine']=='subtract' else 'add(k,seed)'
            return f'let a=0;for(let i=0;i<xs.length;i++){{const x=xs[i];{gate}a=add(a,{f});}}return mul(a,{weight});'
        term=expression(t['contribution'],'js')
        return f'const values=Array.from(xs,x=>{term});let a=0;for(let i=0;i<values.length;i++)a=add(a,values[i]);return a;'
    reducer=expression(t['reducer_expression'],'js')
    if expert:
        prefix='const cutoff=quot(seed,2,0);' if t['cohort']=='discovery' else ''
        reducer=reducer.replace('quot(seed,2,0)','cutoff')
        sequence=''.join(f'x={f};' if stage=='map' else f'if(!({p}))continue;' for stage in stages(t))
        return prefix+f'let a=seed;for(let i=xs.length-1;i>=0;i--){{let x=xs[i];{sequence}a={reducer};}}return a;'
    sequence='let values=xs;'+''.join(f'values=Array.from(values,x=>{f});' if stage=='map' else f'values=filter(values,x=>{p});' for stage in stages(t))
    return sequence+f'let a=seed;for(let i=values.length-1;i>=0;i--){{const x=values[i];a={reducer};}}return a;'

def extension_rust(t,expert):
    f=expression(t['mapper_expression'],'rust');p=t['predicate_expression']
    if t['extension']=='weight':
        if expert:
            gate=f'if !({p}){{continue;}}' if t['masked'] else ''
            weight='k.wrapping_sub(seed)' if t['combine']=='subtract' else 'k.wrapping_add(seed)'
            return f'let mut a:u32=0;for &x in xs{{{gate}a=a.wrapping_add({f});}}*out=a.wrapping_mul({weight});1'
        term=expression(t['contribution'],'rust')
        return f'let values:Vec<u32>=xs.iter().map(|&x|{term}).collect();let mut a:u32=0;for &x in &values{{a=a.wrapping_add(x);}}*out=a;1'
    reducer=expression(t['reducer_expression'],'rust')
    if expert:
        prefix='let cutoff=quot(seed,2u32,0u32);' if t['cohort']=='discovery' else ''
        reducer=reducer.replace('quot(seed,2u32,0u32)','cutoff')
        sequence=''.join(f'let x={f};' if stage=='map' else f'if !({p}){{continue;}}' for stage in stages(t))
        return prefix+f'let mut a:u32=seed;for &x in xs.iter().rev(){{{sequence}a={reducer};}}*out=a;1'
    sequence='let values=xs;'
    for i,stage in enumerate(stages(t)):
        expr=f'values.iter().map(|&x|{f}).collect()' if stage=='map' else f'values.iter().copied().filter(|&x|{p}).collect()'
        sequence+=f'let stage{i}:Vec<u32>={expr};let values=&stage{i}[..];'
    return sequence+f'let mut a:u32=seed;for &x in values.iter().rev(){{a={reducer};}}*out=a;1'


def expression(text,language):
    def convert(n):
        if isinstance(n,ast.Name):return n.id
        if isinstance(n,ast.Constant):return str(n.value)+('u32' if language=='rust' else '')
        if isinstance(n,ast.Compare):
            op={ast.Lt:'<',ast.Gt:'>',ast.Eq:'=='}[type(n.ops[0])]
            return '('+convert(n.left)+op+convert(n.comparators[0])+')'
        if isinstance(n,ast.Call):
            if n.func.id=='quot_or':
                a,b,c=map(convert,n.args)
                return f'quot({a},{b},{c})' if language=='js' else f'quot({a},{b},{c})'
            assert n.func.id=='choose' and len(n.args)==3
            c,a,b=map(convert,n.args)
            return f'({c}?{a}:{b})' if language=='js' else f'(if {c}{{{a}}}else{{{b}}})'
        if isinstance(n,ast.BinOp):
            op={ast.Add:'add',ast.Sub:'sub',ast.Mult:'mul'}[type(n.op)]
            a,b=convert(n.left),convert(n.right)
            return f'{op}({a},{b})' if language=='js' else f'({a}).wrapping_{op}({b})'
        raise ValueError(ast.dump(n))
    return convert(ast.parse(text,mode='eval').body)


def stages(t):
    return {'map':['map'],'filter':['filter'],'map_filter':['map','filter'],'filter_map':['filter','map']}[t['pipeline']]

def js_body(t,expert):
    if not t["primary"]:return extension_js(t,expert)
    mapper=expression(MAPPERS[t['mapper']],'js')
    if t['operation']=='dual_sum':
        second=expression(MAPPERS[t['second_mapper']],'js')
        combine='add(mul(a,k),mul(b,seed))' if t['combine']=='weighted' else 'sub(a,b)' if t['combine']=='subtract' else 'add(a,b)'
        if expert:return f'let a=0,b=0;for(let i=0;i<xs.length;i++){{const x=xs[i];a=add(a,{mapper});b=add(b,{second});}}return {combine};'
        return f'const left=Array.from(xs,x=>{mapper});let a=0;for(let i=0;i<left.length;i++)a=add(a,left[i]);const right=Array.from(xs,x=>{second});let b=0;for(let i=0;i<right.length;i++)b=add(b,right[i]);return {combine};'
    pred=predicate(t);iteration='let i=xs.length-1;i>=0;i--' if t['operation']=='fold' else 'let i=0;i<xs.length;i++'
    step='add(x,mul(a,k))' if t['operation']=='fold' else 'add(a,x)'
    if expert:
        sequence=''.join(f'x={mapper};' if stage=='map' else f'if(!({pred}))continue;' for stage in stages(t))
        return f'let a={"seed" if t["operation"]=="fold" else "0"};for({iteration}){{let x=xs[i];{sequence}a={step};}}return a;'
    sequence='let values=xs;'+''.join(f'values=Array.from(values,x=>{mapper});' if stage=='map' else f'values=filter(values,x=>{pred});' for stage in stages(t))
    tail='let a=seed;for(let i=values.length-1;i>=0;i--)a=add(values[i],mul(a,k));return a;' if t['operation']=='fold' else 'let a=0;for(let i=0;i<values.length;i++)a=add(a,values[i]);return a;'
    return sequence+tail

def rust_body(t,expert):
    if not t["primary"]:return extension_rust(t,expert)
    mapper=expression(MAPPERS[t['mapper']],'rust')
    if t['operation']=='dual_sum':
        second=expression(MAPPERS[t['second_mapper']],'rust')
        combine='a.wrapping_mul(k).wrapping_add(b.wrapping_mul(seed))' if t['combine']=='weighted' else 'a.wrapping_sub(b)' if t['combine']=='subtract' else 'a.wrapping_add(b)'
        if expert:return f'let mut a:u32=0;let mut b:u32=0;for &x in xs{{a=a.wrapping_add({mapper});b=b.wrapping_add({second});}}*out={combine};1'
        return f'let left:Vec<u32>=xs.iter().map(|&x|{mapper}).collect();let mut a:u32=0;for &x in &left{{a=a.wrapping_add(x);}}drop(left);let right:Vec<u32>=xs.iter().map(|&x|{second}).collect();let mut b:u32=0;for &x in &right{{b=b.wrapping_add(x);}}*out={combine};1'
    pred=predicate(t);it='xs.iter().rev()' if t['operation']=='fold' else 'xs.iter()';step='x.wrapping_add(a.wrapping_mul(k))' if t['operation']=='fold' else 'a.wrapping_add(x)'
    if expert:
        sequence=''.join(f'let x={mapper};' if stage=='map' else f'if !({pred}){{continue;}}' for stage in stages(t))
        return f'let mut a:u32={"seed" if t["operation"]=="fold" else "0"};for &x in {it}{{{sequence}a={step};}}*out=a;1'
    sequence='let values=xs;'
    for i,stage in enumerate(stages(t)):
        expression_stage=f'values.iter().map(|&x|{mapper}).collect()' if stage=='map' else f'values.iter().copied().filter(|&x|{pred}).collect()'
        sequence+=f'let stage{i}:Vec<u32>={expression_stage};let values=&stage{i}[..];'
    iteration='values.iter().rev()' if t['operation']=='fold' else 'values.iter()'
    return sequence+f'let mut a:u32={"seed" if t["operation"]=="fold" else "0"};for &x in {iteration}{{a={step};}}*out=a;1'


def generate():
    spec=public_spec()
    for i,t in enumerate(TASKS):t['index']=i
    (HERE/'spec.json').write_text(json.dumps(spec,indent=2)+'\n')
    (HERE/'kernels.ink').write_text('module WebProof16;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
    for mode in ['literal','expert']:
        expert=mode=='expert'
        common='const quot=(a,b,c)=>b===0?c:Math.floor(a/b)>>>0;\nconst mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;\nconst filter=(xs,p)=>{const out=[];for(let i=0;i<xs.length;i++)if(p(xs[i]))out.push(xs[i]);return out;};\nconst zip=(xs,ys,f)=>Array.from({length:Math.min(xs.length,ys.length)},(_,i)=>f(xs[i],ys[i]));\n'
        functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{js_body(t,expert)}}}' for t in TASKS)
        if expert:
            js=common+'export function createExpert(capacity){const scratch='+str([None]*len(TASKS)).replace('None','null')+'.map(()=>new Uint32Array(capacity));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args)};}\n'
        else:js=common+'const functions={'+functions+'};export const call=(name,args)=>functions[name](...args);\n'
        (HERE/f'{mode}.mjs').write_text(js)
        rust='fn quot(a:u32,b:u32,c:u32)->u32{if b==0{c}else{a/b}}\n// Strong controls; native/Wasm use identical Rust source and fixed ABI.\n#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}\n#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{\n'
        rust+='\n'.join(f'{t["index"]}=>{{{rust_body(t,expert)}}},' for t in TASKS)+'\n_=>panic!("unknown case")}}\n'
        (HERE/f'{mode}.rs').write_text(rust)


if __name__=='__main__':generate()
