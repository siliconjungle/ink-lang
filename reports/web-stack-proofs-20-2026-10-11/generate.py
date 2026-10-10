"""Faithful original stages and strong already-unswitched/fused handwritten controls."""
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
            if n.func.id=='quot_or':return 'quot('+','.join(map(go,n.args))+')'
            assert n.func.id=='choose';c,a,b=map(go,n.args)
            return f'({c}?{a}:{b})' if language=='js' else f'(if {c}{{{a}}}else{{{b}}})'
        if isinstance(n,ast.BinOp):
            op={ast.Add:'add',ast.Sub:'sub',ast.Mult:'mul'}[type(n.op)];a,b=go(n.left),go(n.right)
            return f'{op}({a},{b})' if language=='js' else f'({a}).wrapping_{op}({b})'
        raise ValueError(ast.dump(n))
    return go(ast.parse(text,mode='eval').body)
def js_body(t,expert):
    op=t['operation'];e=lambda s:expression(s,'js');gate=e(t['gate']) if t['gated'] else None
    if op=='gate_sum':
        f=e(t['mapper'])
        return f'if(!{gate})return 0;let a=0;for(let i=0;i<xs.length;i++){{const x=xs[i];a=add(a,{f});}}return a;' if expert else f'const mapped=Array.from(xs,x=>{gate}?{f}:0);let a=0;for(const x of mapped)a=add(a,x);return a;'
    if op=='gate_count':
        p=e(t['predicate'])
        return f'if(!{gate})return 0n;let n=0;for(let i=0;i<xs.length;i++){{const x=xs[i];if({p})n++;}}return BigInt(n);' if expert else f'const filtered=Array.from(xs).filter(x=>{gate}?{p}:false);return BigInt(filtered.length);'
    if op=='gate_fold':
        r=e(t['reducer']);prefix=f'if(!{gate})return seed;' if expert else ''
        return prefix+f'let a=seed;for(let i=xs.length;i-->0;){{const x=xs[i];a='+ (r if expert else f'({gate}?{r}:a)')+';}return a;'
    h=e(t['combine'])
    if op=='zip_fold':
        r=e(t['reducer'])
        if expert:return f'let acc=seed;for(let i=xs.length;i-->0;){{const a=xs[i],b=a,v={h};acc={r};}}return acc;'
        return f'const zipped=new Array(xs.length);for(let i=0;i<xs.length;i++){{const a=xs[i],b=a;zipped[i]={h};}}let acc=seed;for(let i=zipped.length;i-->0;){{const v=zipped[i];acc={r};}}return acc;'
    g=e(t['postmap'])
    if expert:return f'const n=Math.min(xs.length,ys.length),out=scratch[{t["index"]}];for(let i=0;i<n;i++){{const a=xs[i],b=ys[i],v={h};out[i]={g};}}return out.subarray(0,n);'
    return f'const n=Math.min(xs.length,ys.length),zipped=new Array(n);for(let i=0;i<n;i++){{const a=xs[i],b=ys[i];zipped[i]={h};}}return zipped.map(v=>{g});'
def rust_body(t,expert):
    op=t['operation'];e=lambda s:expression(s,'rust');gate=e(t['gate']) if t['gated'] else None
    if op=='gate_sum':
        f=e(t['mapper'])
        body=f'let mut a=0u32;for &x in xs{{a=a.wrapping_add({f});}}' if expert else f'let mapped:Vec<u32>=xs.iter().map(|&x|if {gate}{{{f}}}else{{0}}).collect();let mut a=0u32;for x in mapped{{a=a.wrapping_add(x);}}'
        return (f'if !{gate}{{*out=0;return 1;}}' if expert else '')+body+'*out=a;1'
    if op=='gate_count':
        p=e(t['predicate']);body=f'let mut n=0u64;for &x in xs{{if {p}{{n+=1;}}}}' if expert else f'let filtered:Vec<u32>=xs.iter().copied().filter(|&x|if {gate}{{{p}}}else{{false}}).collect();let n=filtered.len() as u64;'
        return (f'if !{gate}{{*out=0;*out.add(1)=0;return 2;}}' if expert else '')+body+'*out=n as u32;*out.add(1)=(n>>32) as u32;2'
    if op=='gate_fold':
        r=e(t['reducer']);prefix=f'if !{gate}{{*out=seed;return 1;}}' if expert else ''
        return prefix+'let mut a=seed;for &x in xs.iter().rev(){a='+(r if expert else f'if {gate}{{{r}}}else{{a}}')+';}*out=a;1'
    h=e(t['combine'])
    if op=='zip_fold':
        r=e(t['reducer'])
        if expert:return f'let mut acc=seed;for &a in xs.iter().rev(){{let b=a;let v={h};acc={r};}}*out=acc;1'
        return f'let zipped:Vec<u32>=xs.iter().map(|&a|{{let b=a;{h}}}).collect();let mut acc=seed;for &v in zipped.iter().rev(){{acc={r};}}*out=acc;1'
    g=e(t['postmap'])
    if expert:return f'for(i,(&a,&b))in xs.iter().zip(ys.iter()).enumerate(){{let v={h};*out.add(i)={g};}}xs.len().min(ys.len())'
    return f'let zipped:Vec<u32>=xs.iter().zip(ys.iter()).map(|(&a,&b)|{h}).collect();let mapped:Vec<u32>=zipped.iter().map(|&v|{g}).collect();for(i,&v)in mapped.iter().enumerate(){{*out.add(i)=v;}}mapped.len()'
def generate():
    (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n');(HERE/'kernels.ink').write_text('module WebProof20;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
    for mode in ['literal','expert']:
        expert=mode=='expert';common='const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0,quot=(a,b,z)=>b?Math.floor(a/b)>>>0:z;\n'
        functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{js_body(t,expert)}}}' for t in TASKS)
        if expert:js=common+'export function createExpert(capacity){const scratch=Object.fromEntries('+json.dumps([t['index'] for t in TASKS if t['output']=='list_u32'])+'.map(i=>[i,new Uint32Array(capacity)]));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args)};}\n'
        else:js=common+'const functions={'+functions+'};export const call=(name,args)=>functions[name](...args);\n'
        (HERE/f'{mode}.mjs').write_text(js)
        rust='// Same Rust source for native and Wasm, exact ordered wrapping operations.\nfn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}\n#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}\n#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{\n'
        scalar_rows=[]
        for t in TASKS:
            if t['output']=='list_u32':continue
            body=rust_body(t,expert).replace('*out=0;*out.add(1)=0;return 2;','return 0;').replace('*out=0;return 1;','return 0;').replace('*out=seed;return 1;','return seed as u64;')
            body=body.replace('*out=n as u32;*out.add(1)=(n>>32) as u32;2','n').replace('*out=a;1','a as u64').replace('*out=acc;1','acc as u64')
            scalar_rows.append(f'{t["index"]}=>{{{body}}},')
        rust+='\n'.join(f'{t["index"]}=>{{{rust_body(t,expert)}}},' if t['output']=='list_u32' else f'{t["index"]}=>{{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;'+('*out.add(1)=(value>>32) as u32;2' if t['output']=='u64' else '1')+'},' for t in TASKS)+'\n_=>panic!("unknown case")}}\n'
        rust+='pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{\n'+'\n'.join(scalar_rows)+'\n_=>panic!("non-scalar case")}}\n'
        (HERE/f'{mode}.rs').write_text(rust)
if __name__=='__main__':generate()
